/** Cuándo aparece la pantalla de carga y cuándo avisa de la demora (spec-companeros.md RF-C24). */
export const TIEMPOS_DE_CARGA = {
  aparece: 300,
  demora: 6000,
  /** Si una pantalla de carga entra a menos de esto de que se fue otra, es la misma espera. */
  continuidad: 250,
} as const;

export type FaseDeCarga = "oculta" | "visible" | "demora";

/**
 * Qué se ve después de esperar `ms` milisegundos. Antes de 300 ms nada, para que no parpadee si la app abre
 * rápido. Pasados 6 s se añade el aviso de demora; y de ahí en adelante nunca se queda en blanco.
 */
export function fasePorTiempo(ms: number): FaseDeCarga {
  if (ms < TIEMPOS_DE_CARGA.aparece) return "oculta";
  if (ms < TIEMPOS_DE_CARGA.demora) return "visible";
  return "demora";
}

/**
 * Lleva la cuenta de cuánto lleva esperando la persona, aunque la pantalla de carga cambie de pieza (primero
 * se resuelve la sesión, luego se traen los datos). Sin esto, cada pieza empezaría sus 300 ms en blanco de
 * nuevo y la pantalla parpadearía. Una espera nueva solo empieza si pasó un rato sin pantalla de carga.
 * Recibe la hora como argumento para poder probarse sin reloj.
 */
export class SeguimientoDeEspera {
  private inicio: number | null = null;
  private ultimoCierre = -Infinity;

  /** Una pantalla de carga entra. Devuelve los milisegundos que lleva esta espera. */
  empezar(ahora: number): number {
    if (this.inicio === null || ahora - this.ultimoCierre > TIEMPOS_DE_CARGA.continuidad) this.inicio = ahora;
    return ahora - this.inicio;
  }

  /** La pantalla de carga se va (llegó el contenido, o la reemplaza otra pieza de la misma espera). */
  terminar(ahora: number): void {
    this.ultimoCierre = ahora;
  }
}
