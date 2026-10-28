// T19 / T42: los componentes base con el estilo de vidrio (estilo-visual.md, secciones 4 y 6).
// Reescrita desde la versión del estilo anterior: misma intención, valores nuevos.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerArchivosDelProyecto, revisarEstilo } from "../scripts/check-estilo.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

const css = leer("src/ui/estilo/componentes.css");

/** Declaraciones de la primera regla cuyo selector sea exactamente `selector` (sin contar las de @media). */
function regla(selector: string): Record<string, string> {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|\\n)\\s*${escapado}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`No hay una regla para ${selector}`);
  return Object.fromEntries(
    [...m[1].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]),
  );
}

describe("componentes.css: dónde vive y cómo se ordena", () => {
  it("está dentro de una capa que gana a la base global (los reinicios de títulos y párrafos)", () => {
    expect(css).toMatch(/@layer componentes\s*\{/);
    expect(leer("src/ui/estilo/global.css")).toMatch(/@layer base,\s*componentes;/);
    expect(leer("src/ui/estilo/global.css")).toMatch(/@layer base\s*\{/);
  });
  it("se carga desde main.tsx", () => {
    expect(leer("src/main.tsx")).toMatch(/ui\/estilo\/componentes\.css/);
  });
});

describe("CA17: lo que se toca mide al menos 44 px de alto", () => {
  for (const selector of [".boton", ".enlace", ".pestana", ".campo__control", ".fila-lista__tocable", ".interruptor"]) {
    it(`${selector}`, () => {
      expect(regla(selector)["min-height"]).toBe("var(--zona-tactil)");
    });
  }
  it("el botón principal mide 48 px", () => {
    expect(regla(".boton--relleno")["min-height"]).toBe("var(--boton-alto)");
    expect(leer("src/ui/estilo/tokens.css")).toMatch(/--boton-alto:\s*48px/);
  });
  it("la zona táctil del documento es de 44 px", () => {
    expect(leer("src/ui/estilo/tokens.css")).toMatch(/--zona-tactil:\s*44px/);
  });
});

describe("botones (sección 6)", () => {
  it("todos son pastilla, con letra de 17 px y peso 600", () => {
    const b = regla(".boton");
    expect(b["border-radius"]).toBe("var(--radio-pastilla)");
    expect(b["font-size"]).toBe("var(--tam-cuerpo)");
    expect(b["font-weight"]).toBe("var(--peso-fuerte)");
  });
  it("el principal: degradado de acción, texto blanco y sombra de acción", () => {
    const r = regla(".boton--relleno");
    expect(r["background"]).toBe("var(--degradado-accion)");
    expect(r["color"]).toBe("var(--sobre-accion)");
    expect(r["box-shadow"]).toBe("var(--sombra-accion)");
    expect(regla(".boton")["border"]).toMatch(/transparent/);
  });
  it("en el celular el principal ocupa el ancho completo", () => {
    expect(css).toMatch(/@media \(max-width: 640px\)\s*\{[^}]*\.boton--relleno\s*\{[^}]*width:\s*100%/);
  });
  it("el de contorno: borde de acción de 1 px y texto de enlace, con un velo de vidrio para el contraste", () => {
    const c = regla(".boton--contorno");
    expect(c["color"]).toBe("var(--enlace)");
    expect(c["border-color"]).toBe("var(--accion)");
    expect(c["background"]).toBe("var(--vidrio)");
    expect(regla(".boton")["border"]).toBe("1px solid transparent");
  });
  it("las acciones que borran usan borde y texto de aviso", () => {
    const b = regla(".boton--contorno.boton--borra");
    expect(b["color"]).toBe("var(--aviso)");
    expect(b["border-color"]).toBe("var(--aviso)");
  });
  it("deshabilitado: opacidad al 50 %", () => {
    expect(regla(".boton:disabled")["opacity"]).toBe("0.5");
  });
  it("el enlace: texto de enlace, sin fondo, subrayado solo al pasar el dedo o el cursor", () => {
    const e = regla(".enlace");
    expect(e["color"]).toBe("var(--enlace)");
    expect(e["background"]).toBe("transparent");
    expect(e["text-decoration"]).toBe("none");
    expect(css).toMatch(/\.enlace:hover[^{]*\{[^}]*text-decoration:\s*underline/);
  });
  it("el foco de teclado es un aro de 2 px de acción clara con 2 px de separación", () => {
    expect(css).toMatch(/\.boton:focus-visible[^{]*\{[^}]*outline:\s*2px solid var\(--accion-clara\)[^}]*outline-offset:\s*2px/);
  });
});

describe("pestañas (sección 6, CA18)", () => {
  it("fila que se desplaza de lado, sin línea inferior", () => {
    const p = regla(".pestanas");
    expect(p["overflow-x"]).toBe("auto");
    expect(p["border-bottom"]).toBeUndefined();
  });
  it("cada pestaña es una pastilla de 14 px y peso 600 que no se encoge ni se corta", () => {
    const p = regla(".pestana");
    expect(p["border-radius"]).toBe("var(--radio-pastilla)");
    expect(p["font-size"]).toBe("var(--tam-pequeno)");
    expect(p["font-weight"]).toBe("var(--peso-fuerte)");
    expect(p["white-space"]).toBe("nowrap");
    expect(p["flex"]).toBe("0 0 auto");
    expect(p["background"]).toBe("transparent");
  });
  it("las inactivas van en --texto: sobre el degradado desnudo el color de enlace no llega a 4,5 de contraste", () => {
    expect(regla(".pestana")["color"]).toBe("var(--texto)");
  });
  it("la activa: degradado de acción, texto blanco y sombra de acción", () => {
    const a = regla(".pestana--activa");
    expect(a["background"]).toBe("var(--degradado-accion)");
    expect(a["color"]).toBe("var(--sobre-accion)");
    expect(a["box-shadow"]).toBe("var(--sombra-accion)");
  });
  it("no se imprimen", () => {
    expect(css).toMatch(/@media print\s*\{[^}]*\.pestanas\s*\{[^}]*display:\s*none/);
  });
});

describe("campos (sección 6, CA20)", () => {
  it("etiqueta de 14 px en gris suave arriba", () => {
    const e = regla(".campo__etiqueta");
    expect(e["font-size"]).toBe("var(--tam-pequeno)");
    expect(e["color"]).toBe("var(--texto-suave)");
  });
  it("campo con radio de 12 px, borde fino, fondo de vidrio y letra de 17 px", () => {
    const c = regla(".campo__control");
    expect(c["border-radius"]).toBe("var(--radio-campo)");
    expect(c["border"]).toBe("1px solid var(--linea)");
    expect(c["background"]).toBe("var(--vidrio)");
    expect(c["font-size"]).toBe("var(--tam-cuerpo)");
  });
  it("la letra de los campos es de 16 px o más, para que el iPhone no haga zoom (CA20)", () => {
    const rem = Number(/--tam-cuerpo:\s*([\d.]+)rem/.exec(leer("src/ui/estilo/tokens.css"))![1]);
    expect(rem * 16).toBeGreaterThanOrEqual(16);
  });
  it("el select conserva su apariencia nativa: sin ella el iPhone le quita la flecha y no se nota que es una lista", () => {
    expect(css).toMatch(/select\.campo__control\s*\{[^}]*appearance:\s*auto/);
  });
  it("al enfocar: aro de 2 px de acción clara con 2 px de separación", () => {
    expect(css).toMatch(/\.campo__control:focus[^{]*\{[^}]*outline:\s*2px solid var\(--accion-clara\)[^}]*outline-offset:\s*2px/);
  });
});

describe("filas de lista (sección 6)", () => {
  it("una línea fina de 1 px entre filas y sin fondo ni tarjeta propia", () => {
    const f = regla(".fila-lista");
    expect(f["border-bottom"]).toBe("1px solid var(--linea)");
    expect(f["background"] ?? "none").toMatch(/none|transparent/);
    expect(regla(".fila-lista:last-child")["border-bottom"]).toBe("0");
  });
  it("fecha en caption suave, título de 17 px, horas a la derecha en peso 600", () => {
    expect(regla(".fila-lista__fecha")["font-size"]).toBe("var(--tam-caption)");
    expect(regla(".fila-lista__fecha")["color"]).toBe("var(--texto-suave)");
    expect(regla(".fila-lista__titulo")["font-size"]).toBe("var(--tam-cuerpo)");
    expect(regla(".fila-lista__valor")["font-weight"]).toBe("var(--peso-fuerte)");
    expect(regla(".fila-lista__valor")["font-size"]).toBe("var(--tam-cuerpo)");
  });
});

describe("avisos (sección 6)", () => {
  it("línea vertical de 3 px en --aviso a la izquierda del texto, que va en --texto", () => {
    const a = regla(".aviso");
    expect(a["border-left"]).toBe("3px solid var(--aviso)");
    expect(a["color"]).toBe("var(--texto)");
  });
  it("la palabra Aviso o Error va en peso 600", () => {
    expect(regla(".aviso__palabra")["font-weight"]).toBe("var(--peso-fuerte)");
  });
  it("un resultado normal, sin la palabra, no lleva la línea de aviso: el color no es la única señal", () => {
    expect(css).toMatch(/\.aviso:not\(:has\(\.aviso__palabra\)\)\s*\{[^}]*border-left-color:\s*var\(--linea\)/);
  });
});

describe("barra de avance, interruptor y diálogo (sección 6)", () => {
  it("barra: 6 px de alto, pastilla, pista de relleno y relleno en degradado", () => {
    const b = regla(".barra-avance");
    expect(b["height"]).toBe("var(--barra-alto)");
    expect(b["border-radius"]).toBe("var(--radio-pastilla)");
    expect(b["background"]).toBe("var(--relleno)");
    expect(regla(".barra-avance__relleno")["background"]).toBe("var(--degradado-barra)");
  });
  it("interruptor: apagado en relleno, encendido en acción", () => {
    expect(regla(".interruptor__pista")["background"]).toBe("var(--relleno)");
    expect(regla(".interruptor--encendido .interruptor__pista")["background"]).toBe("var(--accion)");
  });
  it("diálogo: velo de 40 % y hoja de vidrio con borde de 1 px y radio de 24 px", () => {
    expect(regla(".dialogo__velo")["background"]).toBe("var(--velo)");
    const h = regla(".dialogo__hoja");
    expect(h["border"]).toBe("1px solid var(--vidrio-borde)");
    expect(h["border-radius"]).toBe("var(--radio-tarjeta)");
    expect(h["box-shadow"]).toBe("var(--sombra)");
  });
  it("la hoja del diálogo usa el fondo sólido del vidrio: sobre el velo oscuro el vidrio translúcido dejaría el texto suave sin contraste", () => {
    expect(regla(".dialogo__hoja")["background"]).toBe("var(--vidrio-solido)");
  });
});

describe("lo que el documento prohíbe (sección 9)", () => {
  it("las sombras y los degradados salen solo de variables", () => {
    for (const m of css.matchAll(/box-shadow:\s*([^;]+);/g)) expect(m[1]).toMatch(/^(none|var\(--sombra(-accion)?\))$/);
    expect(css).not.toMatch(/(linear|radial|conic)-gradient\(/);
  });
  it("el desenfoque no está en los componentes: solo las tarjetas (pantallas.css) lo llevan", () => {
    expect(css).not.toMatch(/backdrop-filter/);
  });
  it("sin tema oscuro", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
  });
  it("sin ningún color, sombra, degradado, radio, peso o tamaño de letra fuera de los tokens (modo estricto)", () => {
    const archivos = leerArchivosDelProyecto(RAIZ).filter((a: { ruta: string }) =>
      /ui\/estilo\/(tokens|global|componentes)\.css$/.test(a.ruta) || /ui\/componentes\/.*\.tsx$/.test(a.ruta),
    );
    expect(archivos.map((a: { ruta: string }) => a.ruta)).toContain("src/ui/estilo/componentes.css");
    const { errores } = revisarEstilo(archivos, { estricto: true });
    expect(errores.map((h: { ruta: string; linea: number; mensaje: string }) => `${h.ruta}:${h.linea} ${h.mensaje}`)).toEqual([]);
  });
});
