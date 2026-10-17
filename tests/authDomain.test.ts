import { describe, it, expect } from "vitest";
import { authDomainPara } from "../src/dominio/acceso";

const PROYECTO = "banco-horas-f6890";
const POR_DEFECTO = `${PROYECTO}.firebaseapp.com`;

describe("authDomainPara: el dominio de acceso debe ser el mismo de la página", () => {
  it("en la dirección web.app de la app, se usa web.app (así la redirección de Google no cruza de sitio)", () => {
    expect(authDomainPara(`${PROYECTO}.web.app`, PROYECTO, POR_DEFECTO)).toBe(`${PROYECTO}.web.app`);
  });
  it("en la dirección firebaseapp.com de la app, se usa firebaseapp.com", () => {
    expect(authDomainPara(`${PROYECTO}.firebaseapp.com`, PROYECTO, POR_DEFECTO)).toBe(`${PROYECTO}.firebaseapp.com`);
  });
  it("en desarrollo (localhost, emuladores) se queda con el de siempre", () => {
    expect(authDomainPara("localhost", PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
    expect(authDomainPara("localhost:5199", PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
    expect(authDomainPara("127.0.0.1", PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
  });
  it("una dirección que no es de este proyecto nunca se toma como dominio de acceso", () => {
    expect(authDomainPara("otro-proyecto.web.app", PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
    expect(authDomainPara(`${PROYECTO}.web.app.malo.com`, PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
    expect(authDomainPara("", PROYECTO, POR_DEFECTO)).toBe(POR_DEFECTO);
  });
  it("ignora mayúsculas del navegador", () => {
    expect(authDomainPara(`${PROYECTO.toUpperCase()}.WEB.APP`, PROYECTO, POR_DEFECTO)).toBe(`${PROYECTO}.web.app`);
  });
});
