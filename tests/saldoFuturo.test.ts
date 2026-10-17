import { describe, it, expect } from "vitest";
import { esProgramado, minutosAFavor, saldo, saldoActual, saldoAFavor, saldoProyectado } from "../src/dominio/banco";
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

const HOY = "2026-10-15";

describe("CC7: saldo a favor (RF-C6)", () => {
  it("un saldo por debajo de cero es a favor: la clínica le debe a la persona", () => {
    expect(saldoAFavor(-90)).toBe(true);
    expect(minutosAFavor(-90)).toBe(90);
  });
  it("en cero o con deuda no es a favor", () => {
    expect(saldoAFavor(0)).toBe(false);
    expect(saldoAFavor(120)).toBe(false);
    expect(minutosAFavor(0)).toBe(0);
    expect(minutosAFavor(120)).toBe(0);
  });
  it("sale del saldo de los movimientos: debía 2 h y pagó 4 h, le deben 2 h", () => {
    const movs = [mov("1", "2026-10-01", "saldo_inicial", 120), mov("2", "2026-10-10", "pago", -240)];
    expect(minutosAFavor(saldoActual(movs, HOY))).toBe(120);
  });
});

describe("CC8: movimientos programados (RF-C7)", () => {
  it("es programado si su fecha es posterior a hoy; el de hoy ya cuenta", () => {
    expect(esProgramado(mov("1", "2026-10-16", "pago", -60), HOY)).toBe(true);
    expect(esProgramado(mov("2", "2026-10-15", "pago", -60), HOY)).toBe(false);
    expect(esProgramado(mov("3", "2026-10-14", "pago", -60), HOY)).toBe(false);
  });
  it("no cambia el saldo actual, pero sí el proyectado", () => {
    const movs = [mov("1", "2026-10-01", "saldo_inicial", 480), mov("2", "2026-10-20", "pago", -120), mov("3", "2026-11-02", "prestamo", 60)];
    expect(saldoActual(movs, HOY)).toBe(480);
    expect(saldoProyectado(movs)).toBe(420);
  });
  it("cuando llega la fecha, el movimiento pasa a contar en el saldo actual", () => {
    const movs = [mov("1", "2026-10-01", "saldo_inicial", 480), mov("2", "2026-10-20", "pago", -120)];
    expect(saldoActual(movs, "2026-10-19")).toBe(480);
    expect(saldoActual(movs, "2026-10-20")).toBe(360);
  });
  it("sin movimientos futuros, actual y proyectado coinciden con el saldo de siempre", () => {
    const movs = [mov("1", "2026-10-01", "saldo_inicial", 480), mov("2", "2026-10-10", "pago", -60)];
    expect(saldoActual(movs, HOY)).toBe(saldo(movs));
    expect(saldoProyectado(movs)).toBe(saldo(movs));
  });
  it("sin movimientos, todo es cero", () => {
    expect(saldoActual([], HOY)).toBe(0);
    expect(saldoProyectado([])).toBe(0);
  });
});
