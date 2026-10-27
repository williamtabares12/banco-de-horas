// T41: horas ambiguas (RF15, CA24). Hallazgo 2 de informe-qa-2026-10-27.md.
import { describe, it, expect } from "vitest";
import { errorDeDuracion, parsearDuracion } from "../src/dominio/tiempo";

describe("CA24: lo ambiguo no se guarda", () => {
  it.each([["7.30"], ["7,30"], ["2,25"], ["0.33"], ["1.500"], ["8.00"]])("rechaza %j", (texto) => {
    expect(parsearDuracion(texto)).toBeNull();
  });

  it.each([
    ["7,5", 450],
    ["7.5", 450],
    ["0,5", 30],
    ["7:30", 450],
    ["8", 480],
  ])("lee %j como %i minutos", (texto, minutos) => {
    expect(parsearDuracion(texto)).toBe(minutos);
  });
});

describe("CA24: el mensaje", () => {
  it.each([
    ["7.30", "7:30"],
    ["7,30", "7:30"],
    ["2,25", "2:25"],
    ["0.45", "0:45"],
    [" 8.00 ", "8:00"],
  ])("con %j sugiere %s", (texto, sugerencia) => {
    expect(errorDeDuracion(texto)).toContain(`¿Quisiste decir ${sugerencia}?`);
  });

  it("si los dos dígitos no pueden ser minutos, da el mensaje general sin sugerencia", () => {
    const m = errorDeDuracion("7,75");
    expect(m).not.toContain("Quisiste decir");
    expect(m).toMatch(/7:30.*7,5/);
  });

  it.each([["1.500"], ["abc"], ["8 h"], [""]])("con %j da el mensaje general", (texto) => {
    expect(errorDeDuracion(texto)).toMatch(/No entiendo esas horas.*7:30.*7,5/);
  });

  it.each([["8"], ["7:30"], ["7,5"]])("con %j no hay error", (texto) => {
    expect(errorDeDuracion(texto)).toBeNull();
  });
});
