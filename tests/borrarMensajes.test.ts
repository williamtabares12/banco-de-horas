import { describe, it, expect } from "vitest";
import { mensajeDeErrorBorrado } from "../src/dominio/acceso";

describe("mensajeDeErrorBorrado: qué se le dice a la persona si no se pudo borrar la cuenta", () => {
  it("contraseña equivocada: lo dice y aclara que no se borró nada", () => {
    for (const codigo of ["auth/wrong-password", "auth/invalid-credential"]) {
      const m = mensajeDeErrorBorrado(codigo);
      expect(m).toMatch(/contraseña no es correcta/i);
      expect(m).toMatch(/No se borró nada/);
    }
  });
  it("si cerró la ventana de Google, no se borró nada", () => {
    for (const codigo of ["auth/popup-closed-by-user", "auth/cancelled-popup-request"]) {
      expect(mensajeDeErrorBorrado(codigo)).toMatch(/Cancelaste/);
      expect(mensajeDeErrorBorrado(codigo)).toMatch(/No se borró nada/);
    }
  });
  it("si el navegador bloqueó la ventana, sugiere Safari o Chrome", () => {
    expect(mensajeDeErrorBorrado("auth/popup-blocked")).toMatch(/Safari o Chrome/);
  });
  it("sin conexión: pide revisar la conexión y avisa que se puede repetir", () => {
    for (const codigo of ["auth/network-request-failed", "unavailable"]) {
      const m = mensajeDeErrorBorrado(codigo);
      expect(m).toMatch(/conexión/i);
      expect(m).toMatch(/volver a intentar|vuelve a intentar|inténtalo/i);
    }
  });
  it("si hace falta confirmar de nuevo, lo dice", () => {
    expect(mensajeDeErrorBorrado("auth/requires-recent-login")).toMatch(/confirmar/i);
  });
  it("cualquier otro caso: un mensaje genérico que dice que se puede repetir, sin códigos técnicos", () => {
    for (const codigo of ["", "permission-denied", "auth/algo-raro"]) {
      const m = mensajeDeErrorBorrado(codigo);
      expect(m).toMatch(/No se pudo borrar/);
      expect(m).toMatch(/repetir|vuelve a intentar|inténtalo/i);
      expect(m).not.toMatch(/auth\/|permission-denied/);
    }
  });
});
