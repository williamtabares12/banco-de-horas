#!/usr/bin/env node
// Revisa que el código siga estilo-visual.md (estilo de vidrio).
//
//  - Errores (siempre): un color que no esté definido en src/ui/estilo/tokens.css (CA16) y variables
//    de CSS que se usan sin estar definidas.
//  - Avisos: sombras y degradados que no salgan de una variable, vidrio fuera de una tarjeta o sin la variable
//    del desenfoque, movimiento que no sea el reloj de arena ni una transición de la variable, tema oscuro,
//    pesos de letra, radios y tamaños de letra fuera del documento. Con --estricto los avisos también son errores.
//
// Uso:  npm run check:estilo   |   node scripts/check-estilo.mjs --estricto

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORIAS_AVISO = new Set(["sombra", "degradado", "vidrio", "movimiento", "tema-oscuro", "peso", "radio", "tamano-letra"]);

/** Colores con nombre de CSS. Solo se buscan como valor de propiedades de color. */
const COLORES_CON_NOMBRE = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood " +
    "cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray " +
    "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue " +
    "firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew " +
    "hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue " +
    "mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
    "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
    "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
    "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
    "whitesmoke yellow yellowgreen"
  ).split(" "),
);

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FUNCION_DE_COLOR = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color-mix)\(/gi;

const PESOS_PERMITIDOS = new Set(["400", "500", "600", "normal", "inherit", "initial", "unset"]);
const RADIOS_PERMITIDOS = new Set(["0", "0px", "inherit", "var(--radio-tarjeta)", "var(--radio-campo)", "var(--radio-pastilla)"]);
const SOMBRAS_PERMITIDAS = /^(none|inherit|initial|unset|var\(--sombra(-accion)?\))$/;
/** El vidrio no va en el fondo ni en las filas de una lista (estilo-visual.md, sección 5). */
const SELECTOR_SIN_VIDRIO = /(^|[\s,>+~])(html|body|li|tr|td|th)\b|fila-lista|lista-filas|tabla-extracto/;

const normalizar = (ruta) => ruta.split(sep).join("/").replace(/\\/g, "/");
const esTokens = (ruta) => normalizar(ruta).endsWith("src/ui/estilo/tokens.css");
const tipoDe = (ruta) => (ruta.endsWith(".css") ? "css" : ruta.endsWith(".html") ? "html" : "ts");

/** Cambia por espacios (conservando los saltos de línea) lo que está en comentarios, para no marcar lo que no se ejecuta. */
function sinComentarios(texto, tipo) {
  const blanquear = (m) => m.replace(/[^\n]/g, " ");
  let t = texto.replace(/\/\*[\s\S]*?\*\//g, blanquear);
  if (tipo === "ts") t = t.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, antes) => antes + blanquear(m.slice(antes.length)));
  return t;
}

const lineaDe = (texto, indice) => texto.slice(0, indice).split("\n").length;

/** De un .html solo interesan los estilos: <style> y atributos style="". Las etiquetas meta no pueden usar variables. */
function estilosDeHtml(contenido) {
  const bloques = [];
  for (const m of contenido.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) bloques.push({ texto: m[1], indice: m.index });
  for (const m of contenido.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)) bloques.push({ texto: `x{${m[1]}}`, indice: m.index });
  return bloques;
}

/**
 * Declaraciones "propiedad: valor" de un CSS ya sin comentarios, con el selector de la regla donde están.
 * Ignora las variables personalizadas.
 */
function* declaraciones(css) {
  // Las reglas más internas: cubre lo que está dentro de @media, @supports y @layer sin entender su anidación
  for (const regla of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = regla[1].trim();
    const inicioCuerpo = regla.index + regla[1].length + 1;
    for (const m of regla[2].matchAll(/([a-zA-Z-]+)\s*:\s*([^;]*)/g)) {
      const propiedad = m[1].toLowerCase();
      if (propiedad.startsWith("--")) continue;
      yield { propiedad, valor: m[2].trim(), indice: inicioCuerpo + m.index, selector };
    }
  }
}

function esPropiedadDeColor(p) {
  return (
    p === "color" || p.endsWith("-color") || p === "background" || p === "background-image" || p.startsWith("border") ||
    p.startsWith("outline") || p === "fill" || p === "stroke" || p.endsWith("mask-image") || p === "text-decoration" ||
    p === "column-rule"
  );
}

