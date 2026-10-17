/** A dónde llegan los reportes de problemas de quienes usan la app (RF-C11). */
export const CORREO_REPORTES = "wiliamtabares.12@gmail.com";

const MAX_NAVEGADOR = 200;

/**
 * Enlace `mailto:` del botón "Reportar un problema": abre el correo con el asunto, la versión de la app y
 * el navegador ya escritos, para que el reporte se pueda reproducir. No lleva nada de la persona (ni su
 * correo ni su identificador) y recuerda no escribir datos de pacientes.
 */
export function enlaceDeReporte(version: string, navegador: string): string {
  const agente = navegador.trim().slice(0, MAX_NAVEGADOR) || "desconocido";
  const cuerpo = [
    "Cuéntanos qué pasó y en qué pantalla estabas:",
    "",
    "",
    "(No escribas nombres ni documentos de pacientes.)",
    "",
    "---",
    `Versión: ${version}`,
    `Navegador: ${agente}`,
  ].join("\n");
  return `mailto:${CORREO_REPORTES}?subject=${encodeURIComponent("Reporte de un problema")}&body=${encodeURIComponent(cuerpo)}`;
}
