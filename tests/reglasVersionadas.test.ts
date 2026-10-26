import { describe, it, expect } from "vitest";
import { aplicarTurno, movimientoDeTurno } from "../src/dominio/banco";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { colillaDeQuincena, horasDeQuincena } from "../src/dominio/quincena";
import { REGLAS_POR_DEFECTO, reglasDeConfig, reglasVigentes, type ReglaGlobal, type ReglasGlobales } from "../src/dominio/reglas";
import { metaSemana } from "../src/dominio/semana";
import { segmentar } from "../src/dominio/segmentar";
import { quincenaDeCobro } from "../src/dominio/tiempo";
import type { Turno } from "../src/dominio/tipos";

const regla = (cambios: Partial<ReglaGlobal> = {}): ReglaGlobal => ({
  nocturnoDesde: "19:00",
  nocturnoHasta: "06:00",
  minutosSemana: 2520,
  desfaseQuincenas: 1,
  extrasDescuentanDeuda: true,
  ...cambios,
});

const SIN_FESTIVOS = { festivosAgregados: [], festivosQuitados: [] };
const CONFIG = { ...SIN_FESTIVOS, nocturnoDesde: "19:00", nocturnoHasta: "06:00" };

describe("reglasVigentes: la regla que rige en una fecha", () => {
  const dos: ReglasGlobales = {
    "2026-01-01": regla({ minutosSemana: 2520 }),
    "2027-01-01": regla({ minutosSemana: 2400 }),
  };

  it("con una sola regla, rige desde su fecha en adelante", () => {
    const una: ReglasGlobales = { "2026-01-01": regla() };
    expect(reglasVigentes(una, "2026-01-01")).toEqual(regla());
    expect(reglasVigentes(una, "2030-06-15")).toEqual(regla());
  });
  it("antes de la primera regla rige la primera (hacia atrás)", () => {
    expect(reglasVigentes(dos, "2025-03-10").minutosSemana).toBe(2520);
    expect(reglasVigentes(dos, "2000-01-01").minutosSemana).toBe(2520);
  });
  it("una regla nueva rige desde su fecha, y no antes", () => {
    expect(reglasVigentes(dos, "2026-12-31").minutosSemana).toBe(2520);
    expect(reglasVigentes(dos, "2027-01-01").minutosSemana).toBe(2400);
    expect(reglasVigentes(dos, "2027-06-01").minutosSemana).toBe(2400);
  });
  it("no importa en qué orden estén las claves (la consola de Firebase no garantiza orden)", () => {
    const desordenadas: ReglasGlobales = {
      "2028-01-01": regla({ minutosSemana: 2000 }),
      "2026-01-01": regla({ minutosSemana: 2520 }),
      "2027-01-01": regla({ minutosSemana: 2400 }),
    };
    expect(reglasVigentes(desordenadas, "2027-05-05").minutosSemana).toBe(2400);
    expect(reglasVigentes(desordenadas, "2026-05-05").minutosSemana).toBe(2520);
    expect(reglasVigentes(desordenadas, "2029-01-01").minutosSemana).toBe(2000);
  });
  it("sin ninguna regla no se calcula nada a medias: lanza error", () => {
    expect(() => reglasVigentes({}, "2026-10-15")).toThrow(/regla/i);
  });
});

