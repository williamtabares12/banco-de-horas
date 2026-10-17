import { describe, it, expect } from "vitest";
import { cantidadProgramados, saldoCorto, textoDeSaldo } from "../src/dominio/banco";
import type { MovimientoBanco } from "../src/dominio/tipos";

const mov = (id: string, fecha: string, tipo: MovimientoBanco["tipo"], minutos: number): MovimientoBanco => ({
  id,
  fecha,
  tipo,
  minutos,
  automatico: false,
  creadoEn: "2026-10-01T08:00:00",
  modificadoEn: "2026-10-01T08:00:00",
});

describe("textoDeSaldo (RF-C6, CC7): cómo se dice el saldo", () => {
  it("con deuda: 'Debo a la clínica' y las horas", () => {
    expect(textoDeSaldo(31 * 60)).toEqual({ etiqueta: "Debo a la clínica", duracion: "31 h", aFavor: false });
  });
  it("en cero: 'Debo a la clínica 0 h', sin avisos", () => {
    expect(textoDeSaldo(0)).toEqual({ etiqueta: "Debo a la clínica", duracion: "0 h", aFavor: false });
  });
  it("por debajo de cero: 'La clínica te debe X h', con las horas en positivo (nada de signos ni errores)", () => {
    expect(textoDeSaldo(-90)).toEqual({ etiqueta: "La clínica te debe", duracion: "1 h 30 min", aFavor: true });
    expect(textoDeSaldo(-120).duracion).toBe("2 h");
  });
});

describe("saldoCorto: el saldo en una celda de tabla", () => {
  it("con deuda o en cero, solo las horas", () => {
    expect(saldoCorto(8 * 60)).toBe("8 h");
    expect(saldoCorto(0)).toBe("0 h");
  });
  it("a favor, lo dice con palabras y sin signo", () => {
    expect(saldoCorto(-120)).toBe("La clínica te debe 2 h");
  });
});

describe("cantidadProgramados (RF-C7)", () => {
  const hoy = "2026-10-15";
  it("cuenta los movimientos con fecha posterior a hoy; el de hoy ya cuenta", () => {
    const movs = [mov("1", "2026-10-14", "pago", -60), mov("2", "2026-10-15", "pago", -60), mov("3", "2026-10-16", "pago", -60), mov("4", "2027-01-01", "prestamo", 60)];
    expect(cantidadProgramados(movs, hoy)).toBe(2);
  });
  it("sin movimientos futuros es cero", () => {
    expect(cantidadProgramados([mov("1", "2026-10-01", "saldo_inicial", 60)], hoy)).toBe(0);
    expect(cantidadProgramados([], hoy)).toBe(0);
  });
});
