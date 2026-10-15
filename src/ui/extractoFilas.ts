import type { Datos } from "../almacenamiento/repositorio";
import { extracto } from "../dominio/banco";
import { formatearDuracion } from "../dominio/tiempo";
import type { MovimientoBanco, Turno } from "../dominio/tipos";
import { etiquetaMovimiento } from "./utilidades";

/** Una fila del extracto ya convertida a texto: la usan la pantalla y el PDF, para que digan lo mismo. */
export type FilaTexto = {
  id: string;
  fecha: string;
  tipo: string;
  detalle: string[];
  horas: string;
  saldo: string;
};

export const conSigno = (minutos: number) => (minutos > 0 ? "+" : "") + formatearDuracion(minutos);

/** Texto de apoyo de un movimiento: el turno que lo originó, si todavía existe, y la nota. */
function detalle(m: MovimientoBanco, turnos: Turno[]): string[] {
  const lineas: string[] = [];
  const turno = m.turnoId ? turnos.find((t) => t.id === m.turnoId) : undefined;
  if (turno) {
    const tipo = turno.tipo === "alquiler" ? "quirófano de alquiler" : "turno";
    lineas.push(`${tipo} del ${turno.inicio.slice(0, 10)}, ${turno.inicio.slice(11)} a ${turno.fin.slice(11)}`);
  }
  if (m.nota) lineas.push(m.nota);
  return lineas;
}

/** Filas del extracto en orden cronológico, con el saldo acumulado después de cada movimiento. */
export function filasExtracto(datos: Datos): FilaTexto[] {
  return extracto(datos.movimientos).map(({ movimiento: m, saldoDespues }) => ({
    id: m.id,
    fecha: m.fecha,
    tipo: etiquetaMovimiento(m),
    detalle: detalle(m, datos.turnos),
    horas: conSigno(m.minutos),
    saldo: formatearDuracion(saldoDespues),
  }));
}
