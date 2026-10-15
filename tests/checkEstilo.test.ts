import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerArchivosDelProyecto, revisarEstilo } from "../scripts/check-estilo.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const TOKENS = `
:root {
  --color-texto: #1d1d1f;
  --color-accion: #0071e3;
  --esp-8: 8px;
  --radio-caja: 8px;
  --radio-pastilla: 980px;
  --texto-cuerpo: 17px;
}
@media print { :root { --color-texto: #000; } }
`;
const tokens = { ruta: "src/ui/estilo/tokens.css", contenido: TOKENS };
const css = (contenido: string, ruta = "src/ui/x.css") => ({ ruta, contenido });
const tsx = (contenido: string, ruta = "src/ui/x.tsx") => ({ ruta, contenido });

function revisar(archivos: { ruta: string; contenido: string }[], opciones?: { estricto?: boolean }) {
  return revisarEstilo([tokens, ...archivos], opciones);
}
const categorias = (r: { errores: { categoria: string }[] }) => r.errores.map((h) => h.categoria);

describe("CA16: colores que no están en tokens.css", () => {
  it("falla con un color hexadecimal suelto", () => {
    const r = revisar([css("a { color: #fff; }")]);
    expect(categorias(r)).toEqual(["color"]);
    expect(r.errores[0]).toMatchObject({ ruta: "src/ui/x.css", linea: 1 });
  });
  it("detecta hexadecimales de 3, 4, 6 y 8 dígitos", () => {
    for (const hex of ["#fff", "#ffff", "#ffffff", "#ffffffff", "#AbC123"]) {
      expect(categorias(revisar([css(`a { color: ${hex}; }`)])), hex).toEqual(["color"]);
    }
  });
  it("falla con rgb, rgba, hsl y otras funciones de color", () => {
    for (const f of ["rgb(0 0 0)", "rgba(0, 0, 0, 0.5)", "hsl(0 0% 0%)", "hsla(0,0%,0%,.2)", "oklch(0.5 0.1 200)"]) {
      expect(categorias(revisar([css(`a { background: ${f}; }`)])), f).toEqual(["color"]);
    }
    // color-mix con colores con nombre dentro: se marcan todos los colores sueltos
    const mezcla = categorias(revisar([css("a { background: color-mix(in srgb, red, blue); }")]));
    expect(mezcla.length).toBeGreaterThan(0);
    expect(new Set(mezcla)).toEqual(new Set(["color"]));
  });
  it("falla con un color con nombre en una propiedad de color", () => {
    for (const [prop, valor] of [["color", "red"], ["background", "white"], ["border", "1px solid black"], ["background-color", "Tomato"], ["outline", "2px solid blue"]]) {
      expect(categorias(revisar([css(`a { ${prop}: ${valor}; }`)])), `${prop}: ${valor}`).toEqual(["color"]);
    }
  });
  it("falla con un color con nombre dentro de un degradado de máscara", () => {
    expect(categorias(revisar([css("a { mask-image: linear-gradient(to right, black, transparent); }")]))).toEqual(["color"]);
  });
  it("no falla con var(--color-…) definidos en tokens.css", () => {
    const r = revisar([css("a { color: var(--color-texto); background: var(--color-accion); border: 1px solid var(--color-texto); }")]);
    expect(r.errores).toEqual([]);
  });
  it("permite transparent, currentColor, inherit, initial y none", () => {
    const r = revisar([css("a { color: inherit; background: transparent; border-color: currentColor; outline: none; fill: initial; }")]);
    expect(r.errores).toEqual([]);
  });
  it("los colores de tokens.css no cuentan como sueltos (ahí se definen)", () => {
    expect(revisarEstilo([tokens]).errores).toEqual([]);
  });
  it("ignora lo que está en comentarios", () => {
    const r = revisar([css("/* antes era #fff */\na { color: var(--color-texto); } /* rgb(0 0 0) */"), tsx("// #fff\n/* rgba(0,0,0,.5) */\nconst a = 1;")]);
    expect(r.errores).toEqual([]);
  });
  it("detecta colores en TypeScript y en estilos en línea", () => {
    expect(categorias(revisar([tsx('const c = "#0071e3";')]))).toEqual(["color"]);
    expect(categorias(revisar([tsx('<div style={{ color: "red" }} />')]))).toEqual(["color"]);
    expect(categorias(revisar([tsx("<div style={{ background: 'rgb(1,2,3)' }} />")]))).toEqual(["color"]);
  });
  it("no confunde texto normal de la interfaz con un color", () => {
    const r = revisar([tsx('const t = "Debo a la clínica"; const n = "color rojo"; const id = "#root";')]);
    expect(r.errores).toEqual([]);
  });
  it("indica la línea correcta", () => {
    const r = revisar([css("a { color: var(--color-texto); }\n\nb {\n  background: #123456;\n}")]);
    expect(r.errores[0].linea).toBe(4);
  });
});

describe("variables que no existen", () => {
  it("falla con un var(--color-…) que no está definido", () => {
    const r = revisar([css("a { color: var(--color-inventado); }")]);
    expect(categorias(r)).toEqual(["variable"]);
    expect(r.errores[0].mensaje).toContain("--color-inventado");
  });
  it("acepta una variable definida en otro archivo CSS", () => {
    const r = revisar([css("a { color: var(--puente); }"), css(":root { --puente: var(--color-texto); }", "src/ui/estilo/puente.css")]);
    expect(r.errores).toEqual([]);
  });
  it("un color de respaldo suelto dentro de var() también falla", () => {
    expect(categorias(revisar([css("a { color: var(--color-texto, #fff); }")]))).toEqual(["color"]);
  });
});

describe("reglas del documento de estilo (avisos hasta T20, errores en modo estricto)", () => {
  const casos: [string, string, string][] = [
    ["sombra", "a { box-shadow: 0 1px 2px var(--color-texto); }", "box-shadow"],
    ["sombra", "a { text-shadow: 0 0 1px var(--color-texto); }", "text-shadow"],
    ["sombra", "a { filter: drop-shadow(0 0 1px var(--color-texto)); }", "drop-shadow"],
    ["tema-oscuro", "@media (prefers-color-scheme: dark) { a { color: var(--color-texto); } }", "tema oscuro"],
    ["peso", "a { font-weight: 700; }", "700"],
    ["peso", "a { font-weight: bold; }", "bold"],
    ["peso", "a { font-weight: 900; }", "900"],
    ["radio", "a { border-radius: 10px; }", "radio"],
    ["radio", "a { border-radius: 50%; }", "radio"],
    ["radio", "a { border-top-left-radius: 28px; }", "radio"],
    ["tamano-letra", "a { font-size: 1rem; }", "tamaño"],
    ["tamano-letra", "a { font-size: 17px; }", "tamaño"],
  ];
  it.each(casos)("%s: %s", (categoria, codigo) => {
    const normal = revisar([css(codigo)]);
    expect(normal.errores).toEqual([]);
    expect(normal.avisos.map((h: { categoria: string }) => h.categoria)).toEqual([categoria]);
    const estricto = revisar([css(codigo)], { estricto: true });
    expect(estricto.errores.map((h: { categoria: string }) => h.categoria)).toEqual([categoria]);
    expect(estricto.avisos).toEqual([]);
  });
  it("permite los pesos 300, 400 y 600", () => {
    for (const w of ["300", "400", "600", "normal"]) expect(revisar([css(`a { font-weight: ${w}; }`)], { estricto: true }).errores, w).toEqual([]);
  });
  it("permite los radios del documento", () => {
    for (const r of ["8px", "980px", "0", "var(--radio-caja)", "var(--radio-pastilla)"]) {
      expect(revisar([css(`a { border-radius: ${r}; }`)], { estricto: true }).errores, r).toEqual([]);
    }
  });
  it("permite tamaños de letra tomados de los tokens", () => {
    for (const s of ["var(--texto-cuerpo)", "inherit", "100%"]) {
      expect(revisar([css(`a { font-size: ${s}; }`)], { estricto: true }).errores, s).toEqual([]);
    }
  });
  it("no confunde una variable personalizada con la propiedad", () => {
    const r = revisar([css(":root { --mi-font-size: 1rem; --mi-box-shadow: none; }")], { estricto: true });
    expect(r.errores).toEqual([]);
  });
  it("los colores siguen siendo error aunque no sea modo estricto", () => {
    expect(revisar([css("a { color: #fff; box-shadow: none; }")]).errores).toHaveLength(1);
  });
});

describe("CA16 sobre el proyecto real", () => {
  const archivos = leerArchivosDelProyecto(RAIZ);

  it("revisa los CSS, TS y TSX de src y el index.html", () => {
    const rutas = archivos.map((a: { ruta: string }) => a.ruta.replace(/\\/g, "/"));
    expect(rutas).toContain("src/ui/estilo/tokens.css");
    expect(rutas).toContain("src/App.tsx");
    expect(rutas).toContain("index.html");
    expect(rutas.some((r: string) => r.includes("node_modules"))).toBe(false);
  });

  it("no hay ningún color suelto ni variable inexistente fuera de tokens.css", () => {
    const { errores } = revisarEstilo(archivos);
    expect(errores.map((h: { ruta: string; linea: number; mensaje: string }) => `${h.ruta}:${h.linea} ${h.mensaje}`)).toEqual([]);
  });
});
