import { describe, it, expect } from "vitest";
import {
  movimientoDeTurno,
  saldo,
  saldoNegativo,
  extracto,
  aplicarTurno,
  editarMovimiento,
} from "../src/dominio/banco";
import type { MovimientoBanco, Turno } from "../src/dominio/tipos";

const H = 60;
const AHORA = "2026-09-20T10:00:00";

function turno(parcial: Partial<Turno> = {}): Turno {
  return {
    id: "t1",
    inicio: "2026-09-14T07:00",
    fin: "2026-09-14T15:00", // 8 h reales
    minutosProgramados: 8 * H,
    tipo: "ordinario",
    creadoEn: AHORA,
    modificadoEn: AHORA,
    ...parcial,
  };
}

let contador = 0;
function mov(parcial: Partial<MovimientoBanco> & Pick<MovimientoBanco, "tipo" | "minutos">): MovimientoBanco {
  return {
    id: `m${++contador}`,
    fecha: "2026-09-01",
    automatico: false,
    creadoEn: AHORA,
    modificadoEn: AHORA,
    ...parcial,
  };
}

const config = { extrasDescuentanDeuda: true };

describe("movimientoDeTurno", () => {
  it("CA2: 8 h programadas y 12 h reales generan un pago de 4 h", () => {
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T19:00" }), config);
    expect(m).toEqual({ fecha: "2026-09-14", tipo: "pago", minutos: -4 * H });
  });

  it("menos horas reales que programadas genera un préstamo por la diferencia", () => {
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T11:00" }), config);
    expect(m).toEqual({ fecha: "2026-09-14", tipo: "prestamo", minutos: 4 * H });
  });

  it("horas reales iguales a las programadas no generan movimiento", () => {
    expect(movimientoDeTurno(turno(), config)).toBeNull();
  });

  it("con el interruptor apagado, las extras no descuentan deuda", () => {
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T19:00" }), { extrasDescuentanDeuda: false });
    expect(m).toBeNull();
  });

  it("con el interruptor apagado, los préstamos se siguen generando", () => {
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T11:00" }), { extrasDescuentanDeuda: false });
    expect(m?.tipo).toBe("prestamo");
  });

  it("turno que cruza la medianoche mide las horas reales completas", () => {
    // 19:00 a 03:00 = 8 h reales, programadas 6 h -> pago de 2 h
    const m = movimientoDeTurno(
      turno({ inicio: "2026-09-12T19:00", fin: "2026-09-13T03:00", minutosProgramados: 6 * H }),
      config,
    );
    expect(m).toEqual({ fecha: "2026-09-12", tipo: "pago", minutos: -2 * H });
  });

  it("CA5: alquiler de 8 h con destino deuda es un pago de 8 h", () => {
    const m = movimientoDeTurno(turno({ tipo: "alquiler", destino: "deuda", minutosProgramados: 0 }), config);
    expect(m).toEqual({ fecha: "2026-09-14", tipo: "pago", minutos: -8 * H });
  });

  it("CA5: alquiler con destino semana no mueve el saldo", () => {
    expect(movimientoDeTurno(turno({ tipo: "alquiler", destino: "semana", minutosProgramados: 0 }), config)).toBeNull();
  });

  it("el alquiler con destino deuda paga aunque el interruptor de extras esté apagado", () => {
    const m = movimientoDeTurno(turno({ tipo: "alquiler", destino: "deuda" }), { extrasDescuentanDeuda: false });
    expect(m?.minutos).toBe(-8 * H);
  });

  it("un alquiler sin destino es un error", () => {
    expect(() => movimientoDeTurno(turno({ tipo: "alquiler" }), config)).toThrow();
  });
});

describe("saldo", () => {
  it("CA3: saldo inicial 40 h + préstamo 6 h - pago 4 h = 42 h", () => {
    const movs = [
      mov({ tipo: "saldo_inicial", minutos: 40 * H }),
      mov({ tipo: "prestamo", minutos: 6 * H }),
      mov({ tipo: "pago", minutos: -4 * H }),
    ];
    expect(saldo(movs)).toBe(42 * H);
  });

  it("sin movimientos el saldo es 0", () => {
    expect(saldo([])).toBe(0);
  });

  it("CA4: un pago que deja el saldo negativo se acepta y avisa", () => {
    const movs = [mov({ tipo: "saldo_inicial", minutos: 2 * H }), mov({ tipo: "pago", minutos: -4 * H })];
    expect(saldo(movs)).toBe(-2 * H);
    expect(saldoNegativo(movs)).toBe(true);
  });

  it("saldo en cero o positivo no avisa", () => {
    expect(saldoNegativo([mov({ tipo: "saldo_inicial", minutos: 2 * H })])).toBe(false);
    expect(saldoNegativo([])).toBe(false);
  });
});

