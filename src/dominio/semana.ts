import { REGLAS_POR_DEFECTO, reglasVigentes, type ReglasGlobales } from "./reglas";
import { inicioSemana } from "./tiempo";
import { minutosNetos } from "./turnos";
import type { Turno } from "./tipos";

/** Minutos que un turno aporta a las 42 h de la semana. */
function aporteSemana(turno: Turno): number {
  if (turno.tipo === "ordinario") return turno.minutosProgramados;
  if (turno.destino === "semana") return minutosNetos(turno);
  if (turno.destino === "deuda") return 0;
  throw new Error("Un turno de alquiler necesita destino");
}

/**
 * Minutos de la semana (de domingo a sábado, o de lunes a domingo si `primerDia` es 1) que contiene `fecha`.
 * Un turno cuenta en la semana de su fecha de inicio, aunque termine en la siguiente.
 */
export function minutosDeSemana(turnos: Turno[], fecha: string, primerDia: 0 | 1 = 0): number {
  const inicio = inicioSemana(fecha, primerDia);
  return turnos
    .filter((t) => inicioSemana(t.inicio.slice(0, 10), primerDia) === inicio)
    .reduce((suma, t) => suma + aporteSemana(t), 0);
}

/**
 * Meta de la semana que contiene `fecha`, en minutos. El primer día de la semana sale de la regla que rige
 * en `fecha`; la meta, de la regla que rige el primer día de esa semana: una regla que arranca a mitad de
 * semana empieza a regir la semana siguiente.
 */
export function metaSemana(fecha: string, reglas: ReglasGlobales = REGLAS_POR_DEFECTO): number {
  const inicio = inicioSemana(fecha, reglasVigentes(reglas, fecha).inicioSemana);
  return reglasVigentes(reglas, inicio).minutosSemana;
}
