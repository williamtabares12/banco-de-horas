import { duracionMinutos, sumarDias } from "./tiempo";
import type { MovimientoBanco, Turno } from "./tipos";

export type EntradaTurno = {
  inicio: string; // "2026-09-12T19:00"
  fin: string;
  descansoMin?: number; // minutos de alimentación y descanso; 0 si no se indica
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

/** Minutos netos de un turno: los de reloj menos el descanso. Es lo que usan el banco y la semana. */
export function minutosNetos(turno: Pick<Turno, "inicio" | "fin" | "descansoMin">): number {
  return duracionMinutos(turno.inicio, turno.fin) - turno.descansoMin;
}

/** Con más horas netas que estas, un turno ordinario sin descanso se marca para revisarlo (RF16). */
export const HORAS_NETAS_SIN_DESCANSO = 6;

/**
 * ¿Hay que revisar el descanso de este turno? Los ordinarios guardados con descanso 0 y más de 6 horas netas
 * probablemente no son 0: es el descanso que antes se quedaba en blanco. El alquiler no lleva descanso.
 */
export function necesitaRevisarDescanso(turno: Pick<Turno, "inicio" | "fin" | "descansoMin" | "tipo">): boolean {
  return turno.tipo === "ordinario" && turno.descansoMin === 0 && minutosNetos(turno) > HORAS_NETAS_SIN_DESCANSO * 60;
}

type TurnoNormalizado = Omit<Turno, "id" | "creadoEn" | "modificadoEn">;

/** Valida y deja la entrada lista para guardar (sin id ni fechas de registro). */
function normalizar(entrada: EntradaTurno): TurnoNormalizado {
  if (!FECHA_HORA.test(entrada.inicio) || !FECHA_HORA.test(entrada.fin)) {
    throw new Error("El inicio y el fin deben ser AAAA-MM-DDTHH:mm");
  }
  const duracion = duracionMinutos(entrada.inicio, entrada.fin);
  if (duracion <= 0) throw new Error("El fin debe ser posterior al inicio");

  const base = { inicio: entrada.inicio, fin: entrada.fin, tipo: entrada.tipo };
  let resultado: TurnoNormalizado;
  if (entrada.tipo === "alquiler") {
    if (entrada.destino !== "deuda" && entrada.destino !== "semana") {
      throw new Error("Un turno de alquiler necesita destino: pagar deuda o completar semana");
    }
    // el quirófano de alquiler no tiene descuentos
    resultado = { ...base, descansoMin: 0, minutosProgramados: 0, destino: entrada.destino };
  } else {
    const descansoMin = entrada.descansoMin ?? 0;
    if (!Number.isInteger(descansoMin) || descansoMin < 0) {
      throw new Error("El descanso debe ser un número entero de minutos, 0 o más");
    }
    if (descansoMin > duracion) throw new Error("El descanso no puede ser mayor que el turno");
    if (!Number.isInteger(entrada.minutosProgramados) || entrada.minutosProgramados < 0) {
      throw new Error("Las horas programadas deben ser un número entero de minutos, 0 o más");
    }
    resultado = { ...base, descansoMin, minutosProgramados: entrada.minutosProgramados };
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
