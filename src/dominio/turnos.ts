import { duracionMinutos, sumarDias } from "./tiempo";
import type { MovimientoBanco, Turno } from "./tipos";

export type EntradaTurno = {
  inicio: string; // "2026-09-12T19:00"
  fin: string;
  minutosProgramados: number;
  tipo: Turno["tipo"];
  destino?: Turno["destino"];
  nota?: string;
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Arma inicio y fin a partir de lo que se escribe en el formulario: una fecha y
 * dos horas. Si la hora de fin no es posterior a la de inicio, el turno termina
 * al día siguiente (así se cruza la medianoche; la misma hora son 24 h).
 */
export function fechasDeTurno(fecha: string, horaInicio: string, horaFin: string): { inicio: string; fin: string } {
  if (!FECHA.test(fecha) || !HORA.test(horaInicio) || !HORA.test(horaFin)) {
    throw new Error("Fecha u hora con formato inválido");
  }
  const finFecha = horaFin > horaInicio ? fecha : sumarDias(fecha, 1);
  return { inicio: `${fecha}T${horaInicio}`, fin: `${finFecha}T${horaFin}` };
}

/** Valida y deja la entrada lista para guardar (sin id ni fechas de registro). */
function normalizar(entrada: EntradaTurno): EntradaTurno {
  if (!FECHA_HORA.test(entrada.inicio) || !FECHA_HORA.test(entrada.fin)) {
    throw new Error("El inicio y el fin deben ser AAAA-MM-DDTHH:mm");
  }
  if (duracionMinutos(entrada.inicio, entrada.fin) <= 0) throw new Error("El fin debe ser posterior al inicio");

  const base = { inicio: entrada.inicio, fin: entrada.fin, tipo: entrada.tipo };
  let resultado: EntradaTurno;
  if (entrada.tipo === "alquiler") {
    if (entrada.destino !== "deuda" && entrada.destino !== "semana") {
      throw new Error("Un turno de alquiler necesita destino: pagar deuda o completar semana");
    }
    resultado = { ...base, minutosProgramados: 0, destino: entrada.destino };
  } else {
    if (!Number.isInteger(entrada.minutosProgramados) || entrada.minutosProgramados < 0) {
      throw new Error("Las horas programadas deben ser un número entero de minutos, 0 o más");
    }
    resultado = { ...base, minutosProgramados: entrada.minutosProgramados };
  }
  const nota = entrada.nota?.trim();
  if (nota) resultado.nota = nota;
  return resultado;
}

export function nuevoTurno(entrada: EntradaTurno, ahora: string, id: string): Turno {
  return { id, ...normalizar(entrada), creadoEn: ahora, modificadoEn: ahora };
}

/** Cambia un turno conservando su id y cuándo se creó. */
export function editarTurno(turno: Turno, entrada: EntradaTurno, ahora: string): Turno {
  return { id: turno.id, ...normalizar(entrada), creadoEn: turno.creadoEn, modificadoEn: ahora };
}

/**
 * Quita un turno y su movimiento automático. Un movimiento que Alejandro editó
 * a mano se conserva, ya sin vínculo con el turno.
 */
export function borrarTurno(
  turnos: Turno[],
  movimientos: MovimientoBanco[],
  turnoId: string,
  ahora: string,
): { turnos: Turno[]; movimientos: MovimientoBanco[] } {
  return {
    turnos: turnos.filter((t) => t.id !== turnoId),
    movimientos: movimientos.flatMap((m): MovimientoBanco[] => {
      if (m.turnoId !== turnoId) return [m];
      if (m.automatico) return [];
      const { turnoId: _quitado, ...sinVinculo } = m;
      return [{ ...sinVinculo, modificadoEn: ahora }];
    }),
  };
}
