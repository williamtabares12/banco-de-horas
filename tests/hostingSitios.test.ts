import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authDomainPara } from "../src/dominio/acceso";
import { CONFIG_FIREBASE, SITIOS_HOSTING } from "../src/almacenamiento/configFirebase";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROYECTO = "banco-horas-f6890";
const POR_DEFECTO = `${PROYECTO}.firebaseapp.com`;

describe("sitios de Hosting: la app se publica en arena-horas.web.app", () => {
  it("firebase.json publica en el sitio arena-horas (el proyecto tiene dos sitios, hay que decir cuál)", () => {
    const firebase = JSON.parse(readFileSync(join(RAIZ, "firebase.json"), "utf8"));
    expect(firebase.hosting.site).toBe("arena-horas");
    expect(firebase.hosting.public).toBe("dist-nube");
  });

  it("la app conoce sus dos sitios: el nuevo y el original", () => {
    expect(SITIOS_HOSTING).toEqual(["arena-horas", PROYECTO]);
    expect(CONFIG_FIREBASE.projectId).toBe(PROYECTO);
  });
});

describe("authDomainPara con varios sitios del mismo proyecto", () => {
  it("en arena-horas.web.app, el dominio de acceso es ese mismo", () => {
    expect(authDomainPara("arena-horas.web.app", PROYECTO, POR_DEFECTO, SITIOS_HOSTING)).toBe("arena-horas.web.app");
    expect(authDomainPara("arena-horas.firebaseapp.com", PROYECTO, POR_DEFECTO, SITIOS_HOSTING)).toBe("arena-horas.firebaseapp.com");
  });
  it("el sitio original sigue funcionando", () => {
    expect(authDomainPara(`${PROYECTO}.web.app`, PROYECTO, POR_DEFECTO, SITIOS_HOSTING)).toBe(`${PROYECTO}.web.app`);
  });
  it("una dirección parecida que no es de la app no se toma", () => {
    expect(authDomainPara("arena.web.app", PROYECTO, POR_DEFECTO, SITIOS_HOSTING)).toBe(POR_DEFECTO);
    expect(authDomainPara("arena-horas.web.app.malo.com", PROYECTO, POR_DEFECTO, SITIOS_HOSTING)).toBe(POR_DEFECTO);
    expect(authDomainPara("localhost", PROYECTO, POR_DEFECTO, SITIOS_HOSTING)).toBe(POR_DEFECTO);
  });
  it("sin la lista de sitios se comporta como antes (solo el sitio del proyecto)", () => {
    expect(authDomainPara("arena-horas.web.app", PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
    expect(authDomainPara(`${PROYECTO}.web.app`, PROYECTO, POR_DEFECTO)).toBe(`${PROYECTO}.web.app`);
  });
});
