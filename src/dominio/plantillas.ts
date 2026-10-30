import { duracionMinutos, errorDeDuracion, parsearDuracion } from "./tiempo";
import type { PlantillaTurno } from "./tipos";
import { fechasDeTurno, type EntradaTurno } from "./turnos";

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

/** Lo que se elige en "¿Qué horario hiciste?" cuando ninguna plantilla sirve (RF16). Las plantillas se eligen por su id. */
export const OTRO_HORARIO = "otro";

export type ResultadoHorario =
  | { ok: true; descansoMin: number; minutosProgramados: number }
  | { ok: false; campo: "horario" | "descanso" | "programadas"; mensaje: string };

/**
 * Valida lo que el formulario de turno pide sobre el horario (RF16). Un turno ordinario necesita haber elegido un
 * horario (una plantilla u "Otro horario"), y el descanso y las horas programadas escritos: el descanso vacío no se
 * toma como 0. Un turno de alquiler no pide horario y va con descanso 0.
 *
 * Los textos del descanso y de las horas son los que ve la persona: "horas programadas" son los minutos netos.
 */
export function validarHorarioDeTurno(datos: {
  tipo: EntradaTurno["tipo"];
  horario: string;
  descanso: string;
  programadas: string;
}): ResultadoHorario {
  if (datos.tipo === "alquiler") return { ok: true, descansoMin: 0, minutosProgramados: 0 };
  if (datos.horario === "") return { ok: false, campo: "horario", mensaje: "Elige un horario" };
  if (datos.descanso.trim() === "") return { ok: false, campo: "descanso", mensaje: "Escribe 0 si no tuviste descanso" };
  const programadas = parsearDuracion(datos.programadas);
  if (programadas === null) {
    const motivo = datos.programadas.trim() === "" ? "escríbelas, por ejemplo 8 o 7:30." : errorDeDuracion(datos.programadas);
    return { ok: false, campo: "programadas", mensaje: `Horas programadas: ${motivo}` };
  }
  return { ok: true, descansoMin: Number(datos.descanso), minutosProgramados: programadas };
}

/**
 * Qué horario le toca a un turno que ya tiene sus horas (al editarlo): la plantilla que dé exactamente su inicio,
 * su fin, su descanso y sus horas programadas, o "otro" si ninguna coincide.
 */
export function plantillaElegida(entrada: EntradaTurno, plantillas: PlantillaTurno[]): string {
  const coincide = plantillas.find((p) => {
    const v = valoresDePlantilla(p);
    return (
      v.horaInicio === entrada.inicio.slice(11) &&
      v.horaFin === entrada.fin.slice(11) &&
      v.descansoMin === (entrada.descansoMin ?? 0) &&
      v.minutosProgramados === entrada.minutosProgramados
    );
  });
  return coincide ? coincide.id : OTRO_HORARIO;
}
