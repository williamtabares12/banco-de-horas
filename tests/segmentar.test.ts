import { describe, it, expect } from "vitest";
import { segmentar } from "../src/dominio/segmentar";
import { diasEntre, horaAMinutos } from "../src/dominio/tiempo";

const config = {
  nocturnoDesde: "19:00",
  nocturnoHasta: "06:00",
  festivosAgregados: [],
  festivosQuitados: [],
};

const cero = { diurno: 0, nocturno: 0, dominicalDiurno: 0, dominicalNocturno: 0 };

describe("segmentar", () => {
  it("CA1: sábado 19:00 a domingo 03:00 son 5 h nocturnas y 3 h dominicales nocturnas", () => {
    const r = segmentar("2026-09-12T19:00", "2026-09-13T03:00", config);
    expect(r.total).toEqual({ ...cero, nocturno: 300, dominicalNocturno: 180 });
  });

  it("turno diurno entre semana: todo diurno, lo demás en 0", () => {
    const r = segmentar("2026-09-14T07:00", "2026-09-14T15:00", config);
    expect(r.total).toEqual({ ...cero, diurno: 480 });
  });

  it("CA9: sin horas nocturnas ni dominicales muestra 0 sin errores", () => {
    const r = segmentar("2026-09-14T07:00", "2026-09-14T15:00", config);
    expect(r.total.nocturno).toBe(0);
    expect(r.total.dominicalDiurno).toBe(0);
    expect(r.total.dominicalNocturno).toBe(0);
  });

  it("sábado de noche hasta la mañana del domingo: nocturna, dominical nocturna y dominical diurna", () => {
    const r = segmentar("2026-09-12T22:00", "2026-09-13T08:00", config);
    expect(r.total).toEqual({
      ...cero,
      nocturno: 120,
      dominicalNocturno: 360,
      dominicalDiurno: 120,
    });
  });

  it("domingo a lunes: dominical nocturna hasta la medianoche, nocturna ordinaria después", () => {
    const r = segmentar("2026-09-13T18:00", "2026-09-14T02:00", config);
    expect(r.total).toEqual({
      ...cero,
      dominicalDiurno: 60,
      dominicalNocturno: 300,
      nocturno: 120,
    });
  });

  it("festivo entre semana cuenta como dominical diurno", () => {
    // lunes 12 de octubre de 2026
    const r = segmentar("2026-10-12T08:00", "2026-10-12T16:00", config);
    expect(r.total).toEqual({ ...cero, dominicalDiurno: 480 });
  });

  it("un festivo quitado a mano vuelve a ser día normal", () => {
    const r = segmentar("2026-10-12T08:00", "2026-10-12T16:00", {
      ...config,
      festivosQuitados: ["2026-10-12"],
    });
    expect(r.total).toEqual({ ...cero, diurno: 480 });
  });

  it("un festivo agregado a mano cuenta como dominical", () => {
    const r = segmentar("2026-10-13T08:00", "2026-10-13T16:00", {
      ...config,
      festivosAgregados: ["2026-10-13"],
    });
    expect(r.total).toEqual({ ...cero, dominicalDiurno: 480 });
  });

  it("agrupa por quincena cuando el turno cruza del 15 al 16", () => {
    const r = segmentar("2026-09-15T18:00", "2026-09-16T02:00", config);
    expect(r.total).toEqual({ ...cero, diurno: 60, nocturno: 420 });
    expect(r.porQuincena).toEqual([
      { quincena: { anio: 2026, mes: 9, numero: 1 }, minutos: { ...cero, diurno: 60, nocturno: 300 } },
      { quincena: { anio: 2026, mes: 9, numero: 2 }, minutos: { ...cero, nocturno: 120 } },
    ]);
  });

  it("agrupa por quincena cuando el turno cruza de mes y de año", () => {
    const r = segmentar("2026-12-31T22:00", "2027-01-01T02:00", config);
    expect(r.porQuincena.map((p) => p.quincena)).toEqual([
      { anio: 2026, mes: 12, numero: 2 },
      { anio: 2027, mes: 1, numero: 1 },
    ]);
  });

  it("respeta el inicio de jornada nocturna de la configuración", () => {
    const r = segmentar("2026-09-14T18:00", "2026-09-14T21:00", { ...config, nocturnoDesde: "20:00" });
    expect(r.total).toEqual({ ...cero, diurno: 120, nocturno: 60 });
  });

  it("la suma de categorías es igual a la duración del turno", () => {
    const r = segmentar("2026-09-12T07:30", "2026-09-13T19:45", config);
    const suma = r.total.diurno + r.total.nocturno + r.total.dominicalDiurno + r.total.dominicalNocturno;
    expect(suma).toBe(36 * 60 + 15);
  });

  it("rechaza un turno cuyo fin no es posterior al inicio", () => {
    expect(() => segmentar("2026-09-14T10:00", "2026-09-14T10:00", config)).toThrow();
    expect(() => segmentar("2026-09-14T10:00", "2026-09-14T09:00", config)).toThrow();
  });
});

describe("helpers de tiempo para segmentar", () => {
  it("diasEntre cuenta días calendario", () => {
    expect(diasEntre("2026-09-12", "2026-09-13")).toBe(1);
    expect(diasEntre("2026-12-31", "2027-01-02")).toBe(2);
  });
  it("horaAMinutos convierte HH:mm", () => {
    expect(horaAMinutos("19:00")).toBe(1140);
    expect(horaAMinutos("06:30")).toBe(390);
  });
});
