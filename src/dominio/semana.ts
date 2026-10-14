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
 * Minutos de la semana (lunes a domingo) que contiene `fecha`.
 * Un turno cuenta en la semana de su fecha de inicio.
 */
export function minutosDeSemana(turnos: Turno[], fecha: string): number {
  const lunes = inicioSemana(fecha);
  return turnos
    .filter((t) => inicioSemana(t.inicio.slice(0, 10)) === lunes)
    .reduce((suma, t) => suma + aporteSemana(t), 0);
}
