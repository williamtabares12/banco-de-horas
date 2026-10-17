import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const firebase = JSON.parse(readFileSync(join(RAIZ, "firebase.json"), "utf8"));

type Regla = { source: string; headers: { key: string; value: string }[] };
const reglas: Regla[] = firebase.hosting.headers ?? [];

/** El Cache-Control que Firebase Hosting enviaría para una ruta (la primera regla que la cubre). */
function cacheControl(ruta: string): string | undefined {
  const aRegex = (patron: string) =>
    new RegExp("^" + patron.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "§§").replace(/\*/g, "[^/]*").replace(/§§/g, ".*") + "$");
  const regla = reglas.find((r) => aRegex(r.source).test(ruta) && r.headers.some((h) => h.key.toLowerCase() === "cache-control"));
  return regla?.headers.find((h) => h.key.toLowerCase() === "cache-control")?.value;
}

describe("Hosting: caché para una PWA (que las versiones nuevas lleguen a los teléfonos)", () => {
  it("el service worker y sus ayudas nunca se guardan en caché: así una versión nueva se detecta en cuanto se abre la app", () => {
    for (const ruta of ["/sw.js", "/registerSW.js", "/manifest.webmanifest"]) {
      expect(cacheControl(ruta), ruta).toBe("no-cache");
    }
  });

  it("la página de entrada tampoco: es la que apunta a los archivos nuevos", () => {
    expect(cacheControl("/")).toBe("no-cache");
    expect(cacheControl("/index.html")).toBe("no-cache");
  });

  it("los archivos con huella en el nombre (assets/*.js y .css) se guardan un año: no cambian nunca con ese nombre", () => {
    for (const ruta of ["/assets/index-CKUAbv3h.js", "/assets/AppNube-z8Zcb4EG.js", "/assets/index-DpDDPJ7A.css"]) {
      expect(cacheControl(ruta), ruta).toBe("public, max-age=31536000, immutable");
    }
  });

  it("ningún archivo del service worker queda con una caché larga", () => {
    for (const ruta of ["/sw.js", "/registerSW.js"]) {
      expect(cacheControl(ruta)).not.toMatch(/max-age=[1-9]/);
    }
  });

  it("no se toca nada bajo /__/ (el manejador de acceso de Firebase se sirve solo)", () => {
    for (const r of reglas) expect(r.source).not.toMatch(/__/);
  });

  it("sigue publicando en el sitio arena-horas, desde dist-nube", () => {
    expect(firebase.hosting.site).toBe("arena-horas");
    expect(firebase.hosting.public).toBe("dist-nube");
  });
});
