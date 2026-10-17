// T36 (estilo-visual.md §3): sin resaltado azul del navegador, y cada elemento tocable tiene su propio estado presionado.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");
const componentes = leer("src/ui/estilo/componentes.css");
const global = leer("src/ui/estilo/global.css");
const todo = ["tokens", "global", "componentes", "pantallas"].map((n) => leer(`src/ui/estilo/${n}.css`)).join("\n");

describe("sin el resaltado azul de toque del navegador", () => {
  it("se quita en toda la app (igual en iPhone y Android)", () => {
    expect(global).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });
});

describe("cada elemento tocable tiene su propio estado presionado", () => {
  const tocables = [".boton", ".enlace", ".pestana", ".fila-lista__tocable", ".interruptor"];

  for (const selector of tocables) {
    it(`${selector}: baja su opacidad mientras se presiona`, () => {
      const m = new RegExp(`${selector.replace(".", "\\.")}:active[^{]*\\{([^}]*)\\}`).exec(componentes);
      expect(m, `${selector}:active`).not.toBeNull();
      expect(m![1]).toMatch(/opacity:\s*0?\.[4-8]\d*/);
    });
  }

  it("lo deshabilitado no reacciona al toque", () => {
    for (const selector of [".boton", ".interruptor"]) {
      const regla = new RegExp(`${selector.replace(".", "\\.")}:active:not\\(:disabled\\)`);
      expect(componentes, selector).toMatch(regla);
    }
  });

  it("el cambio es inmediato: sin transiciones ni animaciones (el único movimiento de la app es el reloj de arena)", () => {
    expect(todo).not.toMatch(/\btransition\s*:/);
  });
});

describe("el efecto de pasar el cursor solo existe donde hay cursor", () => {
  it("ninguna regla :hover queda fuera de @media (hover: hover) (en el celular se quedaría pegada después de tocar)", () => {
    // se quitan los bloques de @media (hover: hover) y no debe quedar ningún :hover
    const sinMedia = componentes.replace(/@media \(hover: hover\)\s*\{[\s\S]*?\n  \}\n/g, "");
    expect(sinMedia).not.toMatch(/:hover/);
    expect(componentes).toMatch(/@media \(hover: hover\)/);
  });

  it("el enlace sigue subrayándose al pasar el cursor y al enfocarlo con el teclado", () => {
    expect(componentes).toMatch(/\.enlace:hover[^{]*\{[^}]*text-decoration:\s*underline/);
    expect(componentes).toMatch(/\.enlace:focus-visible[^{]*\{[^}]*text-decoration:\s*underline/);
  });
});
