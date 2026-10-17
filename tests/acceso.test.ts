import { describe, it, expect } from "vitest";
import { debeAnularse, errorDeAcceso, errorDeRecuperacion, mensajeDeErrorAcceso, type CamposAcceso } from "../src/dominio/acceso";

const campos = (c: Partial<CamposAcceso> = {}): CamposAcceso => ({
  nombre: "Ana",
  correo: "ana@correo.com",
  contrasena: "secreto1",
  avisoAceptado: true,
  ...c,
});

describe("mensajes de error de Firebase Auth, en español", () => {
  const casos: [string, RegExp][] = [
    ["auth/email-already-in-use", /Ya existe una cuenta con ese correo/],
    ["auth/invalid-email", /correo no parece válido/],
    ["auth/weak-password", /al menos 6 caracteres/],
    ["auth/user-not-found", /Correo o contraseña incorrectos/],
    ["auth/wrong-password", /Correo o contraseña incorrectos/],
    ["auth/invalid-credential", /Correo o contraseña incorrectos/],
    ["auth/too-many-requests", /Demasiados intentos/],
    ["auth/network-request-failed", /conexión/i],
    ["auth/unauthorized-domain", /no está autorizada/],
    ["auth/requires-recent-login", /volver a iniciar sesión|vuelve a iniciar sesión/i],
  ];
  for (const [codigo, esperado] of casos) {
    it(`${codigo}`, () => expect(mensajeDeErrorAcceso(codigo)).toMatch(esperado));
  }
  it("cerrar la ventana de Google no es un error: no hay mensaje", () => {
    expect(mensajeDeErrorAcceso("auth/popup-closed-by-user")).toBeNull();
    expect(mensajeDeErrorAcceso("auth/cancelled-popup-request")).toBeNull();
  });
  it("un código desconocido o ausente da un mensaje genérico, nunca el código técnico", () => {
    expect(mensajeDeErrorAcceso("auth/algo-raro")).toMatch(/Algo salió mal/);
    expect(mensajeDeErrorAcceso("")).toMatch(/Algo salió mal/);
    expect(mensajeDeErrorAcceso("auth/algo-raro")).not.toContain("auth/");
  });
  it("habla de tú, no de vos", () => {
    for (const [codigo] of casos) expect(mensajeDeErrorAcceso(codigo)).not.toMatch(/Iniciá|Esperá|Intentá|volvé|tenés/);
  });
});

describe("validación del formulario de acceso", () => {
  describe("iniciar sesión", () => {
    it("con correo y contraseña está bien", () => {
      expect(errorDeAcceso("login", campos({ nombre: "", avisoAceptado: false }))).toBeNull();
    });
    it("pide el correo y la contraseña", () => {
      expect(errorDeAcceso("login", campos({ correo: "  " }))).toMatch(/correo/i);
      expect(errorDeAcceso("login", campos({ contrasena: "" }))).toMatch(/contraseña/i);
    });
    it("no exige nombre ni aviso (el aviso solo se pide al crear la cuenta)", () => {
      expect(errorDeAcceso("login", campos({ nombre: "", avisoAceptado: false }))).toBeNull();
    });
  });

  describe("crear cuenta", () => {
    it("con todo completo está bien", () => {
      expect(errorDeAcceso("registro", campos())).toBeNull();
    });
    it("pide el nombre", () => {
      expect(errorDeAcceso("registro", campos({ nombre: "   " }))).toMatch(/nombre/i);
    });
    it("sin aceptar el aviso NO se crea la cuenta", () => {
      expect(errorDeAcceso("registro", campos({ avisoAceptado: false }))).toMatch(/aviso de privacidad/i);
    });
    it("el correo debe parecer un correo", () => {
      expect(errorDeAcceso("registro", campos({ correo: "ana" }))).toMatch(/correo no parece válido/i);
      expect(errorDeAcceso("registro", campos({ correo: "ana@correo" }))).toMatch(/correo no parece válido/i);
    });
    it("la contraseña tiene al menos 6 caracteres", () => {
      expect(errorDeAcceso("registro", campos({ contrasena: "12345" }))).toMatch(/al menos 6 caracteres/);
      expect(errorDeAcceso("registro", campos({ contrasena: "123456" }))).toBeNull();
    });
  });

  describe("recuperar la contraseña", () => {
    it("pide escribir el correo primero", () => {
      expect(errorDeRecuperacion("")).toMatch(/correo/i);
      expect(errorDeRecuperacion("   ")).toMatch(/correo/i);
    });
    it("con un correo de apariencia válida, está bien", () => {
      expect(errorDeRecuperacion("ana@correo.com")).toBeNull();
    });
    it("con algo que no es un correo, lo dice", () => {
      expect(errorDeRecuperacion("ana")).toMatch(/correo no parece válido/i);
    });
  });
});

describe("Google: una cuenta nueva sin haber aceptado el aviso se anula", () => {
  it("nueva y sin aceptar antes: se anula", () => {
    expect(debeAnularse({ esNuevo: true, aceptoAviso: false })).toBe(true);
  });
  it("nueva pero aceptó el aviso en la pantalla de crear cuenta: se queda", () => {
    expect(debeAnularse({ esNuevo: true, aceptoAviso: true })).toBe(false);
  });
  it("ya existía: nunca se anula, aunque no marque nada", () => {
    expect(debeAnularse({ esNuevo: false, aceptoAviso: false })).toBe(false);
    expect(debeAnularse({ esNuevo: false, aceptoAviso: true })).toBe(false);
  });
});
