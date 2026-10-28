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

describe("el verificador de estilo, en modo estricto (T20, T42)", () => {
  it("npm run check:estilo ya revisa todas las reglas del documento", () => {
    const paquete = JSON.parse(leer("package.json"));
    expect(paquete.scripts["check:estilo"]).toMatch(/--estricto/);
  });

  it("todo el proyecto cumple: colores, variables, sombras, degradados, vidrio, movimiento, tema oscuro, pesos, radios y tamaños de letra", () => {
    const { errores, avisos } = revisarEstilo(leerArchivosDelProyecto(RAIZ), { estricto: true });
    expect(avisos).toEqual([]);
    expect(errores.map((h: { ruta: string; linea: number; categoria: string; mensaje: string }) => `${h.ruta}:${h.linea} [${h.categoria}] ${h.mensaje}`)).toEqual([]);
  });
});

describe("pantallas.css (secciones 4 y 7, estilo de vidrio)", () => {
  const css = leer("src/ui/estilo/pantallas.css");
  /** Declaraciones de la primera regla con ese selector exacto. */
  function regla(selector: string): Record<string, string> {
    const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`(?:^|\\n)\\s*${escapado}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(css);
    if (!m) throw new Error(`No hay una regla para ${selector}`);
    return Object.fromEntries([...m[1].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
  }

  it("márgenes laterales de 16 px y 16 px entre tarjetas", () => {
    expect(regla(".aplicacion")["padding"]).toMatch(/var\(--esp-16\)/);
    expect(regla(".pantalla")["gap"]).toBe("var(--esp-16)");
  });

  it("título de la app: 22 px y peso 600; la cabecera lleva el reloj de arena quieto", () => {
    const t = regla(".titulo-app");
    expect(t["font-size"]).toBe("var(--tam-pantalla)");
    expect(t["font-weight"]).toBe("var(--peso-fuerte)");
    expect(regla(".marca")["display"]).toBe("flex");
  });

  it("la cabecera no es fija: el documento no la pide y un fondo sólido pegado arriba rompería el degradado", () => {
    expect(regla(".encabezado")["position"]).toBeUndefined();
  });

  it("el estado de sincronización va en caption y en --texto (sobre el degradado desnudo --texto-suave no llega a 4,5)", () => {
    const r = regla(".encabezado .texto-suave");
    expect(r["font-size"]).toBe("var(--tam-caption)");
    expect(r["color"]).toBe("var(--texto)");
  });

  it("la cifra grande (el saldo) es de 44 px y peso 500; la de KPI, de 28 px", () => {
    expect(regla(".cifra")["font-size"]).toBe("var(--tam-cifra)");
    expect(regla(".cifra")["font-weight"]).toBe("var(--peso-medio)");
    expect(regla(".cifra--media")["font-size"]).toBe("var(--tam-cifra-kpi)");
  });

  it("la etiqueta de KPI: 11 px, peso 500, mayúsculas con espaciado de 0,06 em", () => {
    const e = regla(".etiqueta");
    expect(e["font-size"]).toBe("var(--tam-etiqueta)");
    expect(e["font-weight"]).toBe("var(--peso-medio)");
    expect(e["text-transform"]).toBe("uppercase");
    expect(e["letter-spacing"]).toBe("var(--espaciado-etiqueta)");
    expect(e["color"]).toBe("var(--texto-suave)");
  });

  describe("tarjeta de vidrio (sección 4)", () => {
    const t = regla(".tarjeta");
    it("fondo de vidrio, borde de 1 px, radio de 24 px, relleno de 20 px y sombra suave", () => {
      expect(t["background"]).toBe("var(--vidrio)");
      expect(t["border"]).toBe("1px solid var(--vidrio-borde)");
      expect(t["border-radius"]).toBe("var(--radio-tarjeta)");
      expect(t["padding"]).toBe("var(--esp-20)");
      expect(t["box-shadow"]).toBe("var(--sombra)");
    });
    it("desenfoque con y sin prefijo (el iPhone con iOS 17 o anterior solo entiende el prefijado)", () => {
      expect(t["backdrop-filter"]).toBe("blur(var(--desenfoque))");
      expect(t["-webkit-backdrop-filter"]).toBe("blur(var(--desenfoque))");
    });
    it("lo que ya es una tarjeta en las pantallas comparte la regla: bloques, secciones, KPI, estados vacíos y formularios", () => {
      const selector = /(?:^|\n)(\.tarjeta,[^{]*)\{/.exec(css)![1];
      for (const clase of [".seccion", ".bloque", ".par", ".vacio", ".formulario"]) expect(selector).toContain(clase);
    });
    it("sin vidrio apilado sobre vidrio: lo que va dentro de una tarjeta no la repite", () => {
      expect(css).toMatch(/:is\(\.tarjeta[^)]*\) :is\(\.tarjeta[^)]*\)\s*\{[^}]*backdrop-filter:\s*none/);
    });
    it("el vidrio no va en las filas de una lista ni en la tabla del extracto", () => {
      const conVidrio = [...css.matchAll(/([^{}]*)\{([^{}]*backdrop-filter:\s*blur[^{}]*)\}/g)].map((m) => m[1]);
      expect(conVidrio.join(" ")).not.toMatch(/fila-lista|lista-filas|tabla-extracto|\bbody\b|\bhtml\b/);
    });
    it("al pasar el cursor sube 2 px, solo si hay cursor y la persona no pidió reducir el movimiento", () => {
      expect(css).toMatch(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?translateY\(var\(--elevacion\)\)/);
      expect(t["transition"]).toBe("transform var(--transicion)");
    });
  });

  it("título de sección: 22 px y peso 600; título de tarjeta: 17 px y peso 500", () => {
    expect(regla(".titulo-seccion")["font-size"]).toBe("var(--tam-pantalla)");
    expect(regla(".titulo-seccion")["font-weight"]).toBe("var(--peso-fuerte)");
    expect(regla(".subtitulo")["font-size"]).toBe("var(--tam-cuerpo)");
    expect(regla(".subtitulo")["font-weight"]).toBe("var(--peso-medio)");
  });

  it("el estado vacío es una frase de 17 px en --texto-suave dentro de una tarjeta", () => {
    expect(regla(".vacio__texto")["font-weight"]).toBe("var(--peso-normal)");
    expect(regla(".vacio__texto")["font-size"]).toBe("var(--tam-cuerpo)");
    expect(regla(".vacio__texto")["color"]).toBe("var(--texto-suave)");
  });

  it("Inicio: los íconos de KPI son un cuadro de 36 px con degradado y trazo blanco de 1,8 px", () => {
    const i = regla(".icono-kpi");
    expect(i["width"]).toBe("var(--kpi-icono)");
    expect(i["height"]).toBe("var(--kpi-icono)");
    expect(regla(".icono-kpi--prestado")["background"]).toBe("var(--degradado-kpi-violeta)");
    expect(regla(".icono-kpi--pagado")["background"]).toBe("var(--degradado-kpi-verde)");
    const trazo = regla(".icono-kpi svg");
    expect(trazo["stroke"]).toBe("var(--sobre-accion)");
    expect(trazo["stroke-width"]).toBe("1.8");
  });

  it("Banco: los cuatro botones de contorno van en una cuadrícula de 2", () => {
    expect(regla(".acciones--fila")["grid-template-columns"]).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("Quincena: dos botones circulares de 44 px y el nombre de la quincena al centro", () => {
    expect(regla(".selector-quincena .boton")["width"]).toBe("var(--zona-tactil)");
    expect(regla(".selector-quincena__nombre")["font-size"]).toBe("var(--tam-pantalla)");
    expect(regla(".selector-quincena__nombre")["text-align"]).toBe("center");
  });

  it("tabla del extracto: líneas finas y cifras tabulares", () => {
    expect(css).toMatch(/\.tabla-extracto[^{]*\{[^}]*border-bottom:\s*1px solid var\(--linea\)/);
    expect(css).toMatch(/\.tabla-extracto \.num[^{]*\{[^}]*tabular-nums/);
  });

  describe("inicio de sesión (sección 7)", () => {
    it("'Arena' a 28 px y peso 500; la frase a 17 px, en --texto porque queda sobre el degradado", () => {
      expect(regla(".acceso__nombre")["font-size"]).toBe("var(--tam-seccion)");
      expect(regla(".acceso__nombre")["font-weight"]).toBe("var(--peso-medio)");
      expect(regla(".acceso__frase")["font-size"]).toBe("var(--tam-cuerpo)");
      expect(regla(".acceso__frase")["color"]).toBe("var(--texto)");
    });
    it("con menos de 700 px de alto el reloj baja a 64 px y la frase se oculta", () => {
      const bloque = /@media \(max-height: 700px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
      expect(bloque).toMatch(/\.acceso \.reloj-arena\s*\{[^}]*width:\s*64px[^}]*height:\s*64px/);
      expect(bloque).toMatch(/\.acceso__frase\s*\{[^}]*display:\s*none/);
    });
    it("el selector Entrar | Crear cuenta son dos pastillas en una pista de relleno", () => {
      const r = regla(".acceso__tarjeta .pestanas");
      expect(r["grid-template-columns"]).toBe("repeat(2, minmax(0, 1fr))");
      expect(r["background"]).toBe("var(--relleno)");
      expect(r["border-radius"]).toBe("var(--radio-pastilla)");
    });
    it("el pie queda fuera de la tarjeta, así que sus textos y su enlace van en --texto", () => {
      expect(regla(".acceso__pie")["color"]).toBe("var(--texto)");
      expect(regla(".acceso__pie .enlace")["color"]).toBe("var(--texto)");
    });
  });

  describe("al imprimir el extracto (CA21)", () => {
    const bloque = css.slice(css.indexOf("@media print"));
    it("hay estilos de impresión", () => {
      expect(css).toMatch(/@media print/);
    });
    it("se ocultan el encabezado, las pestañas y los botones, y se muestra el título del extracto", () => {
      expect(bloque).toMatch(/\.encabezado[^{]*\{[^}]*display:\s*none/);
      expect(bloque).toMatch(/\.no-imprimir[^{]*\{[^}]*display:\s*none/);
      expect(bloque).toMatch(/\.solo-imprimir[^{]*\{[^}]*display:\s*block/);
    });
    it("nada de tarjetas: sin relleno ni borde de tarjeta", () => {
      expect(bloque).toMatch(/\.tarjeta,[^{]*\{[^}]*padding:\s*0[^}]*border:\s*0/);
    });
    it("no fija ningún color: lo ponen los tokens de impresión (blanco y negro, sin vidrio, sombras ni degradados)", () => {
      expect(bloque).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb|var\(--accion|var\(--enlace|gradient|shadow/);
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
