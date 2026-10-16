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
  it("la zona táctil del documento es de 44 px", () => {
    expect(leer("src/ui/estilo/tokens.css")).toMatch(/--zona-tactil:\s*44px/);
  });
});

describe("botones (sección 5)", () => {
  it("todos son pastilla, con el relleno y la letra del documento", () => {
    const b = regla(".boton");
    expect(b["border-radius"]).toBe("var(--radio-pastilla)");
    expect(b["padding"]).toBe("var(--relleno-boton)");
    expect(b["font-size"]).toBe("var(--texto-cuerpo)");
    expect(b["font-weight"]).toBe("var(--peso-normal)");
  });
  it("el relleno: azul de acción con texto sobre-acción y sin borde visible", () => {
    const r = regla(".boton--relleno");
    expect(r["background"]).toBe("var(--color-accion)");
    expect(r["color"]).toBe("var(--color-sobre-accion)");
    expect(regla(".boton")["border"]).toMatch(/transparent/);
  });
  it("en el celular el relleno ocupa el ancho completo", () => {
    expect(css).toMatch(/@media \(max-width: 640px\)\s*\{[^}]*\.boton--relleno\s*\{[^}]*width:\s*100%/);
  });
  it("el de contorno: borde y texto con el color de enlace, fondo transparente", () => {
    const c = regla(".boton--contorno");
    expect(c["background"]).toBe("transparent");
    expect(c["color"]).toBe("var(--color-enlace)");
    expect(c["border-color"]).toBe("var(--color-enlace)");
  });
  it("las acciones que borran usan contorno con el color del texto", () => {
    const b = regla(".boton--contorno.boton--borra");
    expect(b["color"]).toBe("var(--color-texto)");
    expect(b["border-color"]).toBe("var(--color-texto)");
  });
  it("deshabilitado: relleno gris", () => {
    expect(regla(".boton:disabled")["background"]).toBe("var(--color-relleno)");
  });
  it("el enlace: texto de enlace, sin fondo, subrayado solo al pasar el dedo o el cursor", () => {
    const e = regla(".enlace");
    expect(e["color"]).toBe("var(--color-enlace)");
    expect(e["background"]).toBe("transparent");
    expect(e["text-decoration"]).toBe("none");
    expect(css).toMatch(/\.enlace:hover[^{]*\{[^}]*text-decoration:\s*underline/);
  });
});

describe("pestañas (sección 5, CA18)", () => {
  it("fila que se desplaza de lado, con línea fina inferior", () => {
    const p = regla(".pestanas");
    expect(p["overflow-x"]).toBe("auto");
    expect(p["border-bottom"]).toBe("1px solid var(--color-linea)");
  });
  it("cada pestaña es una pastilla de 14 px y peso 600 que no se encoge ni se corta", () => {
    const p = regla(".pestana");
    expect(p["border-radius"]).toBe("var(--radio-pastilla)");
    expect(p["font-size"]).toBe("var(--texto-pequeno)");
    expect(p["font-weight"]).toBe("var(--peso-fuerte)");
    expect(p["white-space"]).toBe("nowrap");
    expect(p["flex"]).toBe("0 0 auto");
    expect(p["background"]).toBe("transparent");
    expect(p["color"]).toBe("var(--color-texto)");
  });
  it("la activa: fondo azul de acción y texto sobre-acción", () => {
    const a = regla(".pestana--activa");
    expect(a["background"]).toBe("var(--color-accion)");
    expect(a["color"]).toBe("var(--color-sobre-accion)");
  });
  it("no se imprimen", () => {
    expect(css).toMatch(/@media print\s*\{[^}]*\.pestanas\s*\{[^}]*display:\s*none/);
  });
});

describe("campos (sección 5, CA20)", () => {
  it("etiqueta de 14 px en gris suave arriba", () => {
    const e = regla(".campo__etiqueta");
    expect(e["font-size"]).toBe("var(--texto-pequeno)");
    expect(e["color"]).toBe("var(--color-texto-suave)");
  });
  it("campo con radio de 8 px, borde fino, fondo lienzo y letra de 17 px", () => {
    const c = regla(".campo__control");
    expect(c["border-radius"]).toBe("var(--radio-caja)");
    expect(c["border"]).toBe("1px solid var(--color-linea)");
    expect(c["background"]).toBe("var(--color-lienzo)");
    expect(c["font-size"]).toBe("var(--texto-cuerpo)");
  });
  it("la letra de los campos es de 16 px o más, para que el iPhone no haga zoom (CA20)", () => {
    const tamano = Number(/--texto-cuerpo:\s*(\d+)px/.exec(leer("src/ui/estilo/tokens.css"))![1]);
    expect(tamano).toBeGreaterThanOrEqual(16);
  });
  it("el select conserva su apariencia nativa: sin ella el iPhone le quita la flecha y no se nota que es una lista", () => {
    expect(css).toMatch(/select\.campo__control\s*\{[^}]*appearance:\s*auto/);
  });
  it("al enfocar: aro de 2 px de acción", () => {
    expect(css).toMatch(/\.campo__control:focus[^{]*\{[^}]*outline:\s*2px solid var\(--color-accion\)/);
  });
});

describe("filas de lista (sección 5)", () => {
  it("una línea fina de 1 px entre filas y sin fondo ni tarjeta", () => {
    const f = regla(".fila-lista");
    expect(f["border-bottom"]).toBe("1px solid var(--color-linea)");
    expect(f["background"] ?? "none").toMatch(/none|transparent/);
  });
  it("fecha en caption suave, título de 17 px, horas a la derecha en peso 600", () => {
    expect(regla(".fila-lista__fecha")["font-size"]).toBe("var(--texto-caption)");
    expect(regla(".fila-lista__fecha")["color"]).toBe("var(--color-texto-suave)");
    expect(regla(".fila-lista__titulo")["font-size"]).toBe("var(--texto-cuerpo)");
    expect(regla(".fila-lista__valor")["font-weight"]).toBe("var(--peso-fuerte)");
    expect(regla(".fila-lista__valor")["font-size"]).toBe("var(--texto-cuerpo)");
  });
});

describe("barra de avance, interruptor y diálogo (sección 5)", () => {
  it("barra: 6 px de alto, pastilla, pista de relleno y relleno decorativo", () => {
    const b = regla(".barra-avance");
    expect(b["height"]).toBe("var(--barra-alto)");
    expect(b["border-radius"]).toBe("var(--radio-pastilla)");
    expect(b["background"]).toBe("var(--color-relleno)");
    expect(regla(".barra-avance__relleno")["background"]).toBe("var(--color-decorativo)");
  });
  it("interruptor: apagado en relleno, encendido en acción", () => {
    expect(regla(".interruptor__pista")["background"]).toBe("var(--color-relleno)");
    expect(regla(".interruptor--encendido .interruptor__pista")["background"]).toBe("var(--color-accion)");
  });
  it("diálogo: velo de 40 % con el color del texto, hoja de lienzo con borde fino y radio de 8 px", () => {
    const v = regla(".dialogo__velo");
    expect(v["background"]).toBe("var(--color-texto)");
    expect(v["opacity"]).toBe("0.4");
    const h = regla(".dialogo__hoja");
    expect(h["background"]).toBe("var(--color-lienzo)");
    expect(h["border"]).toBe("1px solid var(--color-linea)");
    expect(h["border-radius"]).toBe("var(--radio-caja)");
  });
});

describe("lo que el documento prohíbe (sección 7)", () => {
  it("sin sombras ni degradados", () => {
    expect(css).not.toMatch(/shadow/i);
    expect(css).not.toMatch(/gradient/i);
  });
  it("sin tema oscuro", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
  });
  it("sin ningún color, radio, peso o tamaño de letra fuera de los tokens (modo estricto)", () => {
    const archivos = leerArchivosDelProyecto(RAIZ).filter((a: { ruta: string }) =>
      /ui\/estilo\/(tokens|global|componentes)\.css$/.test(a.ruta) || /ui\/componentes\/.*\.tsx$/.test(a.ruta),
    );
    expect(archivos.map((a: { ruta: string }) => a.ruta)).toContain("src/ui/estilo/componentes.css");
    const { errores } = revisarEstilo(archivos, { estricto: true });
    expect(errores.map((h: { ruta: string; linea: number; mensaje: string }) => `${h.ruta}:${h.linea} ${h.mensaje}`)).toEqual([]);
  });
});
