import { CONFIG_POR_DEFECTO, copiarPlantillas } from "./config";
import { nuevoMovimiento } from "./banco";
import { editarPlantilla } from "./plantillas";
import type { Config, MovimientoBanco, PlantillaTurno } from "./tipos";

/** Pasos del primer ingreso (spec-companeros.md RF-C2). La importación del respaldo llega en T27. */
export const PASOS = ["aviso", "saldo", "jornada", "plantillas"] as const;
export type Paso = (typeof PASOS)[number];

export type Respuestas = {
  avisoAceptado: boolean;
  /** Fecha del saldo inicial, AAAA-MM-DD. */
  saldoFecha: string;
  /** Minutos que debe a la clínica; 0 si no debe nada. */
  saldoMinutos: number;
  minutosSemana: number;
  /** Inicio de la jornada nocturna, HH:mm. */
  nocturnoDesde: string;
  plantillas: PlantillaTurno[];
};

/** Lo que se guarda en usuarios/{uid}. No lleva nada más que esto (spec-companeros.md §6). */
export type PerfilNube = {
  correo: string;
  creadoEn: string;
  avisoVersion: number;
  avisoAceptadoEn: string;
  schemaVersion: 2;
};

const MINUTOS_SEMANA_MAX = 7 * 24 * 60;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** El aviso empieza sin aceptar: hay que marcarlo a propósito. */
export function respuestasPorDefecto(hoy: string): Respuestas {
  return {
    avisoAceptado: false,
    saldoFecha: hoy,
    saldoMinutos: 0,
    minutosSemana: CONFIG_POR_DEFECTO.minutosSemana,
    nocturnoDesde: CONFIG_POR_DEFECTO.nocturnoDesde,
    plantillas: copiarPlantillas(),
  };
}

/** Qué falta para pasar de un paso al siguiente, o null si está bien. */
export function errorDelPaso(paso: Paso, r: Respuestas): string | null {
  switch (paso) {
    case "aviso":
      return r.avisoAceptado ? null : "Para continuar tienes que aceptar el aviso de privacidad";
    case "saldo": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.saldoFecha)) return "Pon la fecha del saldo inicial";
      const [a, m, d] = r.saldoFecha.split("-").map(Number);
      const fecha = new Date(Date.UTC(a, m - 1, d));
      if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return "Esa fecha no existe";
      if (Number.isNaN(r.saldoMinutos)) return "No entiendo esas horas. Ejemplo: 4 o 4:30";
      if (!Number.isInteger(r.saldoMinutos) || r.saldoMinutos < 0) return "Las horas que debes tienen que ser 0 o más";
      return null;
    }
    case "jornada":
      if (Number.isNaN(r.minutosSemana)) return "No entiendo las horas semanales. Ejemplo: 42";
      if (!Number.isInteger(r.minutosSemana) || r.minutosSemana <= 0 || r.minutosSemana > MINUTOS_SEMANA_MAX) {
        return "Las horas semanales tienen que ser más de 0 y caber en una semana";
      }
      if (!HORA.test(r.nocturnoDesde)) return "El inicio de la jornada nocturna debe ser una hora, por ejemplo 19:00";
      return null;
    case "plantillas":
      try {
        for (const p of r.plantillas) editarPlantilla(p, p); // la misma validación de Ajustes
      } catch (e) {
        return e instanceof Error ? e.message : "Hay una plantilla con datos inválidos";
      }
      return null;
  }
}

export function puedeContinuar(paso: Paso, r: Respuestas): boolean {
  return errorDelPaso(paso, r) === null;
}

/** La configuración y los movimientos con que arranca una cuenta nueva. Lanza si algún paso está mal. */
export function crearDatosIniciales(
  r: Respuestas,
  ahora: string,
  nuevoId: () => string,
): { config: Config; movimientos: MovimientoBanco[] } {
  for (const paso of PASOS) {
    const error = errorDelPaso(paso, r);
    if (error) throw new Error(error);
  }
  const config: Config = {
    ...CONFIG_POR_DEFECTO,
    festivosAgregados: [],
    festivosQuitados: [],
    minutosSemana: r.minutosSemana,
    nocturnoDesde: r.nocturnoDesde,
    plantillas: r.plantillas.map((p) => ({ ...p })),
  };
  const movimientos =
    r.saldoMinutos > 0
      ? [nuevoMovimiento({ tipo: "saldo_inicial", fecha: r.saldoFecha, minutos: r.saldoMinutos }, ahora, nuevoId())]
      : [];
  return { config, movimientos };
}

export function crearPerfil(correo: string, avisoVersion: number, ahora: string): PerfilNube {
  return { correo, creadoEn: ahora, avisoVersion, avisoAceptadoEn: ahora, schemaVersion: 2 };
}
