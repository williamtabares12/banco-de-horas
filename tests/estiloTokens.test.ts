import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

const tokens = leer("src/ui/estilo/tokens.css");
// parte de :root, sin el bloque de impresión
const base = tokens.split("@media print")[0];
const impresion = tokens.slice(tokens.indexOf("@media print"));

/** Valor de una variable personalizada en un bloque de CSS. */
function variable(bloque: string, nombre: string): string | undefined {
  return new RegExp(`${nombre}\\s*:\\s*([^;]+);`).exec(bloque)?.[1].trim();
}

// La tabla de colores de estilo-visual.md, sección 2
const COLORES = {
  "--color-texto": "#1d1d1f",
  "--color-texto-suave": "#707070",
  "--color-lienzo": "#f5f5f7",
  "--color-realce": "#f4f8fb",
  "--color-relleno": "#e2e2e5",
  "--color-linea": "#d2d2d7",
  "--color-accion": "#0071e3",
  "--color-sobre-accion": "#ffffff",
  "--color-enlace": "#0066cc",
  "--color-decorativo": "#2997ff",
  "--color-icono": "#858585",
};

describe("tokens.css: lo que define estilo-visual.md", () => {
  it("define los once colores con los valores exactos del documento", () => {
    for (const [nombre, valor] of Object.entries(COLORES)) expect(variable(base, nombre), nombre).toBe(valor);
  });

  it("no define ningún otro color fuera del bloque de impresión", () => {
    const hex = [...base.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    expect(hex.sort()).toEqual(Object.values(COLORES).sort());
  });

  it("la letra es la del sistema, tal como la pide el documento", () => {
    expect(variable(base, "--fuente")).toBe('"SF Pro Text", -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif');
  });

  it("no descarga ninguna fuente: sin @font-face ni url()", () => {
    expect(tokens).not.toMatch(/@font-face/);
    expect(tokens).not.toMatch(/url\(/);
  });

  it("define los espacios permitidos (4, 8, 12, 16, 20, 24, 40, 48, 56)", () => {
    for (const n of [4, 8, 12, 16, 20, 24, 40, 48, 56]) expect(variable(base, `--esp-${n}`), `--esp-${n}`).toBe(`${n}px`);
  });

  it("define solo los dos radios del documento", () => {
    expect(variable(base, "--radio-pastilla")).toBe("980px");
    expect(variable(base, "--radio-caja")).toBe("8px");
    expect([...base.matchAll(/--radio-[a-z-]+/g)].map((m) => m[0]).sort()).toEqual(["--radio-caja", "--radio-pastilla"]);
  });

  it("define la escala de tamaños de letra de la sección 3", () => {
    expect(variable(base, "--texto-caption")).toBe("12px");
    expect(variable(base, "--texto-pequeno")).toBe("14px");
    expect(variable(base, "--texto-cuerpo")).toBe("17px");
    expect(variable(base, "--texto-subtitulo")).toBe("21px");
    expect(variable(base, "--texto-titulo")).toBe("28px");
    expect(variable(base, "--texto-cifra")).toBe("44px");
  });

  it("define las medidas de los componentes que da la sección 4 y 5: zona táctil, barra de avance y relleno del botón", () => {
    expect(variable(base, "--zona-tactil")).toBe("44px");
    expect(variable(base, "--barra-alto")).toBe("6px");
    expect(variable(base, "--relleno-boton")).toBe("11px 15px");
  });

  it("el texto sobre el azul de acción cumple 4,5 a 1 (CA19)", () => {
    const luminancia = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contraste = (a: string, b: string) => {
      const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    expect(contraste(COLORES["--color-sobre-accion"], COLORES["--color-accion"])).toBeGreaterThanOrEqual(4.5);
    // lo que el documento decía antes no llegaba
    expect(contraste(COLORES["--color-realce"], COLORES["--color-accion"])).toBeLessThan(4.5);
    // y el gris más claro permitido para texto sigue cumpliendo sobre el lienzo
    expect(contraste(COLORES["--color-texto-suave"], COLORES["--color-lienzo"])).toBeGreaterThanOrEqual(4.5);
  });

  it("define los pesos permitidos: 300, 400 y 600, nunca 700", () => {
    expect(variable(base, "--peso-ligero")).toBe("300");
    expect(variable(base, "--peso-normal")).toBe("400");
    expect(variable(base, "--peso-fuerte")).toBe("600");
    expect(tokens).not.toMatch(/--peso-[a-z-]+:\s*(700|800|900)/);
  });

  it("define interlineado y espaciado de letras de cada rol de la tabla", () => {
    const esperado: Record<string, [string, string]> = {
      caption: ["1.33", "-0.264px"],
      pequeno: ["1.29", "-0.224px"],
      cuerpo: ["1.47", "-0.272px"],
      subtitulo: ["1.24", "-0.105px"],
      titulo: ["1.18", "0.196px"],
      cifra: ["1.18", "-0.44px"],
    };
    for (const [rol, [interlinea, espaciado]] of Object.entries(esperado)) {
      expect(variable(base, `--interlinea-${rol}`), `interlinea ${rol}`).toBe(interlinea);
      expect(variable(base, `--espaciado-${rol}`), `espaciado ${rol}`).toBe(espaciado);
    }
  });
});

describe("tokens.css: impresión (CA21)", () => {
  it("al imprimir, fondo blanco y todo en blanco y negro", () => {
    expect(impresion).toMatch(/@media print/);
    expect(variable(impresion, "--color-lienzo")).toBe("#fff");
    expect(variable(impresion, "--color-texto")).toBe("#000");
  });

  it("al imprimir no queda nada de azul: acción, enlace y decorativo pasan a negro", () => {
    for (const nombre of ["--color-accion", "--color-enlace", "--color-decorativo", "--color-icono"]) {
      expect(variable(impresion, nombre), nombre).toBe("#000");
    }
    expect(variable(impresion, "--color-sobre-accion")).toBe("#fff");
  });

  it("los colores de impresión son solo blanco y negro", () => {
    const colores = [...impresion.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    expect(colores.length).toBeGreaterThan(0);
    for (const c of colores) expect(["#fff", "#ffffff", "#000", "#000000"]).toContain(c);
  });
});

describe("estilos globales", () => {
  const global = leer("src/ui/estilo/global.css");

  it("fondo lienzo, letra del sistema, 17 px de base y cifras tabulares", () => {
    expect(global).toMatch(/background:\s*var\(--color-lienzo\)/);
    expect(global).toMatch(/color:\s*var\(--color-texto\)/);
    expect(global).toMatch(/font-family:\s*var\(--fuente\)/);
    expect(global).toMatch(/font-size:\s*var\(--texto-cuerpo\)/);
    expect(global).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it("solo tema claro: sin tema oscuro", () => {
    expect(global).toMatch(/color-scheme:\s*light/);
    for (const css of [global, tokens, leer("src/App.css")]) expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
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
  const lienzo = COLORES["--color-lienzo"];

  it("la etiqueta meta usa el color del lienzo", () => {
    expect(leer("index.html")).toMatch(new RegExp(`<meta name="theme-color" content="${lienzo}"`, "i"));
  });

  it("el manifiesto usa el color del lienzo para el tema y el fondo de arranque", () => {
    const config = leer("vite.config.ts");
    expect(config).toMatch(new RegExp(`theme_color:\\s*'${lienzo}'`));
    expect(config).toMatch(new RegExp(`background_color:\\s*'${lienzo}'`));
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

describe("ícono de la app instalada", () => {
  /** Decodifica un PNG RGB de 8 bits sin entrelazado (el que genera el script de íconos). */
  function leerPng(ruta: string) {
    const bytes = readFileSync(join(RAIZ, ruta));
    let posicion = 8;
    let ancho = 0;
    const datos: Buffer[] = [];
    while (posicion < bytes.length) {
      const largo = bytes.readUInt32BE(posicion);
      const tipo = bytes.toString("ascii", posicion + 4, posicion + 8);
      const cuerpo = bytes.subarray(posicion + 8, posicion + 8 + largo);
      if (tipo === "IHDR") ancho = cuerpo.readUInt32BE(0);
      if (tipo === "IDAT") datos.push(cuerpo);
      posicion += 12 + largo;
    }
    const crudo = inflateSync(Buffer.concat(datos));
    const fila = 1 + ancho * 3;
    return {
      ancho,
      pixel: (x: number, y: number) => [0, 1, 2].map((c) => crudo[y * fila + 1 + x * 3 + c]),
    };
  }
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  for (const archivo of ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
    it(`${archivo}: fondo del azul de acción y reloj en el color de texto sobre acción`, () => {
      const png = leerPng(`public/${archivo}`);
      expect(png.pixel(0, 0)).toEqual(rgb(COLORES["--color-accion"]));
      expect(png.pixel(png.ancho - 1, png.ancho - 1)).toEqual(rgb(COLORES["--color-accion"]));
      // un punto del aro del reloj (a 31,5 % del ancho desde el centro, a la altura del centro)
      const centro = Math.floor(png.ancho / 2);
      const enElAro = centro - Math.round(png.ancho * 0.315);
      expect(png.pixel(enElAro, centro)).toEqual(rgb(COLORES["--color-sobre-accion"]));
    });
  }
});