describe("reglas por defecto", () => {
  it("son las del documento inicial (parametros-iniciales.md)", () => {
    expect(REGLAS_POR_DEFECTO).toEqual({
      "2026-01-01": {
        nocturnoDesde: "19:00",
        nocturnoHasta: "06:00",
        minutosSemana: 2520,
        inicioSemana: 0,
        desfaseQuincenas: 1,
        extrasDescuentanDeuda: true,
      },
    });
  });
  it("coinciden con los valores por defecto de la configuración personal", () => {
    const r = reglasVigentes(REGLAS_POR_DEFECTO, "2026-10-15");
    expect(r.nocturnoDesde).toBe(CONFIG_POR_DEFECTO.nocturnoDesde);
    expect(r.nocturnoHasta).toBe(CONFIG_POR_DEFECTO.nocturnoHasta);
    expect(r.minutosSemana).toBe(CONFIG_POR_DEFECTO.minutosSemana);
    expect(r.desfaseQuincenas).toBe(CONFIG_POR_DEFECTO.desfaseQuincenas);
    expect(r.extrasDescuentanDeuda).toBe(CONFIG_POR_DEFECTO.extrasDescuentanDeuda);
  });
  it("la configuración personal se puede ver como una sola regla que rige siempre", () => {
    const personal = { ...CONFIG_POR_DEFECTO, nocturnoDesde: "20:00", minutosSemana: 40 * 60 };
    const r = reglasVigentes(reglasDeConfig(personal), "1999-01-01");
    expect(r.nocturnoDesde).toBe("20:00");
    expect(r.minutosSemana).toBe(2400);
    expect(reglasVigentes(reglasDeConfig(personal), "2099-12-31")).toEqual(r);
  });
});

describe("segmentar con reglas versionadas (por minuto)", () => {
  // Del lunes 19 al martes 20 de octubre de 2026 (sin festivos): la regla nueva rige desde el martes 20.
  const reglas: ReglasGlobales = {
    "2026-01-01": regla({ nocturnoDesde: "19:00", nocturnoHasta: "06:00" }),
    "2026-10-20": regla({ nocturnoDesde: "20:00", nocturnoHasta: "07:00" }),
  };

  it("cada minuto usa la regla de SU fecha calendario, aunque el turno cruce el cambio", () => {
    // Lunes 19 (regla vieja): 19:00 a 24:00 = 300 min de noche.
    // Martes 20 (regla nueva, noche hasta las 07:00): 00:00 a 07:00 = 420 min de noche y 07:00 a 08:00 = 60 de día.
    const s = segmentar("2026-10-19T19:00", "2026-10-20T08:00", { ...SIN_FESTIVOS, nocturnoDesde: "19:00", nocturnoHasta: "06:00" }, 0, reglas);
    expect(s.total).toEqual({ diurno: 60, nocturno: 720, dominicalDiurno: 0, dominicalNocturno: 0 });
  });

  it("CC16: una regla con fecha futura no cambia el cálculo de turnos anteriores a esa fecha", () => {
    const soloVieja: ReglasGlobales = { "2026-01-01": regla() };
    const conFutura: ReglasGlobales = { ...soloVieja, "2026-10-20": regla({ nocturnoDesde: "21:00", nocturnoHasta: "05:00" }) };
    const antes = segmentar("2026-10-14T19:00", "2026-10-15T07:00", CONFIG, 0, soloVieja);
    const despues = segmentar("2026-10-14T19:00", "2026-10-15T07:00", CONFIG, 0, conFutura);
    expect(despues).toEqual(antes);
  });

  it("después de la fecha de vigencia sí aplica la regla nueva", () => {
    const conFutura: ReglasGlobales = {
      "2026-01-01": regla(),
      "2026-10-20": regla({ nocturnoDesde: "21:00", nocturnoHasta: "06:00" }),
    };
    // Martes 20, 19:00 a miércoles 21, 07:00. Martes (21:00): 19 a 21 de día (120), 21 a 24 de noche (180).
    // Miércoles: 00 a 06 de noche (360) y 06 a 07 de día (60).
    const s = segmentar("2026-10-20T19:00", "2026-10-21T07:00", CONFIG, 0, conFutura);
    expect(s.total).toEqual({ diurno: 180, nocturno: 540, dominicalDiurno: 0, dominicalNocturno: 0 });
  });

  it("si se pasan reglas, mandan sobre la hora nocturna de la configuración (los festivos siguen saliendo de la configuración)", () => {
    const s = segmentar("2026-10-20T19:00", "2026-10-20T23:00", { ...SIN_FESTIVOS, nocturnoDesde: "19:00", nocturnoHasta: "06:00" }, 0, {
      "2026-01-01": regla({ nocturnoDesde: "21:00" }),
    });
    expect(s.total.diurno).toBe(120);
    expect(s.total.nocturno).toBe(120);
    const festivo = segmentar("2026-10-20T19:00", "2026-10-20T23:00", { festivosAgregados: ["2026-10-20"], festivosQuitados: [], nocturnoDesde: "19:00", nocturnoHasta: "06:00" }, 0, {
      "2026-01-01": regla({ nocturnoDesde: "21:00" }),
    });
    expect(festivo.total).toEqual({ diurno: 0, nocturno: 0, dominicalDiurno: 120, dominicalNocturno: 120 });
  });

  it("sin reglas se usa la configuración, igual que antes", () => {
    const sinReglas = segmentar("2026-10-20T19:00", "2026-10-21T07:00", { ...SIN_FESTIVOS, nocturnoDesde: "21:00", nocturnoHasta: "06:00" });
    expect(sinReglas.total).toEqual({ diurno: 180, nocturno: 540, dominicalDiurno: 0, dominicalNocturno: 0 });
  });

  it("el descanso se sigue restando de la categoría mayoritaria", () => {
    const s = segmentar("2026-10-20T19:00", "2026-10-21T07:00", CONFIG, 60, { "2026-01-01": regla({ nocturnoDesde: "21:00" }) });
    expect(s.total).toEqual({ diurno: 180, nocturno: 480, dominicalDiurno: 0, dominicalNocturno: 0 });
  });
});

