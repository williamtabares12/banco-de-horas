import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { leerArchivosDelProyecto, revisarEstilo } from "../scripts/check-estilo.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

function archivos(carpeta: string, patron: RegExp): string[] {
  const salida: string[] = [];
  const recorrer = (c: string) => {
    for (const nombre of readdirSync(c)) {
      const ruta = join(c, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (patron.test(nombre)) salida.push(relative(RAIZ, ruta).replace(/\\/g, "/"));
    }
  };
  recorrer(join(RAIZ, carpeta));
  return salida;
}

const todosLosTsx = archivos("src", /\.tsx$/);
// Los componentes base (botón, campo, interruptor…) son los únicos que escriben elementos HTML de formulario.
// Los formularios (Formulario*.tsx) y las pantallas deben armarse con ellos.
const esComponenteBase = (ruta: string) => ruta.startsWith("src/ui/componentes/") && !/Formulario[A-Za-z]*\.tsx$/.test(ruta);
const pantallasYFormularios = todosLosTsx.filter((r) => !esComponenteBase(r));

describe("las pantallas se arman con los componentes", () => {
  it("hay pantallas que revisar", () => {
    for (const esperado of ["src/App.tsx", "src/ui/pantallas/Inicio.tsx", "src/ui/pantallas/Ajustes.tsx", "src/ui/componentes/FormularioTurno.tsx"]) {
      expect(pantallasYFormularios).toContain(esperado);
    }
  });

  for (const etiqueta of ["button", "input", "select", "textarea"]) {
    it(`ninguna pantalla ni formulario escribe <${etiqueta}> a mano`, () => {
      const sueltos = pantallasYFormularios.filter((r) => new RegExp(`<${etiqueta}[\\s>]`).test(leer(r)));
      expect(sueltos).toEqual([]);
    });
  }

  it("no hay ventanas del navegador para confirmar o avisar: se usa el diálogo de confirmación", () => {
    const conVentanas = todosLosTsx.concat(archivos("src", /\.ts$/)).filter((r) => /\b(window\.)?(confirm|alert|prompt)\(/.test(leer(r)));
    expect(conVentanas).toEqual([]);
  });

  it("las pantallas que borran algo piden confirmación con el diálogo", () => {
    for (const r of ["src/ui/pantallas/Banco.tsx", "src/ui/pantallas/Turnos.tsx", "src/ui/pantallas/Ajustes.tsx"]) {
      expect(leer(r), r).toMatch(/useConfirmacion/);
    }
  });
});

describe("clases de CSS", () => {
  const css = archivos("src", /\.css$/).map(leer).join("\n");
  const usadas = new Map<string, string>();
  for (const ruta of todosLosTsx) {
    for (const m of leer(ruta).matchAll(/className="([^"]+)"/g)) {
      for (const clase of m[1].split(/\s+/).filter(Boolean)) usadas.set(clase, ruta);
    }
  }

  it("hay clases que revisar", () => {
    expect(usadas.size).toBeGreaterThan(20);
  });

  it("cada clase que se usa en un componente o pantalla está definida en algún CSS", () => {
    const sinDefinir = [...usadas].filter(([clase]) => !new RegExp(`\\.${clase.replace(/[-_]/g, "[-_]")}(?![\\w-])`).test(css)).map(([c, r]) => `${c} (${r})`);
    expect(sinDefinir).toEqual([]);
  });

  it("no queda ninguna clase del diseño anterior", () => {
    const viejas = ["tarjeta", "chip", "botones", "grande", "primario", "sube", "baja", "casilla", "pequeno", "desglose", "compacta", "ok"];
    const encontradas = viejas.filter((c) => usadas.has(c));
    expect(encontradas).toEqual([]);
  });
});

describe("se retira lo temporal de T18 y T19", () => {
  it("ya no existen el CSS viejo de las pantallas ni el puente", () => {
    expect(existsSync(join(RAIZ, "src/App.css"))).toBe(false);
    expect(existsSync(join(RAIZ, "src/ui/estilo/puente.css"))).toBe(false);
  });

  it("no queda la capa 'legado' ni se importan esos archivos", () => {
    const todo = archivos("src", /\.(css|tsx?)$/).map(leer).join("\n");
    expect(todo).not.toMatch(/@layer legado|layer\(legado\)/);
    expect(todo).not.toMatch(/puente\.css|App\.css/);
  });

  it("los estilos de las pantallas se cargan después de los tokens, la base y los componentes", () => {
    const main = leer("src/main.tsx");
    const orden = ["tokens.css", "global.css", "componentes.css", "pantallas.css"].map((n) => main.indexOf(`ui/estilo/${n}`));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });
});

describe("el verificador de estilo, en modo estricto (T20)", () => {
  it("npm run check:estilo ya revisa todas las reglas del documento", () => {
    const paquete = JSON.parse(leer("package.json"));
    expect(paquete.scripts["check:estilo"]).toMatch(/--estricto/);
  });

  it("todo el proyecto cumple: colores, variables, sombras, tema oscuro, pesos, radios y tamaños de letra", () => {
    const { errores, avisos } = revisarEstilo(leerArchivosDelProyecto(RAIZ), { estricto: true });
    expect(avisos).toEqual([]);
    expect(errores.map((h: { ruta: string; linea: number; categoria: string; mensaje: string }) => `${h.ruta}:${h.linea} [${h.categoria}] ${h.mensaje}`)).toEqual([]);
  });
});

describe("pantallas.css (sección 6)", () => {
  const css = leer("src/ui/estilo/pantallas.css");
  /** Declaraciones de la primera regla con ese selector exacto. */
  function regla(selector: string): Record<string, string> {
    const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`(?:^|\\n)\\s*${escapado}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(css);
    if (!m) throw new Error(`No hay una regla para ${selector}`);
    return Object.fromEntries([...m[1].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
  }

  it("margen lateral de 16 px y 40 px entre secciones", () => {
    expect(regla(".aplicacion")["padding"]).toMatch(/var\(--esp-16\)/);
    expect(regla(".pantalla")["gap"]).toBe("var(--esp-40)");
  });

  it("título de la app: 21 px y peso 600, en una barra fija", () => {
    const t = regla(".titulo-app");
    expect(t["font-size"]).toBe("var(--texto-subtitulo)");
    expect(t["font-weight"]).toBe("var(--peso-fuerte)");
    expect(regla(".encabezado")["position"]).toBe("sticky");
    expect(regla(".encabezado")["background"]).toBe("var(--color-lienzo)");
  });

  it("la cifra grande (el saldo) es de 44 px y peso 600; la mediana, de 28 px", () => {
    expect(regla(".cifra")["font-size"]).toBe("var(--texto-cifra)");
    expect(regla(".cifra")["font-weight"]).toBe("var(--peso-fuerte)");
    expect(regla(".cifra--media")["font-size"]).toBe("var(--texto-titulo)");
  });

  it("bloques tipográficos separados por líneas finas, el saldo con fondo de realce, sin tarjetas", () => {
    expect(regla(".bloque")["border-bottom"]).toBe("1px solid var(--color-linea)");
    expect(regla(".bloque--realce")["background"]).toBe("var(--color-realce)");
    expect(css).not.toMatch(/\.tarjeta/);
    expect(css).not.toMatch(/border-radius/);
  });

  it("título de sección: 28 px y peso 600", () => {
    expect(regla(".titulo-seccion")["font-size"]).toBe("var(--texto-titulo)");
    expect(regla(".titulo-seccion")["font-weight"]).toBe("var(--peso-fuerte)");
  });

  it("el estado vacío es una frase de 17 px y peso 300", () => {
    expect(regla(".vacio__texto")["font-weight"]).toBe("var(--peso-ligero)");
    expect(regla(".vacio__texto")["font-size"]).toBe("var(--texto-cuerpo)");
  });

  it("el nombre de la quincena es de 21 px", () => {
    expect(regla(".selector-quincena__nombre")["font-size"]).toBe("var(--texto-subtitulo)");
  });

  it("tabla del extracto: líneas finas y cifras tabulares", () => {
    expect(css).toMatch(/\.tabla-extracto[^{]*\{[^}]*border-bottom:\s*1px solid var\(--color-linea\)/);
    expect(css).toMatch(/\.tabla-extracto \.num[^{]*\{[^}]*tabular-nums/);
  });

  describe("al imprimir el extracto (CA21)", () => {
    const bloque = css.slice(css.indexOf("@media print"));
    it("hay estilos de impresión", () => {
      expect(css).toMatch(/@media print/);
    });
    it("se ocultan la barra fija, las pestañas y los botones, y se muestra el título del extracto", () => {
      expect(bloque).toMatch(/\.encabezado[^{]*\{[^}]*display:\s*none/);
      expect(bloque).toMatch(/\.no-imprimir[^{]*\{[^}]*display:\s*none/);
      expect(bloque).toMatch(/\.solo-imprimir[^{]*\{[^}]*display:\s*block/);
    });
    it("no fija ningún color: lo ponen los tokens de impresión (blanco y negro, nada de azul)", () => {
      expect(bloque).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb|--color-accion|--color-enlace/);
    });
    it("las filas de la tabla no se parten entre páginas y el encabezado se repite", () => {
      expect(bloque).toMatch(/break-inside:\s*avoid/);
      expect(bloque).toMatch(/table-header-group/);
    });
  });
});

describe("base global", () => {
  it("el texto en negrita usa el peso 600, nunca el 700 que trae el navegador por defecto", () => {
    const global = leer("src/ui/estilo/global.css");
    expect(global).toMatch(/strong,\s*b\s*\{[^}]*font-weight:\s*var\(--peso-fuerte\)/);
  });

  it("los títulos y párrafos no traen márgenes del navegador: el espacio lo ponen las pantallas", () => {
    const global = leer("src/ui/estilo/global.css");
    expect(global).toMatch(/h1,\s*h2,\s*h3[^{]*\{[^}]*margin:\s*0/);
  });
});
