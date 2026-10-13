import { describe, it, expect } from "vitest";
import {
  quincenaDe,
  quincenaDeCobro,
  diaSemana,
  inicioSemana,
  sumarDias,
} from "../src/dominio/tiempo";

describe("quincenaDe", () => {
  it("del 1 al 15 es la 1a quincena", () => {
    expect(quincenaDe("2026-09-01")).toEqual({ anio: 2026, mes: 9, numero: 1 });
    expect(quincenaDe("2026-09-15")).toEqual({ anio: 2026, mes: 9, numero: 1 });
  });
  it("del 16 al fin de mes es la 2a quincena", () => {
    expect(quincenaDe("2026-09-16")).toEqual({ anio: 2026, mes: 9, numero: 2 });
    expect(quincenaDe("2026-09-30")).toEqual({ anio: 2026, mes: 9, numero: 2 });
  });
});

describe("quincenaDeCobro (CA6)", () => {
  it("lo del 10 de septiembre se cobra en la 2a de septiembre", () => {
    expect(quincenaDeCobro("2026-09-10", 1)).toEqual({ anio: 2026, mes: 9, numero: 2 });
  });
  it("lo del 20 de septiembre se cobra en la 1a de octubre", () => {
    expect(quincenaDeCobro("2026-09-20", 1)).toEqual({ anio: 2026, mes: 10, numero: 1 });
  });
  it("la 2a de diciembre se cobra en la 1a de enero del año siguiente", () => {
    expect(quincenaDeCobro("2026-12-20", 1)).toEqual({ anio: 2027, mes: 1, numero: 1 });
  });
  it("con desfase 0 se cobra en la misma quincena", () => {
    expect(quincenaDeCobro("2026-09-10", 0)).toEqual({ anio: 2026, mes: 9, numero: 1 });
  });
});

describe("semana lunes-domingo", () => {
  it("diaSemana: 0 domingo ... 6 sábado", () => {
    expect(diaSemana("2026-09-13")).toBe(0); // domingo
    expect(diaSemana("2026-09-14")).toBe(1); // lunes
    expect(diaSemana("2026-09-12")).toBe(6); // sábado
  });
  it("inicioSemana devuelve el lunes de esa semana", () => {
    expect(inicioSemana("2026-09-14")).toBe("2026-09-14"); // lunes
    expect(inicioSemana("2026-09-16")).toBe("2026-09-14"); // miércoles
    expect(inicioSemana("2026-09-13")).toBe("2026-09-07"); // domingo cierra la semana
  });
  it("sumarDias cruza mes y año", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});
