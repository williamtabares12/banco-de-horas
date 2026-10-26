import type { Config } from "./tipos";

/** Las reglas que no son de una persona sino de la clínica o de la norma (plan-nube.md §6b). */
export type ReglaGlobal = {
  nocturnoDesde: string; // "19:00"
  nocturnoHasta: string; // "06:00"
  minutosSemana: number; // 2520 = 42 h
  inicioSemana: 0 | 1; // 0 = domingo (la semana va de domingo a sábado), 1 = lunes
  desfaseQuincenas: 0 | 1;
  extrasDescuentanDeuda: boolean;
};

/**
 * Reglas con fecha de vigencia: la clave es el día (AAAA-MM-DD) desde el que rige cada una. Es un mapa
 * y no una lista porque la consola de Firebase lo edita más fácil. Las claves pueden venir en cualquier orden.
 */
export type ReglasGlobales = Record<string, ReglaGlobal>;

/** Las del documento inicial (parametros-iniciales.md). */
export const REGLAS_POR_DEFECTO: ReglasGlobales = {
  "2026-01-01": {
    nocturnoDesde: "19:00",
    nocturnoHasta: "06:00",
    minutosSemana: 2520,
    inicioSemana: 0,
    desfaseQuincenas: 1,
    extrasDescuentanDeuda: true,
  },
};

/**
 * La regla que rige en `fecha` (AAAA-MM-DD): la de fecha más reciente que no sea posterior. Antes de la
 * primera regla rige la primera, así nada anterior queda sin calcular. Sin ninguna regla lanza error:
 * nunca se calcula con valores a medias.
 */
export function reglasVigentes(reglas: ReglasGlobales, fecha: string): ReglaGlobal {
  const desdes = Object.keys(reglas).sort();
  if (desdes.length === 0) throw new Error("No hay ninguna regla vigente");
  let elegida = desdes[0];
  for (const desde of desdes) {
    if (desde <= fecha) elegida = desde;
    else break;
  }
  return reglas[elegida];
}

/** La configuración personal vista como una sola regla que rige siempre (la versión personal no tiene fechas). */
export function reglasDeConfig(
  config: Pick<Config, "nocturnoDesde" | "nocturnoHasta" | "minutosSemana" | "inicioSemana" | "desfaseQuincenas" | "extrasDescuentanDeuda">,
): ReglasGlobales {
  return {
    "0001-01-01": {
      nocturnoDesde: config.nocturnoDesde,
      nocturnoHasta: config.nocturnoHasta,
      minutosSemana: config.minutosSemana,
      inicioSemana: config.inicioSemana,
      desfaseQuincenas: config.desfaseQuincenas,
      extrasDescuentanDeuda: config.extrasDescuentanDeuda,
    },
  };
}
