import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerArchivosDelProyecto, revisarEstilo } from "../scripts/check-estilo.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const TOKENS = `
:root {
  --texto: #1F2A2E;
  --accion: #2F7480;
  --esp-8: 8px;
  --radio-tarjeta: 24px;
  --radio-campo: 12px;
  --radio-pastilla: 999px;
  --tam-cuerpo: 1.0625rem;
  --sombra: 0 10px 30px rgba(60,90,100,.10);
  --sombra-accion: 0 8px 20px rgba(47,116,128,.30);
  --degradado-accion: linear-gradient(135deg, var(--accion), var(--texto));
  --desenfoque: 20px;
  --transicion: 180ms;
}
@media print { :root { --texto: #000; } }
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
  it("no falla con var(--…) definidos en tokens.css", () => {
    const r = revisar([css("a { color: var(--texto); background: var(--accion); border: 1px solid var(--texto); }")]);
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
    const r = revisar([css("/* antes era #fff */\na { color: var(--texto); } /* rgb(0 0 0) */"), tsx("// #fff\n/* rgba(0,0,0,.5) */\nconst a = 1;")]);
    expect(r.errores).toEqual([]);
  });
  it("detecta colores en TypeScript y en estilos en línea", () => {
    expect(categorias(revisar([tsx('const c = "#2F7480";')]))).toEqual(["color"]);
    expect(categorias(revisar([tsx('<div style={{ color: "red" }} />')]))).toEqual(["color"]);
    expect(categorias(revisar([tsx("<div style={{ background: 'rgb(1,2,3)' }} />")]))).toEqual(["color"]);
  });
  it("no confunde texto normal de la interfaz con un color", () => {
    const r = revisar([tsx('const t = "Debo a la clínica"; const n = "color rojo"; const id = "#root";')]);
    expect(r.errores).toEqual([]);
  });
  it("indica la línea correcta", () => {
    const r = revisar([css("a { color: var(--texto); }\n\nb {\n  background: #123456;\n}")]);
    expect(r.errores[0].linea).toBe(4);
  });
});

describe("variables que no existen", () => {
  it("falla con una variable var(--…) que no está definida", () => {
    const r = revisar([css("a { color: var(--inventada); }")]);
    expect(categorias(r)).toEqual(["variable"]);
    expect(r.errores[0].mensaje).toContain("--inventada");
  });
  it("acepta una variable definida en otro archivo CSS", () => {
    const r = revisar([css("a { color: var(--puente); }"), css(":root { --puente: var(--texto); }", "src/ui/estilo/puente.css")]);
    expect(r.errores).toEqual([]);
  });
  it("un color de respaldo suelto dentro de var() también falla", () => {
    expect(categorias(revisar([css("a { color: var(--texto, #fff); }")]))).toEqual(["color"]);
  });
});

