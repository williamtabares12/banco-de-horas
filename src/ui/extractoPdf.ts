import type { Datos } from "../almacenamiento/repositorio";
import { cantidadProgramados, saldoActual, saldoCorto, saldoProyectado } from "../dominio/banco";
import { filasExtracto, type FilaTexto } from "./extractoFilas";
import { ajustarTexto, Pdf } from "./pdf";

const MARGEN = 48;
const COL_FECHA = MARGEN;
const COL_MOV = MARGEN + 72;
const ANCHO_MOV = 258; // hasta la columna de horas
const COL_HORAS_DER = 470;
const COL_SALDO_DER = 612 - MARGEN;

const TAM_DETALLE = 8.5;
const INTERLINEA = 12;
const INTERLINEA_DETALLE = 10.5;
const RELLENO_FILA = 8;
const LIMITE_INFERIOR = MARGEN + 24; // deja sitio al número de página
const ALTO_RESUMEN = 28; // línea y "Saldo actual"
const ALTO_LINEA_PROYECTADO = 16; // la línea extra "Saldo proyectado", solo si hay movimientos programados

/** Líneas de detalle ya partidas para que quepan en la columna. */
const lineasDetalle = (fila: FilaTexto) => fila.detalle.flatMap((d) => ajustarTexto(d, ANCHO_MOV, TAM_DETALLE));

const altoFila = (fila: FilaTexto) => INTERLINEA + lineasDetalle(fila).length * INTERLINEA_DETALLE + RELLENO_FILA;

/**
 * Extracto de horas en PDF tamaño carta: el saldo inicial, cada movimiento con su fecha y nota, y el
 * saldo después de cada uno. Dice lo mismo que la pantalla (usa las mismas filas).
 */
export function construirExtractoPdf(datos: Datos, hoy: string): Uint8Array<ArrayBuffer> {
  const pdf = new Pdf();
  const filas = filasExtracto(datos, hoy);
  const hayProgramados = cantidadProgramados(datos.movimientos, hoy) > 0;
  let y = 0;

  function iniciarPagina(primera: boolean) {
    y = pdf.alto - MARGEN;
    if (primera) {
      pdf.texto(COL_FECHA, y - 14, "Extracto de horas", { tam: 16, negrita: true });
      pdf.texto(COL_FECHA, y - 32, `Generado el ${hoy}. Horas que se deben a la clínica, con el saldo después de cada movimiento.`, {
        tam: 9,
        gris: true,
      });
      y -= 50;
    }
    pdf.texto(COL_FECHA, y - 10, "Fecha", { tam: 9, negrita: true });
    pdf.texto(COL_MOV, y - 10, "Movimiento", { tam: 9, negrita: true });
    pdf.texto(COL_HORAS_DER, y - 10, "Horas", { tam: 9, negrita: true, alinear: "der" });
    pdf.texto(COL_SALDO_DER, y - 10, "Saldo", { tam: 9, negrita: true, alinear: "der" });
    pdf.linea(MARGEN, COL_SALDO_DER, y - 16);
    y -= 20;
  }

  iniciarPagina(true);

  if (filas.length === 0) {
    pdf.texto(COL_FECHA, y - INTERLINEA, "Todavía no hay movimientos para mostrar.", { gris: true });
  }

  filas.forEach((fila, i) => {
    const alto = altoFila(fila);
    // la última fila viaja junto con el saldo actual: el resumen nunca queda solo en una página
    const necesario = alto + (i === filas.length - 1 ? ALTO_RESUMEN + (hayProgramados ? ALTO_LINEA_PROYECTADO : 0) : 0);
    if (y - necesario < LIMITE_INFERIOR) {
      pdf.nuevaPagina();
      iniciarPagina(false);
    }
    const base = y - INTERLINEA;
    pdf.texto(COL_FECHA, base, fila.fecha);
    pdf.texto(COL_MOV, base, fila.tipo, { negrita: true });
    pdf.texto(COL_HORAS_DER, base, fila.horas, { alinear: "der" });
    pdf.texto(COL_SALDO_DER, base, fila.saldo, { alinear: "der" });
    lineasDetalle(fila).forEach((linea, k) => {
      pdf.texto(COL_MOV, base - (k + 1) * INTERLINEA_DETALLE, linea, { tam: TAM_DETALLE, gris: true });
    });
    pdf.linea(MARGEN, COL_SALDO_DER, y - alto + RELLENO_FILA / 2);
    y -= alto;
  });

  if (filas.length > 0) {
    pdf.texto(COL_FECHA, y - 16, "Saldo actual", { tam: 11, negrita: true });
    pdf.texto(COL_SALDO_DER, y - 16, saldoCorto(saldoActual(datos.movimientos, hoy)), { tam: 11, negrita: true, alinear: "der" });
    if (hayProgramados) {
      pdf.texto(COL_FECHA, y - 16 - ALTO_LINEA_PROYECTADO, "Saldo proyectado", { tam: 11, negrita: true });
      pdf.texto(COL_SALDO_DER, y - 16 - ALTO_LINEA_PROYECTADO, saldoCorto(saldoProyectado(datos.movimientos)), {
        tam: 11,
        negrita: true,
        alinear: "der",
      });
    }
  }

  const total = pdf.numPaginas;
  for (let i = 0; i < total; i++) {
    pdf.irAPagina(i);
    pdf.texto(pdf.ancho / 2, MARGEN - 20, `Página ${i + 1} de ${total}`, { tam: 8, gris: true, alinear: "centro" });
  }
  return pdf.bytes();
}

