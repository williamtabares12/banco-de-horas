// T42: tokens.css y estilos globales del estilo de vidrio (estilo-visual.md, secciones 2 a 5 y 10).
// Reescrita desde la versión del estilo anterior (azul, sin sombras): misma intención, valores nuevos.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

const tokens = leer("src/ui/estilo/tokens.css");
// El bloque principal de :root, sin los @media / @supports que lo ajustan
const base = tokens.slice(0, tokens.search(/@media|@supports/));
const impresion = tokens.slice(tokens.indexOf("@media print"));

/** Valor de una variable personalizada en un bloque de CSS. */
function variable(bloque: string, nombre: string): string | undefined {
  return new RegExp(`${nombre}\\s*:\\s*([^;]+);`).exec(bloque)?.[1].trim();
}

// La tabla de colores de estilo-visual.md, sección 2 (y la 10)
const COLORES = {
  "--fondo-base": "#B9D2D2",
  "--fondo-lila": "#C9C3E6",
  "--fondo-claro": "#DDEAE6",
  "--vidrio": "rgba(255,255,255,.55)",
  "--vidrio-borde": "rgba(255,255,255,.65)",
  "--vidrio-solido": "#E4ECEC",
  "--texto": "#1F2A2E",
  "--texto-suave": "#566366",
  "--accion": "#2F7480",
  "--accion-clara": "#3D8B94",
  "--enlace": "#256A74",
  "--aviso": "#B3364C",
  "--linea": "rgba(0,0,0,.08)",
  "--relleno": "rgba(31,42,46,.10)",
  "--velo": "rgba(0,0,0,.40)",
  "--sobre-accion": "#FFFFFF",
};

// --- Contraste (CA19) ---
type RGB = [number, number, number];
const aRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const luminancia = ([r, g, b]: RGB) => {
  const [R, G, B] = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};
const contraste = (a: RGB, b: RGB) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mezclar = (frente: RGB, alfa: number, fondo: RGB): RGB => frente.map((v, i) => Math.round(alfa * v + (1 - alfa) * fondo[i])) as RGB;
const c = (nombre: keyof typeof COLORES) => aRgb(COLORES[nombre]);

const FONDOS = { base: c("--fondo-base"), lila: c("--fondo-lila"), claro: c("--fondo-claro") };
const TARJETAS = Object.fromEntries(Object.entries(FONDOS).map(([k, f]) => [k, mezclar([255, 255, 255], 0.55, f)])) as Record<string, RGB>;

