import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = readFileSync(join(RAIZ, "vite.config.ts"), "utf8");

describe("PWA: el service worker no debe tapar las rutas de Firebase", () => {
  // Firebase Hosting sirve su propio manejador de acceso en /__/auth/handler (y /__/firebase/init.json). Si el
  // service worker responde esas rutas con index.html, la ventana de Google queda en blanco y el ingreso falla.
  it("excluye las rutas /__/ del fallback a index.html", () => {
    expect(config).toMatch(/navigateFallbackDenylist:\s*\[[^\]]*\/\^\\\/__\\\//);
  });

  it("la regla de exclusión deja pasar /__/auth/handler y no toca las rutas normales de la app", () => {
    const m = /navigateFallbackDenylist:\s*\[\s*\/(.+?)\/\s*[\],]/.exec(config);
    expect(m).not.toBeNull();
    const regla = new RegExp(m![1]);
    expect(regla.test("/__/auth/handler")).toBe(true);
    expect(regla.test("/__/auth/iframe")).toBe(true);
    expect(regla.test("/__/firebase/init.json")).toBe(true);
    expect(regla.test("/")).toBe(false);
    expect(regla.test("/index.html")).toBe(false);
  });
});
