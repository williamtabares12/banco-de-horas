import { copiarPlantillas } from "../dominio/config";

/** Versión actual del formato de los datos guardados. */
export const VERSION_ESQUEMA = 3;

type Obj = Record<string, unknown>;
const esObjeto = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** ¿Es un guardado del formato 1? Ese cambio sí modifica datos, por eso se guarda una copia antes de migrarlo. */
export const esFormato1 = (crudo: unknown): boolean => esObjeto(crudo) && !("schemaVersion" in crudo) && crudo.version === 1;

/**
 * Lleva datos de un formato anterior al actual, sin perder nada: solo AGREGA lo
 * que falta y cambia el número de versión. No toca los movimientos (saldo inicial
 * incluido) ni reordena nada. La validación completa la hace quien llama después.
 *
 * Formato 1 (`version: 1`): turnos sin `descansoMin` y configuración sin `plantillas`.
 * Formato 2 (`schemaVersion: 2`): configuración sin `inicioSemana` (la semana pasa a ser de domingo a sábado).
 * Un formato 1 pasa por las dos migraciones.
 */
export function migrar(crudo: unknown): { datos: unknown; migrado: boolean } {
  const primera = aFormato2(crudo);
  const segunda = aFormato3(primera.datos);
  return { datos: segunda.datos, migrado: primera.migrado || segunda.migrado };
}

function aFormato3(crudo: unknown): { datos: unknown; migrado: boolean } {
  if (!esObjeto(crudo) || crudo.schemaVersion !== 2) return { datos: crudo, migrado: false };
  const config =
    esObjeto(crudo.config) && crudo.config.inicioSemana === undefined ? { ...crudo.config, inicioSemana: 0 } : crudo.config;
  return { datos: { ...crudo, schemaVersion: 3, config }, migrado: true };
}

function aFormato2(crudo: unknown): { datos: unknown; migrado: boolean } {
  if (!esFormato1(crudo)) return { datos: crudo, migrado: false };
  const { version: _antigua, ...resto } = crudo as Obj;
  const turnos = Array.isArray(resto.turnos)
    ? resto.turnos.map((t) => (esObjeto(t) && t.descansoMin === undefined ? { ...t, descansoMin: 0 } : t))
    : resto.turnos;
  const config =
    esObjeto(resto.config) && resto.config.plantillas === undefined
      ? { ...resto.config, plantillas: copiarPlantillas() }
      : resto.config;
  return { datos: { schemaVersion: 2, ...resto, turnos, config }, migrado: true };
}
