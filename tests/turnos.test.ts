import { describe, it, expect } from "vitest";
import { fechasDeTurno, nuevoTurno, editarTurno, borrarTurno, type EntradaTurno } from "../src/dominio/turnos";
import { totales } from "../src/dominio/banco";
import type { MovimientoBanco, Turno } from "../src/dominio/tipos";

const AHORA = "2026-09-20T10:00:00";
const OTRO = "2026-09-21T09:00:00";

const ordinario: EntradaTurno = {
  inicio: "2026-09-14T07:00",
  fin: "2026-09-14T15:00",
  minutosProgramados: 480,
  tipo: "ordinario",
};

describe("fechasDeTurno", () => {
  it("turno dentro del mismo día", () => {
    expect(fechasDeTurno("2026-09-14", "07:00", "15:00")).toEqual({
      inicio: "2026-09-14T07:00",
      fin: "2026-09-14T15:00",
    });
  });
  it("si la hora de fin es menor, el turno termina al día siguiente", () => {
    expect(fechasDeTurno("2026-09-12", "19:00", "03:00")).toEqual({
      inicio: "2026-09-12T19:00",
      fin: "2026-09-13T03:00",
    });
  });
  it("cruza el fin de año", () => {
    expect(fechasDeTurno("2026-12-31", "22:00", "06:00").fin).toBe("2027-01-01T06:00");
  });
  it("misma hora de inicio y fin es un turno de 24 horas", () => {
    expect(fechasDeTurno("2026-09-14", "07:00", "07:00").fin).toBe("2026-09-15T07:00");
  });
  it("rechaza fecha u horas con formato inválido", () => {
    expect(() => fechasDeTurno("", "07:00", "15:00")).toThrow();
    expect(() => fechasDeTurno("2026-09-14", "7am", "15:00")).toThrow();
    expect(() => fechasDeTurno("2026-09-14", "07:00", "")).toThrow();
  });
});

describe("nuevoTurno", () => {
  it("crea un turno ordinario con fechas de creación y modificación", () => {
    expect(nuevoTurno({ ...ordinario, nota: "  Cirugía cancelada " }, AHORA, "t1")).toEqual({
      id: "t1",
      ...ordinario,
      descansoMin: 0,
      nota: "Cirugía cancelada",
      creadoEn: AHORA,
      modificadoEn: AHORA,
    });
  });

  it("sin nota o con nota vacía no guarda el campo", () => {
    expect(nuevoTurno({ ...ordinario, nota: "  " }, AHORA, "t1")).not.toHaveProperty("nota");
  });

  it("un turno ordinario descarta el destino", () => {
    const t = nuevoTurno({ ...ordinario, destino: "deuda" }, AHORA, "t1");
    expect(t).not.toHaveProperty("destino");
  });

  it("un alquiler conserva su destino y no tiene horas programadas", () => {
    const t = nuevoTurno({ ...ordinario, tipo: "alquiler", destino: "semana", minutosProgramados: 480 }, AHORA, "t1");
    expect(t).toMatchObject({ tipo: "alquiler", destino: "semana", minutosProgramados: 0 });
  });

  it("un alquiler sin destino es un error", () => {
    expect(() => nuevoTurno({ ...ordinario, tipo: "alquiler" }, AHORA, "t1")).toThrow(/destino/i);
  });

  it("rechaza un fin que no es posterior al inicio", () => {
    expect(() => nuevoTurno({ ...ordinario, fin: ordinario.inicio }, AHORA, "t1")).toThrow();
    expect(() => nuevoTurno({ ...ordinario, fin: "2026-09-14T06:00" }, AHORA, "t1")).toThrow();
  });

  it("rechaza horas programadas negativas o con decimales", () => {
    expect(() => nuevoTurno({ ...ordinario, minutosProgramados: -1 }, AHORA, "t1")).toThrow();
    expect(() => nuevoTurno({ ...ordinario, minutosProgramados: 10.5 }, AHORA, "t1")).toThrow();
  });

  it("rechaza fechas con formato inválido", () => {
    expect(() => nuevoTurno({ ...ordinario, inicio: "14/09/2026 07:00" }, AHORA, "t1")).toThrow();
  });
});

