// T43 / RF-C25 / CC25: la firma de autor. El monograma AT es decorativo y el texto "Hecho por Alejandro Tabares · v…" es
// texto real. Va en "Acerca de" y al pie del inicio de sesión; no va en el extracto, ni en el PDF, ni en la pantalla de carga.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Firma } from "../src/ui/componentes/Firma";
import { Acerca } from "../src/ui/nube/Acerca";
import { Acceso } from "../src/ui/nube/Acceso";
import { CargaVisible } from "../src/ui/PantallaDeCarga";
import { Extracto } from "../src/ui/pantallas/Extracto";
import { construirExtractoPdf } from "../src/ui/extractoPdf";
import { leerAviso } from "../src/dominio/aviso";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import type { Datos } from "../src/almacenamiento/repositorio";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");
const html = renderToStaticMarkup;
const noop = () => {};
const ok = async () => ({ ok: true as const });
/** El texto que ve y lee una persona: el marcado sin etiquetas. */
const texto = (m: string) => m.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const aviso = leerAviso(leer("aviso-privacidad.md"));
const acceso = (version?: string) =>
  html(<Acceso aviso={aviso} version={version} alIniciarConCorreo={ok} alRegistrar={ok} alEntrarConGoogle={ok} alRecuperar={ok} />);
const acerca = () => html(<Acerca version="1.2.3" compilado="2026-10-27" alVerAviso={noop} />);

const datos: Datos = {
  schemaVersion: 3,
  config: CONFIG_POR_DEFECTO,
  turnos: [],
  movimientos: [
    { id: "m1", fecha: "2026-09-01", tipo: "saldo_inicial", minutos: 600, automatico: false, creadoEn: "2026-09-01T08:00:00", modificadoEn: "2026-09-01T08:00:00" },
  ],
};

describe("el componente Firma", () => {
  const m = html(<Firma version="1.2.3" />);

  it("dice 'Hecho por Alejandro Tabares · v' y la versión, como texto real", () => {
    expect(texto(m)).toBe("Hecho por Alejandro Tabares · v1.2.3");
  });
  it("el nombre va en peso 600 (negrita del estilo) y el resto en peso normal", () => {
    expect(m).toMatch(/<strong[^>]*>Alejandro Tabares<\/strong>/);
  });
  it("el monograma es una imagen decorativa: alt vacío, para que un lector de pantalla no lo lea", () => {
    expect(m).toMatch(/<img[^>]*alt=""/);
    expect(m).not.toMatch(/aria-label|role="img"/);
  });
  it("un lector de pantalla lee el nombre una sola vez", () => {
    expect(m.match(/Alejandro Tabares/g)).toHaveLength(1);
  });
  it("usa la variante clara del monograma (los fondos son claros) con <img>, nunca en línea", () => {
    expect(m).toMatch(/<img[^>]*src="[^"]*marca\/at-monograma-claro\.svg"/);
    expect(m).not.toContain("<svg"); // los SVG usan los ids de degradado g y ga, que chocan si se repiten en una página
  });
  it("el nombre se puede seleccionar: no es parte de la imagen ni tiene user-select: none", () => {
    expect(leer("src/ui/estilo/pantallas.css")).not.toMatch(/user-select/);
  });
});