describe("horas de la quincena con reglas", () => {
  const turno = (id: string, inicio: string, fin: string): Turno => ({
    id,
    inicio,
    fin,
    descansoMin: 0,
    minutosProgramados: 720,
    tipo: "ordinario",
    creadoEn: "2026-10-01T08:00:00",
    modificadoEn: "2026-10-01T08:00:00",
  });

  it("una regla que arranca el 20 de octubre solo afecta los turnos desde esa fecha", () => {
    const turnos = [turno("a", "2026-10-14T19:00", "2026-10-15T07:00"), turno("b", "2026-10-20T19:00", "2026-10-21T07:00")];
    const reglas: ReglasGlobales = { "2026-01-01": regla(), "2026-10-20": regla({ nocturnoDesde: "21:00" }) };
    const q1 = horasDeQuincena(turnos, { anio: 2026, mes: 10, numero: 1 }, CONFIG, reglas);
    const q2 = horasDeQuincena(turnos, { anio: 2026, mes: 10, numero: 2 }, CONFIG, reglas);
    // 1.ª quincena (hasta el 15): el turno del 14 al 15 con la regla vieja (19:00): del 14, 19:00 a 24:00 = 300 de noche;
    // del 15, 00:00 a 07:00 = 360 de noche y 60 de día.
    expect(q1).toEqual({ diurno: 60, nocturno: 660, dominicalDiurno: 0, dominicalNocturno: 0 });
    // 2.ª: el turno del 20 al 21 con la regla nueva (21:00): 120 de día + 180 de noche, y 360 de noche + 60 de día.
    expect(q2).toEqual({ diurno: 180, nocturno: 540, dominicalDiurno: 0, dominicalNocturno: 0 });
  });
});

describe("meta semanal versionada", () => {
  const reglas: ReglasGlobales = {
    "2026-01-01": regla({ minutosSemana: 2520 }),
    "2026-10-21": regla({ minutosSemana: 2400 }), // un miércoles, a mitad de semana
  };

  it("sin reglas, la meta es la de las reglas por defecto (42 h)", () => {
    expect(metaSemana("2026-10-15")).toBe(2520);
  });
  it("se busca con el domingo de esa semana: una regla que arranca a mitad de semana empieza a regir la semana siguiente", () => {
    expect(metaSemana("2026-10-19", reglas)).toBe(2520); // lunes
    expect(metaSemana("2026-10-21", reglas)).toBe(2520); // el miércoles del cambio: la semana empezó antes
    expect(metaSemana("2026-10-24", reglas)).toBe(2520); // sábado de esa semana
    expect(metaSemana("2026-10-25", reglas)).toBe(2400); // domingo siguiente
  });
});