describe("extracto", () => {
  const movs = [
    mov({ id: "c", tipo: "pago", minutos: -4 * H, fecha: "2026-09-10" }),
    mov({ id: "a", tipo: "saldo_inicial", minutos: 40 * H, fecha: "2026-09-01" }),
    mov({ id: "b", tipo: "prestamo", minutos: 6 * H, fecha: "2026-09-05" }),
  ];

  it("ordena por fecha y acumula el saldo después de cada movimiento", () => {
    const e = extracto(movs);
    expect(e.map((f) => f.movimiento.id)).toEqual(["a", "b", "c"]);
    expect(e.map((f) => f.saldoDespues)).toEqual([40 * H, 46 * H, 42 * H]);
  });

  it("misma fecha: desempata por creadoEn", () => {
    const e = extracto([
      mov({ id: "tarde", tipo: "pago", minutos: -H, fecha: "2026-09-10", creadoEn: "2026-09-10T20:00:00" }),
      mov({ id: "temprano", tipo: "prestamo", minutos: H, fecha: "2026-09-10", creadoEn: "2026-09-10T08:00:00" }),
    ]);
    expect(e.map((f) => f.movimiento.id)).toEqual(["temprano", "tarde"]);
  });

  it("CA7: el saldo del último movimiento es igual al saldo de la pantalla principal", () => {
    const e = extracto(movs);
    expect(e[e.length - 1].saldoDespues).toBe(saldo(movs));
  });

  it("no modifica el arreglo original", () => {
    const copia = [...movs];
    extracto(movs);
    expect(movs).toEqual(copia);
  });

  it("sin movimientos devuelve un extracto vacío", () => {
    expect(extracto([])).toEqual([]);
  });
});

describe("aplicarTurno", () => {
  let n = 0;
  const nuevoId = () => `nuevo${++n}`;
  const largo = turno({ fin: "2026-09-14T19:00" }); // pago de 4 h

  it("crea el movimiento automático del turno", () => {
    const r = aplicarTurno([], largo, config, AHORA, nuevoId);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      tipo: "pago",
      minutos: -4 * H,
      turnoId: "t1",
      automatico: true,
      creadoEn: AHORA,
      modificadoEn: AHORA,
    });
  });

  it("al editar el turno, recalcula el movimiento automático conservando id y creadoEn", () => {
    const antes = aplicarTurno([], largo, config, AHORA, nuevoId);
    const despues = aplicarTurno(antes, turno({ fin: "2026-09-14T17:00" }), config, "2026-09-21T09:00:00", nuevoId);
    expect(despues).toHaveLength(1);
    expect(despues[0]).toMatchObject({
      id: antes[0].id,
      minutos: -2 * H,
      creadoEn: AHORA,
      modificadoEn: "2026-09-21T09:00:00",
      automatico: true,
    });
  });

  it("si el turno deja de generar movimiento, se quita el automático", () => {
    const antes = aplicarTurno([], largo, config, AHORA, nuevoId);
    expect(aplicarTurno(antes, turno(), config, AHORA, nuevoId)).toEqual([]);
  });

  it("un movimiento editado a mano no se sobrescribe al editar el turno", () => {
    const antes = aplicarTurno([], largo, config, AHORA, nuevoId);
    const manual = editarMovimiento(antes[0], { minutos: -3 * H, nota: "autorizó la coordinadora" }, "2026-09-21T09:00:00");
    const despues = aplicarTurno([manual], turno({ fin: "2026-09-14T11:00" }), config, "2026-09-22T09:00:00", nuevoId);
    expect(despues).toEqual([manual]);
  });

  it("no toca los movimientos de otros turnos ni los manuales sin turno", () => {
    const otro = mov({ id: "otro", tipo: "prestamo", minutos: H, turnoId: "t2", automatico: true });
    const suelto = mov({ id: "suelto", tipo: "ajuste", minutos: H });
    const r = aplicarTurno([otro, suelto], largo, config, AHORA, nuevoId);
    expect(r).toHaveLength(3);
    expect(r.slice(0, 2)).toEqual([otro, suelto]);
  });

  it("el interruptor apagado quita el pago automático existente", () => {
    const antes = aplicarTurno([], largo, config, AHORA, nuevoId);
    expect(aplicarTurno(antes, largo, { extrasDescuentanDeuda: false }, AHORA, nuevoId)).toEqual([]);
  });
});

describe("editarMovimiento", () => {
  it("marca el movimiento como manual y actualiza modificadoEn", () => {
    const m = mov({ tipo: "pago", minutos: -H, automatico: true });
    const e = editarMovimiento(m, { minutos: -2 * H }, "2026-09-21T09:00:00");
    expect(e).toMatchObject({ minutos: -2 * H, automatico: false, modificadoEn: "2026-09-21T09:00:00", creadoEn: AHORA });
  });

  it("no modifica el original", () => {
    const m = mov({ tipo: "pago", minutos: -H, automatico: true });
    editarMovimiento(m, { minutos: -2 * H }, "2026-09-21T09:00:00");
    expect(m.automatico).toBe(true);
    expect(m.minutos).toBe(-H);
  });
});
