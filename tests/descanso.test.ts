import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importarJSON } from "../src/almacenamiento/respaldo";
import { segmentar } from "../src/dominio/segmentar";
import { movimientoDeTurno } from "../src/dominio/banco";
import { minutosDeSemana } from "../src/dominio/semana";
import { horasDeQuincena } from "../src/dominio/quincena";
import { minutosNetos, nuevoTurno } from "../src/dominio/turnos";
import type { Turno } from "../src/dominio/tipos";

const H = 60;
const AHORA = "2026-09-20T10:00:00";
const config = { nocturnoDesde: "19:00", nocturnoHasta: "06:00", festivosAgregados: [], festivosQuitados: [] };
const cero = { diurno: 0, nocturno: 0, dominicalDiurno: 0, dominicalNocturno: 0 };
const extrasSi = { extrasDescuentanDeuda: true };

function turno(parcial: Partial<Turno> = {}): Turno {
  return {
    id: "t1",
    inicio: "2026-09-14T07:00", // lunes
    fin: "2026-09-14T16:00",
    descansoMin: 60,
    minutosProgramados: 8 * H,
    tipo: "ordinario",
    creadoEn: AHORA,
    modificadoEn: AHORA,
    ...parcial,
  };
}

describe("minutosNetos", () => {
  it("son los minutos de reloj menos el descanso", () => {
    expect(minutosNetos(turno())).toBe(8 * H); // 07:00 a 16:00, 60 min de almuerzo
  });
  it("sin descanso son los minutos de reloj", () => {
    expect(minutosNetos(turno({ descansoMin: 0 }))).toBe(9 * H);
  });
  it("cruza la medianoche", () => {
    expect(minutosNetos(turno({ inicio: "2026-09-14T19:00", fin: "2026-09-15T07:00", descansoMin: 120 }))).toBe(10 * H);
  });
});

describe("segmentar con descanso", () => {
  it("CA10: lunes 07:00 a 16:00 con 60 min de descanso son 8 h netas, todas diurnas", () => {
    const r = segmentar("2026-09-14T07:00", "2026-09-14T16:00", config, 60);
    expect(r.total).toEqual({ ...cero, diurno: 8 * H });
  });

  it("CA11: lunes 19:00 a martes 07:00 con 120 min son 10 h netas: 9 h nocturnas y 1 h diurna", () => {
    const r = segmentar("2026-09-14T19:00", "2026-09-15T07:00", config, 120);
    expect(r.total).toEqual({ ...cero, nocturno: 9 * H, diurno: 1 * H });
    // antes del descanso eran 11 h nocturnas y 1 h diurna
    const sin = segmentar("2026-09-14T19:00", "2026-09-15T07:00", config);
    expect(sin.total).toEqual({ ...cero, nocturno: 11 * H, diurno: 1 * H });
  });

  it("sin indicar descanso, el resultado es el de antes (descanso 0)", () => {
    expect(segmentar("2026-09-12T19:00", "2026-09-13T03:00", config).total).toEqual({
      ...cero,
      nocturno: 5 * H,
      dominicalNocturno: 3 * H,
    });
  });

  it("el descanso sale de la categoría con más minutos aunque no sea la primera", () => {
    // domingo 20 de septiembre, 08:00 a 17:00: todo dominical diurno
    const r = segmentar("2026-09-20T08:00", "2026-09-20T17:00", config, 60);
    expect(r.total).toEqual({ ...cero, dominicalDiurno: 8 * H });
  });

  it("en empate gana la primera en este orden: nocturno, dominical nocturno, dominical diurno, diurno", () => {
    // lunes 18:00 a 20:00: 1 h diurna y 1 h nocturna, empatadas
    const r = segmentar("2026-09-14T18:00", "2026-09-14T20:00", config, 30);
    expect(r.total).toEqual({ ...cero, diurno: 1 * H, nocturno: 30 });
  });

  it("empate entre dominical nocturno y diurno: sale del dominical nocturno", () => {
    // sábado 22:00 a domingo 02:00 son 2 h nocturnas + 2 h dominicales nocturnas: gana nocturno
    const a = segmentar("2026-09-12T22:00", "2026-09-13T02:00", config, 60);
    expect(a.total).toEqual({ ...cero, nocturno: 1 * H, dominicalNocturno: 2 * H });
    // domingo 17:00 a 21:00: 2 h dominicales diurnas y 2 h dominicales nocturnas: gana el dominical nocturno
    const b = segmentar("2026-09-20T17:00", "2026-09-20T21:00", config, 60);
    expect(b.total).toEqual({ ...cero, dominicalDiurno: 2 * H, dominicalNocturno: 1 * H });
  });

  it("un descanso mayor que la categoría mayoritaria no la baja de cero ni toca las demás", () => {
    // lunes 18:00 a 20:00 (1 h diurna, 1 h nocturna) con 90 min de descanso
    const r = segmentar("2026-09-14T18:00", "2026-09-14T20:00", config, 90);
    expect(r.total).toEqual({ ...cero, diurno: 1 * H });
    expect(r.total.nocturno).toBe(0);
  });

  it("cuando el descanso no supera a la categoría mayoritaria, la suma es igual a los minutos netos", () => {
    const r = segmentar("2026-09-14T07:00", "2026-09-15T07:00", config, 120); // 24 h de reloj
    const suma = r.total.diurno + r.total.nocturno + r.total.dominicalDiurno + r.total.dominicalNocturno;
    expect(suma).toBe(24 * H - 120);
  });

  it("rechaza un descanso negativo o con decimales", () => {
    expect(() => segmentar("2026-09-14T07:00", "2026-09-14T16:00", config, -1)).toThrow();
    expect(() => segmentar("2026-09-14T07:00", "2026-09-14T16:00", config, 30.5)).toThrow();
  });

  it("si el turno cruza dos quincenas, el descanso sale de la quincena donde está más la categoría mayoritaria", () => {
    // martes 15 21:00 a miércoles 16 07:00: 3 h nocturnas en la 1a, 6 h nocturnas + 1 h diurna en la 2a
    const r = segmentar("2026-09-15T21:00", "2026-09-16T07:00", config, 120);
    expect(r.total).toEqual({ ...cero, nocturno: 7 * H, diurno: 1 * H });
    expect(r.porQuincena).toEqual([
      { quincena: { anio: 2026, mes: 9, numero: 1 }, minutos: { ...cero, nocturno: 3 * H } },
      { quincena: { anio: 2026, mes: 9, numero: 2 }, minutos: { ...cero, nocturno: 4 * H, diurno: 1 * H } },
    ]);
  });

  it("si el descanso supera lo que hay en esa quincena, el resto sale de la otra, sin bajar de cero", () => {
    // mismas 9 h nocturnas (3 h + 6 h) con 400 min de descanso: 360 min de la 2a y 40 min de la 1a
    const r = segmentar("2026-09-15T21:00", "2026-09-16T07:00", config, 400);
    expect(r.total.nocturno).toBe(9 * H - 400);
    expect(r.porQuincena[0].minutos.nocturno).toBe(3 * H - 40);
    expect(r.porQuincena[1].minutos.nocturno).toBe(0);
  });
});

