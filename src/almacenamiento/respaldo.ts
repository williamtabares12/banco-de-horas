import type { Config, MovimientoBanco, Turno } from "../dominio/tipos";
import { duracionMinutos } from "../dominio/tiempo";
import type { Datos, Repositorio } from "./repositorio";

export class ErrorImportacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorImportacion";
  }
}

export function exportarJSON(datos: Datos): string {
  return JSON.stringify(datos, null, 2);
}

/** Valida el texto y devuelve los datos, o lanza ErrorImportacion. No guarda nada. */
export function importarJSON(texto: string): Datos {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new ErrorImportacion("El archivo no es un JSON válido");
  }
  const raiz = objeto(crudo, "El archivo");
  if (raiz.version !== 1) throw new ErrorImportacion("Versión del archivo desconocida");

  const turnos = lista(raiz.turnos, "turnos").map((t, i) => leerTurno(t, i));
  const movimientos = lista(raiz.movimientos, "movimientos").map((m, i) => leerMovimiento(m, i));
  sinRepetidos(turnos.map((t) => t.id), "turnos");
  sinRepetidos(movimientos.map((m) => m.id), "movimientos");

  return { version: 1, config: leerConfig(raiz.config), turnos, movimientos };
}

/** Importa y reemplaza los datos actuales. Si el archivo es inválido, no toca nada. */
export function importar(repo: Repositorio, texto: string): void {
  repo.guardar(importarJSON(texto));
}

// --- Validación (se construyen objetos nuevos: lo desconocido se descarta) ---

type Obj = Record<string, unknown>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

function objeto(v: unknown, donde: string): Obj {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new ErrorImportacion(`${donde} debe ser un objeto`);
  }
  return v as Obj;
}

function lista(v: unknown, nombre: string): unknown[] {
  if (!Array.isArray(v)) throw new ErrorImportacion(`Falta la lista de ${nombre}`);
  return v;
}

function texto(o: Obj, campo: string, donde: string, patron?: RegExp): string {
  const v = o[campo];
  if (typeof v !== "string" || (patron && !patron.test(v))) {
    throw new ErrorImportacion(`${donde}: "${campo}" falta o tiene un formato inválido`);
  }
  return v;
}

function textoOpcional(o: Obj, campo: string, donde: string): string | undefined {
  return o[campo] === undefined ? undefined : texto(o, campo, donde);
}

function entero(o: Obj, campo: string, donde: string): number {
  const v = o[campo];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new ErrorImportacion(`${donde}: "${campo}" debe ser un número entero`);
  }
  return v;
}

function booleano(o: Obj, campo: string, donde: string): boolean {
  const v = o[campo];
  if (typeof v !== "boolean") throw new ErrorImportacion(`${donde}: "${campo}" debe ser verdadero o falso`);
  return v;
}

function uno<const T extends string>(o: Obj, campo: string, validos: readonly T[], donde: string): T {
  const v = o[campo];
  if (!validos.includes(v as T)) {
    throw new ErrorImportacion(`${donde}: "${campo}" debe ser uno de ${validos.join(", ")}`);
  }
  return v as T;
}

function sinRepetidos(ids: string[], nombre: string) {
  if (new Set(ids).size !== ids.length) throw new ErrorImportacion(`Hay ids repetidos en ${nombre}`);
}

function leerTurno(v: unknown, i: number): Turno {
  const donde = `Turno ${i + 1}`;
  const o = objeto(v, donde);
  const inicio = texto(o, "inicio", donde, FECHA_HORA);
  const fin = texto(o, "fin", donde, FECHA_HORA);
  if (duracionMinutos(inicio, fin) <= 0) throw new ErrorImportacion(`${donde}: el fin debe ser posterior al inicio`);
  const minutosProgramados = entero(o, "minutosProgramados", donde);
  if (minutosProgramados < 0) throw new ErrorImportacion(`${donde}: "minutosProgramados" no puede ser negativo`);
  const tipo = uno(o, "tipo", ["ordinario", "alquiler"], donde);

  const turno: Turno = {
    id: texto(o, "id", donde),
    inicio,
    fin,
    minutosProgramados,
    tipo,
    creadoEn: texto(o, "creadoEn", donde),
    modificadoEn: texto(o, "modificadoEn", donde),
  };
  if (tipo === "alquiler") turno.destino = uno(o, "destino", ["deuda", "semana"], donde);
  const nota = textoOpcional(o, "nota", donde);
  if (nota !== undefined) turno.nota = nota;
  return turno;
}

function leerMovimiento(v: unknown, i: number): MovimientoBanco {
  const donde = `Movimiento ${i + 1}`;
  const o = objeto(v, donde);
  const mov: MovimientoBanco = {
    id: texto(o, "id", donde),
    fecha: texto(o, "fecha", donde, FECHA),
    tipo: uno(o, "tipo", ["saldo_inicial", "prestamo", "pago", "ajuste"], donde),
    minutos: entero(o, "minutos", donde),
    automatico: booleano(o, "automatico", donde),
    creadoEn: texto(o, "creadoEn", donde),
    modificadoEn: texto(o, "modificadoEn", donde),
  };
  const turnoId = textoOpcional(o, "turnoId", donde);
  if (turnoId !== undefined) mov.turnoId = turnoId;
  const nota = textoOpcional(o, "nota", donde);
  if (nota !== undefined) mov.nota = nota;
  return mov;
}

function leerConfig(v: unknown): Config {
  const donde = "Configuración";
  const o = objeto(v, donde);
  const fechas = (campo: string) =>
    lista(o[campo], campo).map((f) => {
      if (typeof f !== "string" || !FECHA.test(f)) {
        throw new ErrorImportacion(`${donde}: "${campo}" debe ser una lista de fechas AAAA-MM-DD`);
      }
      return f;
    });
  const minutosSemana = entero(o, "minutosSemana", donde);
  if (minutosSemana <= 0) throw new ErrorImportacion(`${donde}: "minutosSemana" debe ser mayor que 0`);
  const desfase = entero(o, "desfaseQuincenas", donde);
  if (desfase !== 0 && desfase !== 1) throw new ErrorImportacion(`${donde}: "desfaseQuincenas" debe ser 0 o 1`);

  return {
    minutosSemana,
    nocturnoDesde: texto(o, "nocturnoDesde", donde, HORA),
    nocturnoHasta: texto(o, "nocturnoHasta", donde, HORA),
    desfaseQuincenas: desfase,
    extrasDescuentanDeuda: booleano(o, "extrasDescuentanDeuda", donde),
    festivosAgregados: fechas("festivosAgregados"),
    festivosQuitados: fechas("festivosQuitados"),
  };
}