describe("tokens.css: lo que define estilo-visual.md", () => {
  it("define los colores con los valores exactos del documento", () => {
    for (const [nombre, valor] of Object.entries(COLORES)) expect(variable(base, nombre), nombre).toBe(valor);
  });

  it("define las sombras con los valores exactos del documento", () => {
    expect(variable(base, "--sombra")).toBe("0 10px 30px rgba(60,90,100,.10)");
    expect(variable(base, "--sombra-accion")).toBe("0 8px 20px rgba(47,116,128,.30)");
  });

  it("los degradados salen de variables: botón y fondo de la app", () => {
    expect(variable(base, "--degradado-accion")).toMatch(/^linear-gradient\(.*var\(--accion-clara\).*var\(--accion\)/);
    const fondo = variable(base, "--fondo-app")!;
    expect(fondo).toContain("radial-gradient(120% 70% at 0% 0%, var(--fondo-claro) 0%, transparent 60%)");
    expect(fondo).toContain("radial-gradient(90% 60% at 100% 35%, var(--fondo-lila) 0%, transparent 65%)");
    expect(fondo).toMatch(/var\(--fondo-base\)$/);
  });

  it("los colores de los íconos de KPI son los del documento (violeta para lo prestado, verde azulado para lo pagado)", () => {
    expect(variable(base, "--kpi-violeta-claro")).toBe("#B7A8FA");
    expect(variable(base, "--kpi-violeta")).toBe("#8E7CF0");
    expect(variable(base, "--kpi-verde-claro")).toBe("#8FC9C9");
  });

  it("no define ningún otro color fuera de los del documento", () => {
    const hex = [...base.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toUpperCase());
    const esperados = [...Object.values(COLORES).filter((v) => v.startsWith("#")), "#B7A8FA", "#8E7CF0", "#8FC9C9"].map((v) => v.toUpperCase());
    expect(hex.sort()).toEqual(esperados.sort());
  });

  it("la letra es la que pide el documento: SF Pro en Apple e Inter, si el teléfono la tiene, en Android", () => {
    expect(variable(base, "--fuente")).toBe('-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif');
  });

  it("no descarga ninguna fuente: sin @font-face ni url()", () => {
    expect(tokens).not.toMatch(/@font-face/);
    expect(tokens).not.toMatch(/url\(/);
  });

  it("define los espacios permitidos (4, 8, 12, 16, 20, 24, 40, 48, 56)", () => {
    for (const n of [4, 8, 12, 16, 20, 24, 40, 48, 56]) expect(variable(base, `--esp-${n}`), `--esp-${n}`).toBe(`${n}px`);
  });

  it("define solo los tres radios del documento: tarjeta 24, campo 12, pastilla 999", () => {
    expect(variable(base, "--radio-tarjeta")).toBe("24px");
    expect(variable(base, "--radio-campo")).toBe("12px");
    expect(variable(base, "--radio-pastilla")).toBe("999px");
    expect([...base.matchAll(/--radio-[a-z-]+/g)].map((m) => m[0]).sort()).toEqual(["--radio-campo", "--radio-pastilla", "--radio-tarjeta"]);
  });

  it("define la escala de tamaños de letra de la sección 3, en rem (respeta el tamaño de letra del teléfono)", () => {
    const rem = (px: number) => `${px / 16}rem`;
    const esperado: Record<string, number> = {
      "--tam-etiqueta": 11,
      "--tam-caption": 13,
      "--tam-pequeno": 14,
      "--tam-cuerpo": 17,
      "--tam-unidad-kpi": 16,
      "--tam-unidad": 18,
      "--tam-pantalla": 22,
      "--tam-seccion": 28,
      "--tam-cifra-kpi": 28,
      "--tam-cifra": 44,
    };
    for (const [nombre, px] of Object.entries(esperado)) expect(variable(base, nombre), nombre).toBe(rem(px));
  });

  it("define las medidas de los componentes: zona táctil, botón principal, barra de avance, ícono de KPI y desenfoque", () => {
    expect(variable(base, "--zona-tactil")).toBe("44px");
    expect(variable(base, "--boton-alto")).toBe("48px");
    expect(variable(base, "--barra-alto")).toBe("6px");
    expect(variable(base, "--kpi-icono")).toBe("36px");
    expect(variable(base, "--desenfoque")).toBe("20px");
  });

  it("define los pesos permitidos: 400, 500 y 600, nunca 700", () => {
    expect(variable(base, "--peso-normal")).toBe("400");
    expect(variable(base, "--peso-medio")).toBe("500");
    expect(variable(base, "--peso-fuerte")).toBe("600");
    expect(tokens).not.toMatch(/--peso-[a-z-]+:\s*(300|700|800|900)/);
  });

  it("define el interlineado (1,45 en el cuerpo) y la transición de 150 a 200 ms", () => {
    expect(variable(base, "--interlinea")).toBe("1.45");
    const ms = Number(/^(\d+)ms$/.exec(variable(base, "--transicion") ?? "")?.[1]);
    expect(ms).toBeGreaterThanOrEqual(150);
    expect(ms).toBeLessThanOrEqual(200);
  });
});

describe("CA19: contraste de 4,5 a 1 sobre el fondo real", () => {
  it("el texto sobre una tarjeta de vidrio (blanco al 55 % sobre el degradado), en las tres zonas del fondo", () => {
    for (const [zona, tarjeta] of Object.entries(TARJETAS)) {
      for (const nombre of ["--texto", "--texto-suave", "--enlace", "--aviso"] as const) {
        expect(contraste(c(nombre), tarjeta), `${nombre} sobre tarjeta (${zona})`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("el texto sobre el respaldo sólido (sin vidrio)", () => {
    for (const nombre of ["--texto", "--texto-suave", "--enlace", "--aviso"] as const) {
      expect(contraste(c(nombre), c("--vidrio-solido")), nombre).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el texto principal también cumple directamente sobre el degradado, sin tarjeta", () => {
    for (const [zona, fondo] of Object.entries(FONDOS)) expect(contraste(c("--texto"), fondo), zona).toBeGreaterThanOrEqual(4.5);
  });

  it("pero el texto suave y el de enlace NO llegan sobre el degradado: por eso fuera de una tarjeta se usa --texto", () => {
    expect(contraste(c("--texto-suave"), FONDOS.base)).toBeLessThan(4.5);
    expect(contraste(c("--enlace"), FONDOS.base)).toBeLessThan(4.5);
    expect(contraste(c("--aviso"), FONDOS.lila)).toBeLessThan(4.5);
  });

  it("el texto blanco sobre el degradado de los botones cumple desde donde empieza el texto (el extremo claro queda en la esquina)", () => {
    const grad = variable(base, "--degradado-accion")!;
    const parada = Number(/var\(--accion\)\s+(\d+)%/.exec(grad)?.[1]) / 100; // dónde el degradado ya es del color oscuro
    const t = 0.15; // el texto nunca empieza antes de este punto del degradado, ni en la pastilla más chica
    const mezcla = mezclar(c("--accion"), Math.min(1, t / parada), c("--accion-clara"));
    expect(contraste([255, 255, 255], mezcla)).toBeGreaterThanOrEqual(4.5);
    expect(contraste([255, 255, 255], c("--accion"))).toBeGreaterThanOrEqual(4.5);
  });

  it("la guía original no llegaba: el gris #7C8A8D y el verde #3D8B94 con texto blanco", () => {
    expect(contraste(aRgb("#7C8A8D"), TARJETAS.base)).toBeLessThan(4.5);
    expect(contraste([255, 255, 255], c("--accion-clara"))).toBeLessThan(4.5);
  });
});

describe("tokens.css: vidrio sin romper celulares viejos (CA26)", () => {
  it("sin soporte de backdrop-filter, las tarjetas usan el fondo sólido", () => {
    const bloque = /@supports not[\s\S]*?\n\}/.exec(tokens)?.[0] ?? ""; // la condición y su contenido
    expect(bloque).toMatch(/backdrop-filter/);
    expect(bloque).toMatch(/--vidrio:\s*var\(--vidrio-solido\)/);
    // el iPhone con iOS 17 o anterior solo entiende la versión con prefijo: no debe caer al sólido por error
    expect(bloque).toMatch(/-webkit-backdrop-filter/);
  });

  it("con 'reducir transparencia', también", () => {
    const bloque = /@media \(prefers-reduced-transparency: reduce\)\s*\{([\s\S]*?)\n\}/.exec(tokens)?.[1] ?? "";
    expect(bloque).toMatch(/--vidrio:\s*var\(--vidrio-solido\)/);
    expect(bloque).toMatch(/--desenfoque:\s*0px/);
  });
});

describe("tokens.css: impresión (CA21)", () => {
  it("al imprimir, fondo blanco y todo en blanco y negro", () => {
    expect(impresion).toMatch(/@media print/);
    expect(variable(impresion, "--fondo-app")).toBe("#fff");
    expect(variable(impresion, "--texto")).toBe("#000");
    expect(variable(impresion, "--linea")).toBe("#000");
  });

  it("al imprimir no queda nada de color, vidrio, sombra ni degradado", () => {
    for (const nombre of ["--accion", "--accion-clara", "--enlace", "--aviso", "--texto-suave"]) {
      expect(variable(impresion, nombre), nombre).toBe("#000");
    }
    expect(variable(impresion, "--vidrio")).toBe("#fff");
    expect(variable(impresion, "--sombra")).toBe("none");
    expect(variable(impresion, "--sombra-accion")).toBe("none");
    expect(variable(impresion, "--degradado-accion")).toBe("#000");
    expect(variable(impresion, "--desenfoque")).toBe("0px");
  });

  it("los colores de impresión son solo blanco y negro", () => {
    const colores = [...impresion.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    expect(colores.length).toBeGreaterThan(0);
    for (const col of colores) expect(["#fff", "#ffffff", "#000", "#000000"]).toContain(col);
    expect(impresion).not.toMatch(/rgba?\(/);
  });
});

describe("estilos globales", () => {
  const global = leer("src/ui/estilo/global.css");

  it("fondo en degradado, letra del documento, 17 px de base y cifras tabulares", () => {
    expect(global).toMatch(/background:\s*var\(--fondo-app\)/);
    expect(global).toMatch(/color:\s*var\(--texto\)/);
    expect(global).toMatch(/font-family:\s*var\(--fuente\)/);
    expect(global).toMatch(/font-size:\s*var\(--tam-cuerpo\)/);
    expect(global).toMatch(/line-height:\s*var\(--interlinea\)/);
    expect(global).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(global).toMatch(/min-height:\s*100dvh/);
  });

  it("solo tema claro: sin tema oscuro", () => {
    expect(global).toMatch(/color-scheme:\s*light/);
    for (const css of [global, tokens, leer("src/ui/estilo/componentes.css"), leer("src/ui/estilo/pantallas.css")]) {
      expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
    }
  });

  it("se carga antes que los estilos de las pantallas", () => {
    const main = leer("src/main.tsx");
    const iTokens = main.indexOf("ui/estilo/tokens.css");
    const iGlobal = main.indexOf("ui/estilo/global.css");
    expect(iTokens).toBeGreaterThanOrEqual(0);
    expect(iGlobal).toBeGreaterThan(iTokens);
    expect(main).not.toMatch(/index\.css/);
  });
});

describe("color de tema de la app instalada", () => {
  const fondo = COLORES["--fondo-base"];

  it("la etiqueta meta usa el color base del fondo", () => {
    expect(leer("index.html")).toMatch(new RegExp(`<meta name="theme-color" content="${fondo}"`, "i"));
  });

  it("el manifiesto usa ese color para el tema y el fondo de arranque", () => {
    const config = leer("vite.config.ts");
    expect(config).toMatch(new RegExp(`theme_color:\\s*'${fondo}'`, "i"));
    expect(config).toMatch(new RegExp(`background_color:\\s*'${fondo}'`, "i"));
  });
});

describe("sin fuentes descargadas", () => {
  it("no queda la fuente Inter empaquetada", () => {
    const paquete = JSON.parse(leer("package.json"));
    const dependencias = { ...paquete.dependencies, ...paquete.devDependencies };
    expect(Object.keys(dependencias).filter((n) => n.includes("fontsource"))).toEqual([]);
    expect(existsSync(join(RAIZ, "src/index.css"))).toBe(false);
  });

  it("el service worker ya no guarda archivos de fuentes", () => {
    expect(leer("vite.config.ts")).not.toMatch(/woff2/);
  });
});

describe("el verificador de estilo", () => {
  it("está disponible como npm run check:estilo", () => {
    const paquete = JSON.parse(leer("package.json"));
    expect(paquete.scripts["check:estilo"]).toMatch(/scripts\/check-estilo\.mjs/);
  });
});

// El ícono de la app (el reloj de arena, estilo-visual.md §8) se comprueba en tests/marcaArena.test.ts.
