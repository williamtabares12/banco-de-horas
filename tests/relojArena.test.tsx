import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RelojArena } from "../src/ui/componentes/RelojArena";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");
const css = leer("src/ui/estilo/componentes.css");
const html = renderToStaticMarkup(<RelojArena />);

describe("RelojArena (estilo-visual.md §6b)", () => {
  it("es un dibujo SVG con nombre accesible", () => {
    expect(html).toMatch(/^<svg[^>]*class="reloj-arena"/);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Reloj de arena"');
  });

  it("dibuja exactamente la misma figura que el reloj aprobado en arena-animado.html", () => {
    const aprobado = leer("arena-animado.html");
    const trazos = [...aprobado.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    expect(trazos.length).toBeGreaterThanOrEqual(5);
    for (const d of trazos) expect(html).toContain(`d="${d}"`);
  });

  it("no lleva colores sueltos: usa solo los tokens (contorno --texto, arena --accion-clara)", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(css).toMatch(/\.reloj-arena__contorno[^{]*\{[^}]*stroke:\s*var\(--texto\)/);
    expect(css).toMatch(/\.reloj-arena__arena[^{]*\{[^}]*fill:\s*var\(--accion-clara\)/);
  });

  describe("tamaño y movimiento", () => {
    it("mide 96 px de lado", () => {
      expect(css).toMatch(/\.reloj-arena\s*\{[^}]*width:\s*96px[^}]*height:\s*96px/s);
    });
    it("el ciclo dura 5 s: la arena baja durante 3,5 s (70 %), el reloj gira 180° y se repite", () => {
      expect(css).toMatch(/--ciclo:\s*5s/);
      expect(css).toMatch(/@keyframes reloj-arena-giro[\s\S]*?74%[\s\S]*?rotate\(0\)[\s\S]*?90%[\s\S]*?rotate\(180deg\)/);
      expect(css).toMatch(/@keyframes reloj-arena-vaciar[\s\S]*?70%[\s\S]*?scaleY\(0\)/);
      expect(css).toMatch(/infinite/);
    });
    it("con 'reducir movimiento' (prefers-reduced-motion) queda quieto (CC23)", () => {
      const bloque = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n  \}\n/.exec(css);
      expect(bloque).not.toBeNull();
      expect(bloque![1]).toMatch(/\.reloj-arena[^{]*\{[^}]*animation:\s*none/);
    });
    it("sin movimiento se ve el reloj con la arena arriba, no un dibujo vacío", () => {
      const bloque = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n  \}\n/.exec(css)![1];
      expect(bloque).toMatch(/reloj-arena__abajo[^{]*\{[^}]*scaleY\(0\)/);
      expect(bloque).toMatch(/reloj-arena__hilo[^{]*\{[^}]*opacity:\s*0/);
    });
    it("solo se mueve el reloj: no hay otras animaciones en la app", () => {
      const todas = ["componentes.css", "pantallas.css", "global.css", "tokens.css"].map((n) => leer(`src/ui/estilo/${n}`)).join("\n");
      const nombres = [...todas.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
      expect(nombres.length).toBeGreaterThan(0);
      for (const n of nombres) expect(n).toMatch(/^reloj-arena-/);
    });
  });
});
