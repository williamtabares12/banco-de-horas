// T18 (alcance ampliado, punto 3): márgenes de la zona segura. En un iPhone con notch o en horizontal, y en Android
// con recortes de pantalla, el contenido no debe quedar tapado ni pegado al borde.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");
const global = leer("src/ui/estilo/global.css");
const componentes = leer("src/ui/estilo/componentes.css");

describe("zona segura de la pantalla", () => {
  it("la página usa toda la pantalla (viewport-fit=cover); sin esto los env() valen 0", () => {
    expect(leer("index.html")).toMatch(/<meta name="viewport"[^>]*viewport-fit=cover/);
  });

  it("todo el contenido respeta los cuatro bordes seguros", () => {
    const cuerpo = /\n {2}body \{([^}]*)\}/.exec(global);
    expect(cuerpo, "regla de body").not.toBeNull();
    for (const lado of ["top", "right", "bottom", "left"]) {
      expect(cuerpo![1], lado).toContain(`env(safe-area-inset-${lado}`);
    }
  });

  it("el diálogo, que se pega a los bordes (position: fixed), también deja libre la zona segura", () => {
    const dialogo = /\n {2}\.dialogo \{([^}]*)\}/.exec(componentes);
    expect(dialogo, "regla de .dialogo").not.toBeNull();
    for (const lado of ["top", "right", "bottom", "left"]) {
      expect(dialogo![1], lado).toContain(`env(safe-area-inset-${lado}`);
    }
  });
});
