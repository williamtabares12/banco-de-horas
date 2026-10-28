// RF-C24, CC22 y CC23: la pantalla de carga con el reloj de arena.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TIEMPOS_DE_CARGA, fasePorTiempo } from "../src/dominio/carga";
import { RelojArena } from "../src/ui/componentes/RelojArena";
import { CargaVisible, PantallaDeCarga } from "../src/ui/PantallaDeCarga";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");
const html = renderToStaticMarkup;
const noop = () => {};

describe("tiempos de la pantalla de carga (RF-C24)", () => {
  it("aparece a los 300 ms y avisa de la demora a los 6 s", () => {
    expect(TIEMPOS_DE_CARGA).toMatchObject({ aparece: 300, demora: 6000 });
  });

  describe("CC22: qué se ve según cuánto se espera", () => {
    it("si la sesión se resuelve en menos de 300 ms, no aparece nada (para que no parpadee)", () => {
      expect(fasePorTiempo(0)).toBe("oculta");
      expect(fasePorTiempo(120)).toBe("oculta");
      expect(fasePorTiempo(299)).toBe("oculta");
    });
    it("a partir de 300 ms aparece el reloj de arena", () => {
      expect(fasePorTiempo(300)).toBe("visible");
      expect(fasePorTiempo(3000)).toBe("visible");
      expect(fasePorTiempo(5999)).toBe("visible");
    });
    it("a partir de 6 s se añade el mensaje de demora, y sigue así: con 8 s de espera nunca se queda en blanco", () => {
      expect(fasePorTiempo(6000)).toBe("demora");
      expect(fasePorTiempo(8000)).toBe("demora");
      expect(fasePorTiempo(60_000)).toBe("demora");
    });
  });
});

describe("PantallaDeCarga: al principio no muestra nada", () => {
  it("en el primer instante (menos de 300 ms) no dibuja la pantalla", () => {
    expect(html(<PantallaDeCarga />)).toBe("");
  });
});

describe("CargaVisible (lo que se ve cuando ya aparece)", () => {
  const m = html(<CargaVisible demora={false} />);

  it("muestra el reloj de arena animado y la palabra Arena debajo", () => {
    expect(m).toContain('class="reloj-arena"');
    expect(m).toMatch(/<p class="carga__nombre"[^>]*>Arena<\/p>/);
    expect(m.indexOf("reloj-arena")).toBeLessThan(m.indexOf("carga__nombre"));
  });
  it("no es un letrero de 'Cargando', ni lleva barra de progreso ni porcentajes", () => {
    expect(m).not.toMatch(/Cargando/i);
    expect(m).not.toMatch(/progressbar|barra-avance|\d\s*%/);
  });
  it("un lector de pantalla anuncia 'Abriendo Arena' (role=status)", () => {
    expect(m).toMatch(/role="status"/);
    expect(m).toMatch(/class="solo-lectores"[^>]*>Abriendo Arena</);
  });
  it("el dibujo del reloj no se anuncia aparte (sería repetir)", () => {
    expect(m).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(m).not.toContain('aria-label="Reloj de arena"');
  });
  it("sin demora no dice nada de la demora", () => {
    expect(m).not.toContain("Está tardando");
    expect(m).not.toContain("Seguir sin conexión");
  });

  describe("pasados 6 s", () => {
    it("añade 'Está tardando más de lo normal. Revisa tu conexión.'", () => {
      expect(html(<CargaVisible demora />)).toContain("Está tardando más de lo normal. Revisa tu conexión.");
    });
    it("con copia local, ofrece el botón de contorno 'Seguir sin conexión'", () => {
      const conCopia = html(<CargaVisible demora alSeguirSinConexion={noop} />);
      expect(conCopia).toMatch(/<button[^>]*class="boton boton--contorno"[^>]*>Seguir sin conexión<\/button>/);
    });
    it("sin copia local no ofrece seguir (no hay con qué)", () => {
      expect(html(<CargaVisible demora />)).not.toContain("Seguir sin conexión");
    });
  });
});

describe("RelojArena como dibujo decorativo", () => {
  it("con decorativo no se anuncia: va oculto para los lectores de pantalla", () => {
    const m = html(<RelojArena decorativo />);
    expect(m).toContain('aria-hidden="true"');
    expect(m).not.toContain('role="img"');
  });
  it("sin decorativo sigue siendo una imagen con nombre", () => {
    expect(html(<RelojArena />)).toContain('role="img"');
  });
});

describe("estilo de la pantalla de carga (estilo-visual.md §6b)", () => {
  const css = leer("src/ui/estilo/pantallas.css") + leer("src/ui/estilo/componentes.css");
  /** Declaraciones de la primera regla con ese selector. */
  const regla = (selector: string) => {
    const m = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css);
    expect(m, selector).not.toBeNull();
    return Object.fromEntries([...m![1].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
  };

  it("el lienzo ocupa toda la pantalla con el reloj centrado, usando 100dvh", () => {
    const c = regla(".carga");
    expect(c["display"]).toBe("flex");
    expect(c["align-items"]).toBe("center");
    expect(c["justify-content"]).toBe("center");
    expect(css).toMatch(/\.carga\s*\{[^}]*min-height:\s*100dvh/);
  });
  it("'Arena' va en 22 px y peso 600", () => {
    const n = regla(".carga__nombre");
    expect(n["font-size"]).toBe("var(--tam-pantalla)");
    expect(n["font-weight"]).toBe("var(--peso-fuerte)");
  });
  it("el mensaje de demora va en 17 px y peso 400, en --texto (sobre el degradado desnudo --texto-suave no llega a 4,5)", () => {
    const d = regla(".carga__demora");
    expect(d["font-size"]).toBe("var(--tam-cuerpo)");
    expect(d["font-weight"]).toBe("var(--peso-normal)");
    expect(d["color"]).toBe("var(--texto)");
  });
  it("el texto solo para lectores de pantalla existe y no se ve", () => {
    const s = regla(".solo-lectores");
    expect(s["position"]).toBe("absolute");
    expect(s["width"]).toBe("1px");
  });
});

describe("la app usa la pantalla de carga en vez de un letrero", () => {
  it("AppNube ya no tiene el 'Cargando…' de antes", () => {
    expect(leer("src/ui/nube/AppNube.tsx")).not.toContain("Cargando…");
    expect(leer("src/ui/nube/AppNube.tsx")).toContain("PantallaDeCarga");
  });
  it("mientras se descarga el código de la versión con cuenta tampoco se queda en blanco", () => {
    const main = leer("src/main.tsx");
    expect(main).not.toMatch(/fallback=\{null\}/);
    expect(main).toContain("PantallaDeCarga");
  });
});
