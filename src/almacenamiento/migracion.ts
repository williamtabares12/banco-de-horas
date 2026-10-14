import { copiarPlantillas } from "../dominio/config";

/** Versión actual del formato de los datos guardados. */
export const VERSION_ESQUEMA = 2;

type Obj = Record<string, unknown>;
const esObjeto = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Lleva datos de un formato anterior al actual, sin perder nada: solo AGREGA lo
 * que falta y cambia el número de versión. No toca los movimientos (saldo inicial
 * incluido) ni reordena nada. La validación completa la hace quien llama después.
 *
 * Formato 1 (`version: 1`): turnos sin `descansoMin` y configuración sin `plantillas`.
 */
export function migrar(crudo: unknown): { datos: unknown; migrado: boolean } {
  if (!esObjeto(crudo) || "schemaVersion" in crudo || crudo.version !== 1) {
    return { datos: crudo, migrado: false };
  }
  const { version: _antigua, ...resto } = crudo;
  const turnos = Array.isArray(resto.turnos)
    ? resto.turnos.map((t) => (esObjeto(t) && t.descansoMin === undefined ? { ...t, descansoMin: 0 } : t))
    : resto.turnos;
  const config =
    esObjeto(resto.config) && resto.config.plantillas === undefined
      ? { ...resto.config, plantillas: copiarPlantillas() }
      : resto.config;
  return { datos: { schemaVersion: VERSION_ESQUEMA, ...resto, turnos, config }, migrado: true };
}
