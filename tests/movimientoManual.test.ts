import { describe, it, expect } from "vitest";
import { nuevoMovimiento, minutosConSigno, saldo } from "../src/dominio/banco";

const AHORA = "2026-09-20T10:00:00";
const H = 60;

describe("minutosConSigno", () => {
  it("saldo inicial y préstamo suben la deuda", () => {
    expect(minutosConSigno("saldo_inicial", 40 * H)).toBe(40 * H);
    expect(minutosConSigno("prestamo", 6 * H)).toBe(6 * H);
  });
  it("el pago baja la deuda aunque se escriba en positivo", () => {
    expect(minutosConSigno("pago", 4 * H)).toBe(-4 * H);
    expect(minutosConSigno("pago", -4 * H)).toBe(-4 * H);
  });
  it("el ajuste conserva su signo", () => {
    expect(minutosConSigno("ajuste", 30)).toBe(30);
    expect(minutosConSigno("ajuste", -30)).toBe(-30);
  });
});

describe("nuevoMovimiento", () => {
  it("crea un movimiento manual con fechas de creación y modificación", () => {
    const m = nuevoMovimiento({ tipo: "prestamo", fecha: "2026-09-10", minutos: 6 * H, nota: "  Autorizó la coordinadora " }, AHORA, "m1");
    expect(m).toEqual({
      id: "m1",
      fecha: "2026-09-10",
      tipo: "prestamo",
      minutos: 6 * H,
      automatico: false,
      nota: "Autorizó la coordinadora",
      creadoEn: AHORA,
      modificadoEn: AHORA,
    });
  });

  it("sin nota o con nota vacía no guarda el campo", () => {
    const m = nuevoMovimiento({ tipo: "pago", fecha: "2026-09-10", minutos: 4 * H, nota: "   " }, AHORA, "m1");
    expect(m).not.toHaveProperty("nota");
  });

  it("un pago queda negativo", () => {
    const m = nuevoMovimiento({ tipo: "pago", fecha: "2026-09-10", minutos: 4 * H }, AHORA, "m1");
    expect(m.minutos).toBe(-4 * H);
  });

  it("CA3 armado con movimientos manuales: 40 h + 6 h - 4 h = 42 h", () => {
    const movs = [
      nuevoMovimiento({ tipo: "saldo_inicial", fecha: "2026-09-01", minutos: 40 * H }, AHORA, "a"),
      nuevoMovimiento({ tipo: "prestamo", fecha: "2026-09-05", minutos: 6 * H }, AHORA, "b"),
      nuevoMovimiento({ tipo: "pago", fecha: "2026-09-10", minutos: 4 * H }, AHORA, "c"),
    ];
    expect(saldo(movs)).toBe(42 * H);
  });

  it("rechaza movimientos de 0 minutos", () => {
    expect(() => nuevoMovimiento({ tipo: "pago", fecha: "2026-09-10", minutos: 0 }, AHORA, "m1")).toThrow();
  });

  it("rechaza minutos con decimales", () => {
    expect(() => nuevoMovimiento({ tipo: "pago", fecha: "2026-09-10", minutos: 10.5 }, AHORA, "m1")).toThrow();
  });

  it("rechaza una fecha con formato inválido", () => {
    expect(() => nuevoMovimiento({ tipo: "pago", fecha: "10/09/2026", minutos: 60 }, AHORA, "m1")).toThrow();
    expect(() => nuevoMovimiento({ tipo: "pago", fecha: "", minutos: 60 }, AHORA, "m1")).toThrow();
  });
});