describe("desfase de la colilla versionado", () => {
  // Desde el 16 de octubre lo trabajado se cobra en la misma quincena.
  const reglas: ReglasGlobales = {
    "2026-01-01": regla({ desfaseQuincenas: 1 }),
    "2026-10-16": regla({ desfaseQuincenas: 0 }),
  };

  it("se busca con el primer día de la quincena", () => {
    expect(quincenaDeCobro("2026-10-10", reglas)).toEqual({ anio: 2026, mes: 10, numero: 2 }); // 1.ª quincena: regla vieja, desfase 1
    expect(quincenaDeCobro("2026-10-20", reglas)).toEqual({ anio: 2026, mes: 10, numero: 2 }); // 2.ª: regla nueva, desfase 0
    expect(quincenaDeCobro("2026-10-15", reglas)).toEqual({ anio: 2026, mes: 10, numero: 2 }); // aún vieja
    expect(quincenaDeCobro("2026-11-03", reglas)).toEqual({ anio: 2026, mes: 11, numero: 1 }); // nueva: misma quincena
  });
  it("sigue aceptando el desfase suelto, como antes", () => {
    expect(quincenaDeCobro("2026-10-10", 1)).toEqual({ anio: 2026, mes: 10, numero: 2 });
    expect(quincenaDeCobro("2026-10-10", 0)).toEqual({ anio: 2026, mes: 10, numero: 1 });
  });
  it("la colilla de una quincena también se puede pedir con las reglas", () => {
    expect(colillaDeQuincena({ anio: 2026, mes: 10, numero: 1 }, reglas)).toEqual({ anio: 2026, mes: 10, numero: 2 });
    expect(colillaDeQuincena({ anio: 2026, mes: 10, numero: 2 }, reglas)).toEqual({ anio: 2026, mes: 10, numero: 2 });
  });
});

describe("extras que descuentan deuda, versionado", () => {
  const turnoExtra = (inicio: string, fin: string): Turno => ({
    id: "t",
    inicio,
    fin,
    descansoMin: 0,
    minutosProgramados: 480,
    tipo: "ordinario",
    creadoEn: "2026-10-01T08:00:00",
    modificadoEn: "2026-10-01T08:00:00",
  });
  // 8 h programadas y 12 h reales: 4 h extra. Desde el 1 de noviembre las extras ya no descuentan deuda.
  const reglas: ReglasGlobales = {
    "2026-01-01": regla({ extrasDescuentanDeuda: true }),
    "2026-11-01": regla({ extrasDescuentanDeuda: false }),
  };

  it("se busca con la fecha de inicio del turno", () => {
    expect(movimientoDeTurno(turnoExtra("2026-10-31T07:00", "2026-10-31T19:00"), { extrasDescuentanDeuda: false }, reglas)).toEqual({
      fecha: "2026-10-31",
      tipo: "pago",
      minutos: -240,
    });
    expect(movimientoDeTurno(turnoExtra("2026-11-02T07:00", "2026-11-02T19:00"), { extrasDescuentanDeuda: true }, reglas)).toBeNull();
  });
  it("sin reglas se usa la configuración, igual que antes", () => {
    expect(movimientoDeTurno(turnoExtra("2026-10-31T07:00", "2026-10-31T19:00"), { extrasDescuentanDeuda: false })).toBeNull();
    expect(movimientoDeTurno(turnoExtra("2026-10-31T07:00", "2026-10-31T19:00"), { extrasDescuentanDeuda: true })?.minutos).toBe(-240);
  });
  it("aplicarTurno también recibe las reglas", () => {
    const antes = aplicarTurno([], turnoExtra("2026-10-31T07:00", "2026-10-31T19:00"), { extrasDescuentanDeuda: false }, "2026-10-31T20:00:00", () => "m1", reglas);
    const despues = aplicarTurno([], turnoExtra("2026-11-02T07:00", "2026-11-02T19:00"), { extrasDescuentanDeuda: true }, "2026-11-02T20:00:00", () => "m2", reglas);
    expect(antes).toHaveLength(1);
    expect(despues).toHaveLength(0);
  });
});
