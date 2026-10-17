import { esNavegadorEmbebido } from "./navegadores";

export type OpcionDeInstalacion = "boton" | "guia-iphone" | "ninguna";

/** Los tres pasos para instalar la app en un iPhone (RF-C19). */
export const PASOS_IPHONE = [
  "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
  "Elige «Añadir a pantalla de inicio».",
  "Toca «Añadir». Arena queda como una app más.",
] as const;

/**
 * Qué se le ofrece a cada persona para instalar la app (RF-C19). Android y otros Chromium avisan con un evento
 * cuando se puede instalar: ahí va un botón. iPhone no tiene esa API: ahí va la guía de tres pasos. Si ya está
 * instalada, o se abrió dentro del navegador de otra app (donde no se puede), no se ofrece nada.
 */
export function opcionDeInstalacion(e: { instalada: boolean; hayEventoDeInstalacion: boolean; userAgent: string }): OpcionDeInstalacion {
  if (e.instalada) return "ninguna";
  if (e.hayEventoDeInstalacion) return "boton";
  const esIphone = /iPhone|iPad|iPod/.test(e.userAgent);
  if (esIphone && !esNavegadorEmbebido(e.userAgent)) return "guia-iphone";
  return "ninguna";
}
