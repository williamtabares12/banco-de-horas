import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DATOS_AVISO, leerAviso } from "../src/dominio/aviso";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLANTILLA = readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8");

describe("los datos del aviso se rellenan al leerlo, no en el documento", () => {
  it("DATOS_AVISO tiene el nombre de la app, el responsable y el correo de contacto", () => {
    expect(DATOS_AVISO).toEqual({
      nombreApp: "Arena",
      responsable: "ALEJANDRO TABARES",
      correoContacto: "wtabares@comfamiliar.com",
    });
  });

  it("el documento puede seguir siendo la plantilla con corchetes: la app los rellena sola", () => {
    const texto = JSON.stringify(leerAviso(PLANTILLA));
    expect(texto).not.toMatch(/\[(NOMBRE|CORREO)[^\]]*\]/);
    expect(texto).toContain("Arena");
    expect(texto).toContain("ALEJANDRO TABARES");
    expect(texto).toContain("wtabares@comfamiliar.com");
  });

  it("se pueden pasar otros datos (por ejemplo, otro correo de contacto)", () => {
    const otro = { nombreApp: "Mi App", responsable: "ANA PÉREZ", correoContacto: "ana@correo.com" };
    const texto = JSON.stringify(leerAviso(PLANTILLA, otro));
    expect(texto).toContain("ANA PÉREZ");
    expect(texto).toContain("ana@correo.com");
    expect(texto).not.toContain("wtabares@comfamiliar.com");
  });

  it("si el documento ya viene relleno, también se lee bien", () => {
    const relleno = PLANTILLA.replace("[NOMBRE DE LA APP]", "Otra").replace(/\[NOMBRE COMPLETO DEL RESPONSABLE\]/g, "FULANO").replace(/\[CORREO DE CONTACTO\]/g, "f@correo.com");
    const texto = JSON.stringify(leerAviso(relleno));
    expect(texto).toContain("FULANO");
    expect(texto).toContain("f@correo.com");
  });
});