describe("reglas del documento de estilo (avisos hasta T42, errores en modo estricto)", () => {
  const casos: [string, string][] = [
    // sombras: solo las del documento, por su variable
    ["sombra", "a { box-shadow: 0 1px 2px var(--texto); }"],
    ["sombra", "a { box-shadow: 0 10px 30px var(--accion); }"],
    ["sombra", "a { text-shadow: 0 0 1px var(--texto); }"],
    ["sombra", "a { filter: drop-shadow(0 0 1px var(--texto)); }"],
    // degradados: solo los que salen de una variable
    ["degradado", "a { background: linear-gradient(90deg, var(--accion), var(--texto)); }"],
    ["degradado", "a { background-image: radial-gradient(circle, var(--accion), transparent); }"],
    ["tema-oscuro", "@media (prefers-color-scheme: dark) { a { color: var(--texto); } }"],
    ["peso", "a { font-weight: 700; }"],
    ["peso", "a { font-weight: bold; }"],
    ["peso", "a { font-weight: 300; }"],
    ["radio", "a { border-radius: 10px; }"],
    ["radio", "a { border-radius: 50%; }"],
    ["radio", "a { border-radius: 8px; }"],
    ["radio", "a { border-top-left-radius: 28px; }"],
    ["tamano-letra", "a { font-size: 1rem; }"],
    ["tamano-letra", "a { font-size: 17px; }"],
    // vidrio: solo con la variable del desenfoque, nunca en el fondo ni en las filas de una lista
    ["vidrio", ".tarjeta { backdrop-filter: blur(20px); }"],
    ["vidrio", "body { backdrop-filter: blur(var(--desenfoque)); }"],
    ["vidrio", ".fila-lista { backdrop-filter: blur(var(--desenfoque)); }"],
    // movimiento: solo el reloj de arena y las transiciones de la variable
    ["movimiento", "a { transition: opacity 300ms; }"],
    ["movimiento", "a { animation: pulso 1s infinite; }"],
  ];
  it.each(casos)("%s: %s", (categoria, codigo) => {
    const normal = revisar([css(codigo)]);
    expect(normal.errores).toEqual([]);
    expect(normal.avisos.map((h: { categoria: string }) => h.categoria)).toEqual([categoria]);
    const estricto = revisar([css(codigo)], { estricto: true });
    expect(estricto.errores.map((h: { categoria: string }) => h.categoria)).toEqual([categoria]);
    expect(estricto.avisos).toEqual([]);
  });
  it("permite las sombras que salen de las variables del documento, o ninguna", () => {
    for (const v of ["var(--sombra)", "var(--sombra-accion)", "none", "inherit"]) {
      expect(revisar([css(`a { box-shadow: ${v}; }`)], { estricto: true }).errores, v).toEqual([]);
    }
  });
  it("permite degradados que salen de una variable", () => {
    const r = revisar([css("a { background: var(--degradado-accion); }")], { estricto: true });
    expect(r.errores).toEqual([]);
  });
  it("permite los pesos 400, 500 y 600", () => {
    for (const w of ["400", "500", "600", "normal", "inherit"]) {
      expect(revisar([css(`a { font-weight: ${w}; }`)], { estricto: true }).errores, w).toEqual([]);
    }
  });
  it("permite los radios del documento", () => {
    for (const r of ["0", "var(--radio-tarjeta)", "var(--radio-campo)", "var(--radio-pastilla)", "var(--radio-campo) var(--radio-campo) 0 0"]) {
      expect(revisar([css(`a { border-radius: ${r}; }`)], { estricto: true }).errores, r).toEqual([]);
    }
  });
  it("permite tamaños de letra tomados de los tokens", () => {
    for (const s of ["var(--tam-cuerpo)", "inherit", "100%"]) {
      expect(revisar([css(`a { font-size: ${s}; }`)], { estricto: true }).errores, s).toEqual([]);
    }
  });
  it("permite el vidrio en una tarjeta con la variable del desenfoque", () => {
    const r = revisar([css(".tarjeta { backdrop-filter: blur(var(--desenfoque)); -webkit-backdrop-filter: blur(var(--desenfoque)); }")], { estricto: true });
    expect(r.errores).toEqual([]);
  });
  it("permite las transiciones con la variable y la animación del reloj de arena", () => {
    const r = revisar(
      [
        css(
          [
            "a { transition: transform var(--transicion), opacity var(--transicion); }",
            ".reloj-arena__vidrio { animation: giro 5s infinite; }",
            "@keyframes giro { 0% { opacity: 1; } }",
          ].join("\n"),
        ),
      ],
      { estricto: true },
    );
    expect(r.errores).toEqual([]);
  });
  it("no confunde una variable personalizada con la propiedad", () => {
    const r = revisar([css(":root { --mi-font-size: 1rem; --mi-box-shadow: 0 1px 2px red; }")], { estricto: true });
    expect(r.errores).toEqual([]);
  });
  it("los colores siguen siendo error aunque no sea modo estricto", () => {
    expect(revisar([css("a { color: #fff; box-shadow: none; }")]).errores).toHaveLength(1);
  });
  it("tokens.css puede definir sombras y degradados (ahí nacen las variables)", () => {
    expect(revisarEstilo([tokens], { estricto: true }).errores).toEqual([]);
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