describe("los archivos del monograma", () => {
  it("están en public/marca: la variante clara y la de fondos oscuros", () => {
    expect(existsSync(join(RAIZ, "public/marca/at-monograma-claro.svg"))).toBe(true);
    expect(existsSync(join(RAIZ, "public/marca/at-monograma.svg"))).toBe(true);
  });
  it("no está el logo completo ni el script que los regenera: no se usan en la app", () => {
    const archivos = readdirSync(join(RAIZ, "public/marca"));
    expect(archivos.sort()).toEqual(["at-monograma-claro.svg", "at-monograma.svg"]);
  });
  it("son dibujos puros: sin scripts, eventos ni referencias a otros sitios", () => {
    for (const f of ["at-monograma-claro.svg", "at-monograma.svg"]) {
      const svg = leer(`public/marca/${f}`);
      expect(svg, f).toMatch(/^<svg /);
      // el espacio de nombres xmlns="http://www.w3.org/2000/svg" lo lleva todo SVG y no es una referencia externa
      expect(svg.replace(/xmlns="[^"]*"/, ""), f).not.toMatch(/<script|\son\w+\s*=|foreignObject|href=|@import|https?:/i);
    }
  });
  it("llevan los ids de degradado g y ga: por eso se muestran con <img> y no en línea", () => {
    expect(leer("public/marca/at-monograma-claro.svg")).toMatch(/id="g"[\s\S]*id="ga"/);
  });
  it("el service worker los guarda, para que la firma salga también sin conexión", () => {
    expect(leer("vite.config.ts")).toContain("marca/at-monograma-claro.svg");
  });
});

describe("CC25: dónde aparece la firma", () => {
  it("'Acerca de' muestra el monograma, 'Hecho por Alejandro Tabares' y la versión", () => {
    const m = acerca();
    expect(m).toContain("at-monograma-claro.svg");
    expect(texto(m)).toContain("Hecho por Alejandro Tabares · v1.2.3");
  });
  it("va al pie de 'Acerca de', después de todo lo demás", () => {
    const m = acerca();
    expect(m.lastIndexOf("firma")).toBeGreaterThan(m.indexOf("Reportar un problema"));
  });
  it("el inicio de sesión la muestra al pie, dentro del pie de la pantalla", () => {
    const m = acceso("1.2.3");
    const pie = /<footer class="acceso__pie">([\s\S]*?)<\/footer>/.exec(m)?.[1] ?? "";
    expect(texto(pie)).toContain("Hecho por Alejandro Tabares · v1.2.3");
    expect(pie).toContain("at-monograma-claro.svg");
  });
  it("sin versión no se dibuja a medias: ni imagen ni texto", () => {
    expect(acceso()).not.toContain("Hecho por");
    expect(acceso()).not.toContain("at-monograma");
  });
  it("el nombre aparece una sola vez en 'Acerca de' (no se repite para el lector de pantalla)", () => {
    expect(acerca().match(/Alejandro Tabares/g)).toHaveLength(1);
  });
});

describe("la versión sale del package.json, no se escribe a mano", () => {
  const version = JSON.parse(leer("package.json")).version as string;

  it("vite la define desde package.json", () => {
    expect(leer("vite.config.ts")).toMatch(/__VERSION_APP__:\s*JSON\.stringify\(paquete\.version\)/);
  });
  it("las dos pantallas con firma reciben la versión de versionDeLaApp()", () => {
    expect(leer("src/App.tsx")).toMatch(/<Acerca \{\.\.\.versionDeLaApp\(\)\}/);
    expect(leer("src/ui/nube/AppNube.tsx")).toMatch(/version=\{versionDeLaApp\(\)\.version\}/);
  });
  it("ningún archivo de src escribe el número de versión a mano", () => {
    const encontrados: string[] = [];
    const recorrer = (c: string) => {
      for (const n of readdirSync(c)) {
        const ruta = join(c, n);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.(tsx?|css)$/.test(n) && readFileSync(ruta, "utf8").includes(version)) encontrados.push(relative(RAIZ, ruta).replace(/\\/g, "/"));
      }
    };
    recorrer(join(RAIZ, "src"));
    expect(encontrados).toEqual([]);
  });
  it("'Hecho por' solo se escribe en el componente Firma", () => {
    const encontrados: string[] = [];
    const recorrer = (c: string) => {
      for (const n of readdirSync(c)) {
        const ruta = join(c, n);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.tsx?$/.test(n) && readFileSync(ruta, "utf8").includes("Hecho por")) encontrados.push(relative(RAIZ, ruta).replace(/\\/g, "/"));
      }
    };
    recorrer(join(RAIZ, "src"));
    expect(encontrados).toEqual(["src/ui/componentes/Firma.tsx"]);
  });
});

describe("donde la firma NO va", () => {
  it("el extracto en pantalla (que también es el que se imprime)", () => {
    const m = html(<Extracto datos={datos} alIrABanco={noop} />);
    expect(m).not.toContain("Hecho por");
    expect(m).not.toContain("at-monograma");
  });
  it("el extracto en PDF sale sin la firma", () => {
    const pdf = new TextDecoder("latin1").decode(construirExtractoPdf(datos, "2026-10-27"));
    expect(pdf).not.toContain("Hecho por");
    expect(pdf).not.toContain("Alejandro Tabares");
  });
  it("la pantalla de carga", () => {
    for (const demora of [false, true]) {
      const m = html(<CargaVisible demora={demora} alSeguirSinConexion={noop} />);
      expect(m).not.toContain("Hecho por");
      expect(m).not.toContain("at-monograma");
    }
  });
  it("al imprimir, aunque se imprima otra pantalla, la firma se oculta", () => {
    const impresion = leer("src/ui/estilo/pantallas.css").slice(leer("src/ui/estilo/pantallas.css").indexOf("@media print"));
    expect(impresion).toMatch(/\.firma\s*\{[^}]*display:\s*none/);
  });
  it("el ícono de la app sigue siendo el reloj de arena, no el monograma", () => {
    const vite = leer("vite.config.ts");
    expect(vite).toContain("icon-192.png");
    expect(vite).not.toMatch(/icons:[\s\S]*at-monograma/);
  });
});

describe("estilo de la firma (estilo-visual.md §8)", () => {
  const css = leer("src/ui/estilo/pantallas.css");
  function regla(selector: string): Record<string, string> {
    const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`(?:^|\\n)\\s*${escapado}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(css);
    if (!m) throw new Error(`No hay una regla para ${selector}`);
    return Object.fromEntries([...m[1].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
  }
  it("el monograma mide 24 px de alto y conserva su proporción", () => {
    expect(regla(".firma__monograma")["height"]).toBe("24px");
    expect(regla(".firma__monograma")["width"]).toBe("auto");
  });
  it("el texto va en 13 px, peso normal, y el nombre en peso 600", () => {
    const f = regla(".firma");
    expect(f["font-size"]).toBe("var(--tam-caption)");
    expect(f["font-weight"]).toBe("var(--peso-normal)");
    expect(regla(".firma strong")["font-weight"]).toBe("var(--peso-fuerte)");
  });
  it("queda fuera de una tarjeta, sobre el degradado: el texto va en --texto porque --texto-suave no llega a 4,5 ahí", () => {
    expect(regla(".firma")["color"]).toBe("var(--texto)");
  });
  it("el monograma y el texto van en una fila centrada", () => {
    const f = regla(".firma");
    expect(f["display"]).toBe("flex");
    expect(f["align-items"]).toBe("center");
    expect(f["justify-content"]).toBe("center");
  });
});
