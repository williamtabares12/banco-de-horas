import { describe, it, expect } from "vitest";
import { aplicarTurno, extracto, nuevoMovimiento, saldo } from "../src/dominio/banco";
import { nuevoTurno } from "../src/dominio/turnos";
import type { MovimientoBanco } from "../src/dominio/tipos";

const H = 60;
const config = { extrasDescuentanDeuda: true };

// Un banco armado como lo arma la app: movimientos cargados a mano y otros que nacen de turnos.
function armarBanco(): MovimientoBanco[] {
  let n = 0;
  const id = () => `id${++n}`;
  let movs: MovimientoBanco[] = [
    nuevoMovimiento({ tipo: "saldo_inicial", fecha: "2026-08-10", minutos: 40 * H, nota: "Saldo tras el terremoto" }, "2026-08-10T08:00:00", id()),
    nuevoMovimiento({ tipo: "prestamo", fecha: "2026-09-02", minutos: 6 * H }, "2026-09-02T08:00:00", id()),
  ];
  // 12 h reales con 8 programadas: pago automático de 4 h
  const extra = nuevoTurno(
    { inicio: "2026-09-14T07:00", fin: "2026-09-14T19:00", minutosProgramados: 8 * H, tipo: "ordinario" },
    "2026-09-14T20:00:00",
    "t1",
  );
  movs = aplicarTurno(movs, extra, config, "2026-09-14T20:00:00", id);
  // alquiler de 8 h para pagar deuda
  const alquiler = nuevoTurno(
    { inicio: "2026-09-19T08:00", fin: "2026-09-19T16:00", minutosProgramados: 0, tipo: "alquiler", destino: "deuda" },
    "2026-09-19T17:00:00",
    "t2",
  );
  return aplicarTurno(movs, alquiler, config, "2026-09-19T17:00:00", id);
}

describe("extracto de horas", () => {
  it("empieza con el saldo inicial y acumula el saldo movimiento a movimiento", () => {
    const filas = extracto(armarBanco());
    expect(filas.map((f) => f.movimiento.tipo)).toEqual(["saldo_inicial", "prestamo", "pago", "pago"]);
    expect(filas.map((f) => f.saldoDespues)).toEqual([40 * H, 46 * H, 42 * H, 34 * H]);
  });

  it("CA7: el saldo del último movimiento es el de la pantalla principal", () => {
    const movs = armarBanco();
    const filas = extracto(movs);
    expect(filas[filas.length - 1].saldoDespues).toBe(saldo(movs));
    expect(saldo(movs)).toBe(34 * H);
  });

  it("cada fila conserva su fecha y su nota", () => {
    const filas = extracto(armarBanco());
    expect(filas[0].movimiento).toMatchObject({ fecha: "2026-08-10", nota: "Saldo tras el terremoto" });
    expect(filas[2].movimiento).toMatchObject({ fecha: "2026-09-14", turnoId: "t1" });
  });
});
