import { duracionMinutos } from "./tiempo";
import type { PlantillaTurno } from "./tipos";
import { fechasDeTurno } from "./turnos";

export type EntradaPlantilla = {
  nombre: string;
  inicio: string; // "07:00"
  fin: string; // "16:00"
  descansoMin: number;
};

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Minutos de reloj de una plantilla. Si el fin no es posterior al inicio, cruza la medianoche. */
export function duracionPlantilla(p: Pick<PlantillaTurno, "inicio" | "fin">): number {
  // la fecha es solo un apoyo para el cálculo: no importa cuál sea
  const { inicio, fin } = fechasDeTurno("2026-01-05", p.inicio, p.fin);
  return duracionMinutos(inicio, fin);
}

function validar(entrada: EntradaPlantilla): EntradaPlantilla {
  const nombre = entrada.nombre.trim();
  if (nombre === "") throw new Error("La plantilla necesita un nombre");
  if (!HORA.test(entrada.inicio) || !HORA.test(entrada.fin)) throw new Error("Las horas deben ser HH:mm");
  if (!Number.isInteger(entrada.descansoMin) || entrada.descansoMin < 0) {
    throw new Error("El descanso debe ser un número entero de minutos, 0 o más");
  }
  if (entrada.descansoMin > duracionPlantilla(entrada)) throw new Error("El descanso no puede ser mayor que el turno");
  return { nombre, inicio: entrada.inicio, fin: entrada.fin, descansoMin: entrada.descansoMin };
}

export function nuevaPlantilla(entrada: EntradaPlantilla, id: string): PlantillaTurno {
  return { id, ...validar(entrada) };
}

/** Cambia una plantilla conservando su id. No toca los turnos que ya se guardaron con ella. */
export function editarPlantilla(plantilla: PlantillaTurno, entrada: EntradaPlantilla): PlantillaTurno {
  return { id: plantilla.id, ...validar(entrada) };
}

export function borrarPlantilla(plantillas: PlantillaTurno[], id: string): PlantillaTurno[] {
  return plantillas.filter((p) => p.id !== id);
}

/**
 * Lo que rellena el formulario de turno al elegir una plantilla. Las horas
 * programadas son los minutos netos: los de reloj menos el descanso.
 */
export function valoresDePlantilla(p: PlantillaTurno): {
  horaInicio: string;
  horaFin: string;
  descansoMin: number;
  minutosProgramados: number;
} {
  return {
    horaInicio: p.inicio,
    horaFin: p.fin,
    descansoMin: p.descansoMin,
    minutosProgramados: duracionPlantilla(p) - p.descansoMin,
  };
}