describe("horas de la quincena con descanso", () => {
  it("la pantalla de quincena cuenta minutos netos (CA11)", () => {
    const t = nuevoTurno(
      { inicio: "2026-09-14T19:00", fin: "2026-09-15T07:00", descansoMin: 120, minutosProgramados: 10 * H, tipo: "ordinario" },
      AHORA,
      "t1",
    );
    expect(horasDeQuincena([t], { anio: 2026, mes: 9, numero: 1 }, config)).toEqual({
      ...cero,
      nocturno: 9 * H,
      diurno: 1 * H,
    });
  });

  it("los turnos viejos, con descanso 0, dan lo mismo que antes", () => {
    const viejo = turno({ descansoMin: 0, inicio: "2026-09-12T19:00", fin: "2026-09-13T03:00" });
    expect(horasDeQuincena([viejo], { anio: 2026, mes: 9, numero: 1 }, config)).toEqual({
      ...cero,
      nocturno: 5 * H,
      dominicalNocturno: 3 * H,
    });
  });
});

describe("banco con descanso", () => {
  it("CA2: 07:00 a 16:00 con 60 min de descanso (8 h programadas) y salida a las 19:00 genera un pago de 3 h", () => {
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T19:00" }), extrasSi);
    expect(m).toEqual({ fecha: "2026-09-14", tipo: "pago", minutos: -3 * H });
  });

  it("el turno cumplido al horario (8 h netas de 8 programadas) no genera movimiento", () => {
    expect(movimientoDeTurno(turno(), extrasSi)).toBeNull();
  });

  it("salir antes genera un préstamo con minutos netos", () => {
    // 07:00 a 12:00 con 60 min de descanso: 4 h netas contra 8 programadas
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T12:00" }), extrasSi);
    expect(m).toEqual({ fecha: "2026-09-14", tipo: "prestamo", minutos: 4 * H });
  });

  it("el descanso de un turno largo se descuenta antes de comparar con lo programado", () => {
    // 07:00 a 19:00 con 120 min de descanso son 10 h netas; programadas 10 h: sin movimiento
    expect(movimientoDeTurno(turno({ fin: "2026-09-14T19:00", descansoMin: 120, minutosProgramados: 10 * H }), extrasSi)).toBeNull();
  });

  it("con el interruptor apagado, las extras netas no descuentan deuda", () => {
    const m = movimientoDeTurno(turno({ fin: "2026-09-14T19:00" }), { extrasDescuentanDeuda: false });
    expect(m).toBeNull();
  });

  it("CA5: alquiler de 8 h con destino deuda baja 8 h", () => {
    const m = movimientoDeTurno(
      turno({ tipo: "alquiler", destino: "deuda", descansoMin: 0, fin: "2026-09-14T15:00", minutosProgramados: 0 }),
      extrasSi,
    );
    expect(m).toEqual({ fecha: "2026-09-14", tipo: "pago", minutos: -8 * H });
  });

  it("alquiler: el pago usa minutos netos", () => {
    // un alquiler con descanso (no debería tenerlo, pero un archivo importado podría traerlo)
    const m = movimientoDeTurno(
      turno({ tipo: "alquiler", destino: "deuda", descansoMin: 30, fin: "2026-09-14T15:00", minutosProgramados: 0 }),
      extrasSi,
    );
    expect(m?.minutos).toBe(-(8 * H - 30));
  });
});