describe("editarTurno", () => {
  const original = nuevoTurno(ordinario, AHORA, "t1");

  it("conserva id y creadoEn, y actualiza modificadoEn", () => {
    const t = editarTurno(original, { ...ordinario, fin: "2026-09-14T11:00" }, OTRO);
    expect(t).toMatchObject({ id: "t1", creadoEn: AHORA, modificadoEn: OTRO, fin: "2026-09-14T11:00" });
  });

  it("no modifica el original", () => {
    const copia = { ...original };
    editarTurno(original, { ...ordinario, fin: "2026-09-14T11:00" }, OTRO);
    expect(original).toEqual(copia);
  });

  it("al pasar de alquiler a ordinario se descarta el destino", () => {
    const alquiler = nuevoTurno({ ...ordinario, tipo: "alquiler", destino: "deuda" }, AHORA, "t2");
    const t = editarTurno(alquiler, ordinario, OTRO);
    expect(t).not.toHaveProperty("destino");
    expect(t.minutosProgramados).toBe(480);
  });

  it("aplica las mismas validaciones que al crear", () => {
    expect(() => editarTurno(original, { ...ordinario, tipo: "alquiler" }, OTRO)).toThrow();
  });
});

function mov(parcial: Partial<MovimientoBanco> & Pick<MovimientoBanco, "id" | "tipo" | "minutos">): MovimientoBanco {
  return { fecha: "2026-09-14", automatico: false, creadoEn: AHORA, modificadoEn: AHORA, ...parcial };
}

describe("borrarTurno", () => {
  const t1: Turno = nuevoTurno(ordinario, AHORA, "t1");
  const t2: Turno = nuevoTurno({ ...ordinario, inicio: "2026-09-15T07:00", fin: "2026-09-15T15:00" }, AHORA, "t2");

  it("quita el turno y su movimiento automático", () => {
    const auto = mov({ id: "m1", tipo: "pago", minutos: -60, turnoId: "t1", automatico: true });
    const r = borrarTurno([t1, t2], [auto], "t1", OTRO);
    expect(r.turnos).toEqual([t2]);
    expect(r.movimientos).toEqual([]);
  });

  it("conserva el movimiento editado a mano, ya sin vínculo con el turno", () => {
    const manual = mov({ id: "m1", tipo: "pago", minutos: -90, turnoId: "t1", automatico: false, nota: "autorizó" });
    const r = borrarTurno([t1], [manual], "t1", OTRO);
    expect(r.movimientos).toHaveLength(1);
    expect(r.movimientos[0]).toMatchObject({ id: "m1", minutos: -90, nota: "autorizó", modificadoEn: OTRO });
    expect(r.movimientos[0]).not.toHaveProperty("turnoId");
  });

  it("no toca los movimientos de otros turnos ni los sueltos", () => {
    const otro = mov({ id: "m2", tipo: "prestamo", minutos: 60, turnoId: "t2", automatico: true });
    const suelto = mov({ id: "m3", tipo: "ajuste", minutos: 30 });
    const r = borrarTurno([t1, t2], [otro, suelto], "t1", OTRO);
    expect(r.movimientos).toEqual([otro, suelto]);
  });
});

describe("totales", () => {
  it("suma lo prestado y lo pagado, sin contar saldo inicial ni ajustes", () => {
    const movs = [
      mov({ id: "a", tipo: "saldo_inicial", minutos: 2400 }),
      mov({ id: "b", tipo: "prestamo", minutos: 360 }),
      mov({ id: "c", tipo: "prestamo", minutos: 120 }),
      mov({ id: "d", tipo: "pago", minutos: -240 }),
      mov({ id: "e", tipo: "pago", minutos: -60 }),
      mov({ id: "f", tipo: "ajuste", minutos: 600 }),
    ];
    expect(totales(movs)).toEqual({ prestado: 480, pagado: 300 });
  });

  it("sin movimientos son 0", () => {
    expect(totales([])).toEqual({ prestado: 0, pagado: 0 });
  });
});