/** Colores con nombre (red, white…) dentro de un valor. Lo que está dentro de var() o url() no cuenta. */
function coloresConNombre(valor) {
  const limpio = valor.replace(/var\([^)]*\)/gi, " ").replace(/url\([^)]*\)/gi, " ").replace(/"[^"]*"|'[^']*'/g, " ");
  return [...limpio.matchAll(/([a-zA-Z]+(?:-[a-zA-Z]+)*)(\()?/g)]
    .filter((m) => !m[2] && COLORES_CON_NOMBRE.has(m[1].toLowerCase()))
    .map((m) => m[1]);
}

/**
 * @param {{ruta: string, contenido: string}[]} archivos
 * @param {{estricto?: boolean}} opciones
 * @returns {{errores: object[], avisos: object[]}}
 */
export function revisarEstilo(archivos, { estricto = false } = {}) {
  const hallazgos = [];
  const agregar = (ruta, texto, indice, categoria, mensaje) =>
    hallazgos.push({ ruta: normalizar(ruta), linea: lineaDe(texto, indice), categoria, mensaje });

  // Unidades de revisión: cada archivo, y en un .html solo sus estilos
  const unidades = [];
  for (const { ruta, contenido } of archivos) {
    const tipo = tipoDe(ruta);
    if (tipo === "html") {
      for (const b of estilosDeHtml(contenido)) unidades.push({ ruta, tipo: "css", texto: sinComentarios(b.texto, "css"), base: lineaDe(contenido, b.indice) - 1 });
    } else {
      unidades.push({ ruta, tipo, texto: sinComentarios(contenido, tipo), base: 0 });
    }
  }
  const agregarUnidad = (u, indice, categoria, mensaje) => {
    hallazgos.push({ ruta: normalizar(u.ruta), linea: u.base + lineaDe(u.texto, indice), categoria, mensaje });
  };

  // Variables definidas en cualquier CSS
  const definidas = new Set();
  for (const u of unidades) if (u.tipo === "css") for (const m of u.texto.matchAll(/--([a-zA-Z0-9_-]+)\s*:/g)) definidas.add(m[1]);

  for (const u of unidades) {
    const enTokens = esTokens(u.ruta);

    // Variables usadas pero no definidas
    for (const m of u.texto.matchAll(/var\(\s*--([a-zA-Z0-9_-]+)/g)) {
      if (!definidas.has(m[1])) agregarUnidad(u, m.index, "variable", `La variable --${m[1]} no está definida en ningún CSS`);
    }

    // CA16: colores sueltos. En tokens.css se definen, así que ahí no cuentan.
    if (!enTokens) {
      for (const m of u.texto.matchAll(HEX)) agregarUnidad(u, m.index, "color", `Color suelto ${m[0]}: usa una variable de tokens.css`);
      for (const m of u.texto.matchAll(FUNCION_DE_COLOR)) agregarUnidad(u, m.index, "color", `Color suelto con ${m[0]}…): usa una variable de tokens.css`);
      if (u.tipo === "css") {
        for (const d of declaraciones(u.texto)) {
          if (!esPropiedadDeColor(d.propiedad)) continue;
          for (const nombre of coloresConNombre(d.valor)) agregarUnidad(u, d.indice, "color", `Color con nombre "${nombre}" en ${d.propiedad}: usa una variable de tokens.css`);
        }
      } else {
        // TypeScript: estilos en línea como { color: "red" }
        for (const m of u.texto.matchAll(/\b(?:color|background(?:Color)?|borderColor|outlineColor|fill|stroke)\s*:\s*["'`]([^"'`]+)["'`]/g)) {
          for (const nombre of coloresConNombre(m[1])) agregarUnidad(u, m.index, "color", `Color con nombre "${nombre}" en un estilo en línea`);
        }
      }
    }

    // Reglas del documento de estilo (solo en CSS)
    if (u.tipo !== "css") continue;
    for (const m of u.texto.matchAll(/prefers-color-scheme\s*:\s*dark/gi)) agregarUnidad(u, m.index, "tema-oscuro", "Tema oscuro: la app es solo tema claro");
    for (const d of declaraciones(u.texto)) {
      const v = d.valor.toLowerCase();
      if (d.propiedad === "color-scheme" && v.includes("dark")) agregarUnidad(u, d.indice, "tema-oscuro", "Tema oscuro: la app es solo tema claro");
      if (d.propiedad === "box-shadow" || d.propiedad === "text-shadow") {
        if (!SOMBRAS_PERMITIDAS.test(v)) agregarUnidad(u, d.indice, "sombra", `Sombra (${d.propiedad}): solo var(--sombra) o var(--sombra-accion)`);
      } else if ((d.propiedad === "filter" || d.propiedad === "backdrop-filter") && v.includes("drop-shadow(")) {
        agregarUnidad(u, d.indice, "sombra", `Sombra (${d.propiedad}): solo var(--sombra) o var(--sombra-accion)`);
      }
      if (!enTokens && /-gradient\(/.test(v.replace(/var\([^)]*\)/g, " "))) {
        agregarUnidad(u, d.indice, "degradado", `Degradado en ${d.propiedad}: define una variable en tokens.css y úsala con var(--…)`);
      }
      if (/^(-webkit-)?backdrop-filter$/.test(d.propiedad) && v !== "none") {
        if (v !== "blur(var(--desenfoque))") agregarUnidad(u, d.indice, "vidrio", `Vidrio (${d.propiedad}): solo blur(var(--desenfoque))`);
        if (SELECTOR_SIN_VIDRIO.test(d.selector)) agregarUnidad(u, d.indice, "vidrio", `Vidrio en "${d.selector}": va solo en tarjetas, no en el fondo ni en las filas de una lista`);
      }
      if ((d.propiedad === "transition" || d.propiedad === "transition-duration") && !/^(none|0s?|0ms)$/.test(v) && !v.includes("var(--transicion)")) {
        agregarUnidad(u, d.indice, "movimiento", `Transición (${d.propiedad}): usa var(--transicion), de 150 a 200 ms`);
      }
      if (/^animation(-name|-duration)?$/.test(d.propiedad) && v !== "none" && !d.selector.includes("reloj-arena")) {
        agregarUnidad(u, d.indice, "movimiento", `Animación en "${d.selector}": el único movimiento propio de la app es el reloj de arena`);
      }
      if (d.propiedad === "font-weight" && !PESOS_PERMITIDOS.has(v) && !v.startsWith("var(")) {
        agregarUnidad(u, d.indice, "peso", `Peso de letra ${d.valor}: solo 400, 500 y 600`);
      }
      if (/^border(-[a-z]+)*-radius$/.test(d.propiedad)) {
        for (const parte of v.split(/[\s/]+/).filter(Boolean)) {
          if (!RADIOS_PERMITIDOS.has(parte)) agregarUnidad(u, d.indice, "radio", `Radio ${parte}: solo --radio-tarjeta, --radio-campo y --radio-pastilla`);
        }
      }
      if (d.propiedad === "font-size" && !/^var\(--tam-[a-z-]+\)$/.test(v) && !["inherit", "100%", "initial", "unset"].includes(v)) {
        agregarUnidad(u, d.indice, "tamano-letra", `Tamaño de letra ${d.valor}: usa una variable --tam-… de tokens.css`);
      }
    }
  }

  const esAviso = (h) => !estricto && CATEGORIAS_AVISO.has(h.categoria);
  const ordenar = (a, b) => a.ruta.localeCompare(b.ruta) || a.linea - b.linea;
  return {
    errores: hallazgos.filter((h) => !esAviso(h)).sort(ordenar),
    avisos: hallazgos.filter(esAviso).sort(ordenar),
  };
}

/** CSS, TS y TSX de src, más index.html (del que solo se revisan los estilos). */
export function leerArchivosDelProyecto(raiz) {
  const archivos = [];
  const recorrer = (carpeta) => {
    for (const nombre of readdirSync(carpeta)) {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) {
        if (nombre !== "node_modules") recorrer(ruta);
      } else if (/\.(css|tsx?)$/.test(nombre)) {
        archivos.push({ ruta: normalizar(relative(raiz, ruta)), contenido: readFileSync(ruta, "utf8") });
      }
    }
  };
  recorrer(join(raiz, "src"));
  archivos.push({ ruta: "index.html", contenido: readFileSync(join(raiz, "index.html"), "utf8") });
  return archivos;
}

function principal() {
  const estricto = process.argv.includes("--estricto");
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const archivos = leerArchivosDelProyecto(raiz);
  const { errores, avisos } = revisarEstilo(archivos, { estricto });
  const mostrar = (titulo, lista) => {
    if (lista.length === 0) return;
    console.log(`\n${titulo} (${lista.length})`);
    for (const h of lista) console.log(`  ${h.ruta}:${h.linea}  [${h.categoria}] ${h.mensaje}`);
  };
  mostrar("Errores", errores);
  mostrar("Avisos (pasan a error en modo estricto)", avisos);
  console.log(
    `\nRevisados ${archivos.length} archivos${estricto ? " en modo estricto" : ""}: ` +
      (errores.length === 0 ? "sin errores." : `${errores.length} error(es).`) +
      (avisos.length ? ` ${avisos.length} aviso(s).` : ""),
  );
  process.exit(errores.length === 0 ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
