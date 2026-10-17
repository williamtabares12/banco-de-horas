export type BloqueAviso = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] };

export type AvisoPrivacidad = {
  /** Si cambia, la app vuelve a pedir la autorización. */
  version: number;
  titulo: string;
  secciones: { titulo: string; bloques: BloqueAviso[] }[];
  /** Texto de la casilla de autorización. */
  textoAutorizacion: string;
};

/** Lo que va entre corchetes en aviso-privacidad.md. Vive aquí para que editar el documento no lo pierda. */
export type DatosAviso = { nombreApp: string; responsable: string; correoContacto: string };

export const DATOS_AVISO: DatosAviso = {
  nombreApp: "Arena",
  responsable: "ALEJANDRO TABARES",
  correoContacto: "wiliamtabares.12@gmail.com",
};

/**
 * Lee aviso-privacidad.md: así el texto que ve la gente es el mismo del documento, sin copias.
 * Ignora las notas para Alejandro (todo lo anterior a la primera línea `---`) y rellena los datos
 * entre corchetes ([NOMBRE DE LA APP], [NOMBRE COMPLETO DEL RESPONSABLE], [CORREO DE CONTACTO]).
 */
export function leerAviso(markdown: string, datos: DatosAviso = DATOS_AVISO): AvisoPrivacidad {
  const lineas = markdown
    .replace(/\r\n/g, "\n")
    .replaceAll("[NOMBRE DE LA APP]", datos.nombreApp)
    .replaceAll("[NOMBRE COMPLETO DEL RESPONSABLE]", datos.responsable)
    .replaceAll("[CORREO DE CONTACTO]", datos.correoContacto)
    .split("\n");

  const lineaVersion = lineas.find((l) => /^Versión del aviso:/.test(l));
  const version = lineaVersion ? Number(/Versión del aviso:\s*(\d+)/.exec(lineaVersion)?.[1]) : NaN;
  if (!Number.isInteger(version)) throw new Error("El aviso no tiene número de versión");

  const corte = lineas.indexOf("---");
  const cuerpo = corte === -1 ? [] : lineas.slice(corte + 1);

  let titulo = "";
  const secciones: AvisoPrivacidad["secciones"] = [];
  let textoAutorizacion = "";
  let enAutorizacion = false;
  let parrafo: string[] = [];

  const cerrarParrafo = () => {
    const texto = parrafo.join(" ").trim();
    parrafo = [];
    if (!texto) return;
    const actual = secciones[secciones.length - 1];
    if (enAutorizacion) textoAutorizacion = texto.replace(/^"|"$/g, "");
    else if (actual) actual.bloques.push({ tipo: "parrafo", texto });
  };

  for (const linea of cuerpo) {
    if (linea.startsWith("## ")) {
      cerrarParrafo();
      titulo = linea.slice(3).trim();
    } else if (linea.startsWith("### ")) {
      cerrarParrafo();
      const nombre = linea.slice(4).trim();
      if (nombre === "Autorización") enAutorizacion = true;
      else secciones.push({ titulo: nombre, bloques: [] });
    } else if (linea.startsWith("- ")) {
      cerrarParrafo();
      const actual = secciones[secciones.length - 1];
      if (!actual || enAutorizacion) continue;
      const ultimo = actual.bloques[actual.bloques.length - 1];
      const item = linea.slice(2).trim();
      if (ultimo?.tipo === "lista") ultimo.items.push(item);
      else actual.bloques.push({ tipo: "lista", items: [item] });
    } else if (linea.trim() === "") {
      cerrarParrafo();
    } else if (!enAutorizacion || !linea.startsWith("Texto de la casilla")) {
      parrafo.push(linea.trim());
    }
  }
  cerrarParrafo();

  if (secciones.length === 0 || !textoAutorizacion) throw new Error("El aviso está incompleto");
  return { version, titulo, secciones, textoAutorizacion };
}
