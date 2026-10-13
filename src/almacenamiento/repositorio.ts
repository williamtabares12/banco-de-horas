import type { Config, MovimientoBanco, Turno } from "../dominio/tipos";

/** Todo lo que la app guarda. `version` permite migrar el formato más adelante. */
export type Datos = {
  version: 1;
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
