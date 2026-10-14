import type { Config, MovimientoBanco, Turno } from "../dominio/tipos";

/** Todo lo que la app guarda. `schemaVersion` permite migrar el formato sin perder datos. */
export type Datos = {
  schemaVersion: 2;
  /** Fecha "AAAA-MM-DD" de la última vez que se exportó un respaldo. */
  ultimoRespaldo?: string;
  config: Config;
  turnos: Turno[];
  movimientos: MovimientoBanco[];
};

/**
 * Dónde viven los datos. La app solo conoce esta interfaz, así se puede
 * cambiar localStorage por IndexedDB sin tocar el resto.
 */
export interface Repositorio {
  /** Sin datos guardados devuelve datos vacíos. Si lo guardado está dañado, lanza error. */
  cargar(): Datos;
  guardar(datos: Datos): void;
}