describe("datos reales del formato anterior (descanso 0)", () => {
  const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "formato-1-localstorage.json");
  const datos = importarJSON(readFileSync(FIXTURE, "utf8"));
  const guardados = JSON.parse(readFileSync(FIXTURE, "utf8"));

  it("el movimiento que sale de cada turno viejo es el mismo que guardó la versión anterior", () => {
    for (const t of datos.turnos) {
      const antes = guardados.movimientos.find((m: { turnoId?: string }) => m.turnoId === t.id);
      const ahora = movimientoDeTurno(t, extrasSi);
      if (!antes) {
        expect(ahora).toBeNull(); // el alquiler que completa la semana no mueve el banco
      } else if (antes.automatico) {
        expect(ahora?.minutos).toBe(antes.minutos);
      } else {
        // el que Alejandro corrigió a mano conserva su valor guardado; el cálculo automático da el original
        expect(ahora?.tipo).toBe(antes.tipo);
      }
    }
  });

  it("la semana y las horas por categoría de los turnos viejos no cambian", () => {
    // 1a quincena: sáb 12 19:00 a dom 13 03:00 (5 h nocturnas y 3 h dominicales nocturnas) y lun 14 07:00 a 19:00 (12 h diurnas)
    const primera = horasDeQuincena(datos.turnos, { anio: 2026, mes: 9, numero: 1 }, datos.config);
    expect(primera).toEqual({ ...cero, nocturno: 5 * H, dominicalNocturno: 3 * H, diurno: 12 * H });
    // 2a quincena: mié 16 07:00 a 11:00 (4 h) y sáb 19 08:00 a 16:00 (8 h), todas diurnas
    const segunda = horasDeQuincena(datos.turnos, { anio: 2026, mes: 9, numero: 2 }, datos.config);
    expect(segunda).toEqual({ ...cero, diurno: 12 * H });
  });
});

describe("semana con descanso", () => {
  it("un turno ordinario suma sus horas programadas netas, no las de reloj", () => {
    // 07:00 a 16:00 son 9 h de reloj, 8 h netas programadas
    expect(minutosDeSemana([turno()], "2026-09-14")).toBe(8 * H);
  });

  it("las horas prestadas siguen contando como cumplidas", () => {
    expect(minutosDeSemana([turno({ fin: "2026-09-14T12:00" })], "2026-09-14")).toBe(8 * H);
  });

  it("CA5: alquiler de 8 h con destino semana suma 8 h", () => {
    const t = turno({ tipo: "alquiler", destino: "semana", descansoMin: 0, fin: "2026-09-14T15:00", minutosProgramados: 0 });
    expect(minutosDeSemana([t], "2026-09-14")).toBe(8 * H);
  });

  it("alquiler con destino semana: usa minutos netos", () => {
    const t = turno({ tipo: "alquiler", destino: "semana", descansoMin: 30, fin: "2026-09-14T15:00", minutosProgramados: 0 });
    expect(minutosDeSemana([t], "2026-09-14")).toBe(8 * H - 30);
  });

  it("alquiler con destino deuda no suma a la semana", () => {
    const t = turno({ tipo: "alquiler", destino: "deuda", descansoMin: 0, minutosProgramados: 0 });
    expect(minutosDeSemana([t], "2026-09-14")).toBe(0);
  });
});
