import { duracionPlantilla } from "./plantillas";
import type { ReglaGlobal, ReglasGlobales } from "./reglas";

/** Una plantilla tal como viene en el documento (sin id: el id se arma al copiarla a una persona). */
export type PlantillaPorDefecto = { nombre: string; inicio: string; fin: string; descansoMin: number };

/** El documento configuracion/parametros (plan-nube.md §6b), ya validado. */
export type Parametros = {
  /** Sube cada vez que Alejandro edita el documento. */
  version: number;
  /** Versión vigente del aviso de privacidad. Si sube, la app pide aceptarlo de nuevo. */
  avisoVersion: number;
  reglas: ReglasGlobales;
  festivosAgregados: string[];
  festivosQuitados: string[];
  /** Clave (dia8, noche12...) y plantilla. Se copian a una persona nueva en su primer ingreso. */
  plantillasPorDefecto: Record<string, PlantillaPorDefecto>;
};

export class ParametrosInvalidos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ParametrosInvalidos";
  }
}

type Obj = Record<string, unknown>;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MINUTOS_SEMANA_MAX = 7 * 24 * 60;

const esObjeto = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function falla(donde: string, queFalta: string): never {
  throw new ParametrosInvalidos(`${donde}: ${queFalta}`);
}

function fechaReal(v: unknown): v is string {
  if (typeof v !== "string" || !FECHA.test(v)) return false;
  const [a, m, d] = v.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

function entero(o: Obj, campo: string, donde: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const v = o[campo];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    falla(`${donde}${campo}`, `debe ser un número entero${min > 0 ? ` de ${min} en adelante` : ""}`);
  }
  return v;
}

function hora(o: Obj, campo: string, donde: string): string {
  const v = o[campo];
  if (typeof v !== "string" || !HORA.test(v)) falla(`${donde}${campo}`, "debe ser una hora HH:mm, por ejemplo 19:00");
  return v;
}

function listaDeFechas(o: Obj, campo: string): string[] {
  const v = o[campo];
  if (!Array.isArray(v)) falla(campo, "debe ser una lista de fechas AAAA-MM-DD (puede estar vacía)");
  return v.map((f, i) => {
    if (!fechaReal(f)) falla(`${campo}[${i}]`, "debe ser una fecha real AAAA-MM-DD");
    return f;
  });
}

function leerRegla(v: unknown, desde: string): ReglaGlobal {
  const donde = `reglas.${desde}.`;
  if (!esObjeto(v)) falla(`reglas.${desde}`, "debe ser un mapa con la regla");
  const desfase = v.desfaseQuincenas;
  if (desfase !== 0 && desfase !== 1) falla(`${donde}desfaseQuincenas`, "debe ser 0 o 1");
  if (typeof v.extrasDescuentanDeuda !== "boolean") falla(`${donde}extrasDescuentanDeuda`, "debe ser verdadero o falso");
  return {
    nocturnoDesde: hora(v, "nocturnoDesde", donde),
    nocturnoHasta: hora(v, "nocturnoHasta", donde),
    minutosSemana: entero(v, "minutosSemana", donde, 1, MINUTOS_SEMANA_MAX),
    desfaseQuincenas: desfase,
    extrasDescuentanDeuda: v.extrasDescuentanDeuda,
  };
}

function leerPlantilla(v: unknown, clave: string): PlantillaPorDefecto {
  const donde = `plantillasPorDefecto.${clave}`;
  if (!esObjeto(v)) falla(donde, "debe ser un mapa con la plantilla");
  if (typeof v.nombre !== "string" || v.nombre.trim() === "") falla(`${donde}.nombre`, "necesita un nombre");
  const inicio = hora(v, "inicio", `${donde}.`);
  const fin = hora(v, "fin", `${donde}.`);
  const descansoMin = entero(v, "descansoMin", `${donde}.`, 0);
  if (descansoMin > duracionPlantilla({ inicio, fin })) falla(`${donde}.descansoMin`, "no puede ser mayor que el turno");
  return { nombre: v.nombre.trim(), inicio, fin, descansoMin };
}

/**
 * Comprueba la forma del documento de parámetros (tipos correctos y campos completos) y devuelve una
 * copia con solo lo que conoce. Lanza ParametrosInvalidos diciendo qué campo falla: la app nunca calcula
 * con valores a medias. Un número guardado como texto en la consola de Firebase se rechaza aquí.
 */
export function validarParametros(crudo: unknown): Parametros {
  if (!esObjeto(crudo)) falla("documento", "los parámetros no son un documento válido");

  if (!esObjeto(crudo.reglas) || Object.keys(crudo.reglas).length === 0) {
    falla("reglas", "debe ser un mapa con al menos una regla (clave: la fecha desde la que rige)");
  }
  const reglas: ReglasGlobales = {};
  for (const [desde, regla] of Object.entries(crudo.reglas)) {
    if (!fechaReal(desde)) falla(`reglas.${desde}`, "la clave debe ser una fecha real AAAA-MM-DD");
    reglas[desde] = leerRegla(regla, desde);
  }

  if (!esObjeto(crudo.plantillasPorDefecto)) falla("plantillasPorDefecto", "debe ser un mapa de plantillas");
  const plantillasPorDefecto: Record<string, PlantillaPorDefecto> = {};
  for (const [clave, plantilla] of Object.entries(crudo.plantillasPorDefecto)) {
    plantillasPorDefecto[clave] = leerPlantilla(plantilla, clave);
  }

  return {
    version: entero(crudo, "version", "", 1),
    avisoVersion: entero(crudo, "avisoVersion", "", 1),
    reglas,
    festivosAgregados: listaDeFechas(crudo, "festivosAgregados"),
    festivosQuitados: listaDeFechas(crudo, "festivosQuitados"),
    plantillasPorDefecto,
  };
}

/**
 * Lo que la app usa si no puede leer el documento ni tiene una copia: los mismos valores del documento
 * inicial (parametros-iniciales.md). Es el último respaldo, nunca un valor a medias.
 */
export const PARAMETROS_INCLUIDOS: Parametros = {
  version: 1,
  avisoVersion: 1,
  reglas: {
    "2026-01-01": {
      nocturnoDesde: "19:00",
      nocturnoHasta: "06:00",
      minutosSemana: 2520,
      desfaseQuincenas: 1,
      extrasDescuentanDeuda: true,
    },
  },
  festivosAgregados: [],
  festivosQuitados: [],
  plantillasPorDefecto: {
    dia8: { nombre: "Día 8 h", inicio: "07:00", fin: "16:00", descansoMin: 60 },
    dia12: { nombre: "Día 12 h", inicio: "07:00", fin: "19:00", descansoMin: 120 },
    noche12: { nombre: "Noche 12 h", inicio: "19:00", fin: "07:00", descansoMin: 120 },
  },
};
