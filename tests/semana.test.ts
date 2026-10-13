import { describe, it, expect } from "vitest";
import { minutosDeSemana } from "../src/dominio/semana";
import type { Turno } from "../src/dominio/tipos";

const H = 60;
const AHORA = "2026-09-20T10:00:00";

function turno(parcial: Partial<Turno> = {}): Turno {
  return {
    id: `t${Math.random()}`,
    inicio: "2026-09-14T07:00", // lunes
    fin: "2026-09-14T15:00", // 8 h reales
    minutosProgramados: 8 * H,
    tipo: "ordinario",
    creadoEn: AHORA,
    modificadoEn: AHORA,
    ...parcial,
  };
}

describe("minutosDeSemana", () => {
  it("sin turnos son 0", () => {
    expect(minutosDeSemana([], "2026-09-16")).toBe(0);
  });

  it("suma las horas programadas de los turnos ordinarios", () => {
    const turnos = [
      turno({ inicio: "2026-09-14T07:00", fin: "2026-09-14T15:00" }),
      turno({ inicio: "2026-09-15T07:00", fin: "2026-09-15T15:00" }),
      turno({ inicio: "2026-09-16T07:00", fin: "2026-09-16T15:00", minutosProgramados: 6 * H }),
    ];
    expect(minutosDeSemana(turnos, "2026-09-17")).toBe(22 * H);
  });

  it("las horas prestadas cuentan como cumplidas: un turno acortado suma lo programado", () => {
    const acortado = turno({ fin: "2026-09-14T11:00" }); // 4 h reales, 8 programadas
    expect(minutosDeSemana([acortado], "2026-09-14")).toBe(8 * H);
  });

  it("las horas extra de un ordinario no suman: cuentan las programadas", () => {
    const conExtra = turno({ fin: "2026-09-14T19:00" }); // 12 h reales, 8 programadas
    expect(minutosDeSemana([conExtra], "2026-09-14")).toBe(8 * H);
  });

  it("CA5: alquiler de 8 h con destino semana suma 8 h", () => {
    const alquiler = turno({ tipo: "alquiler", destino: "semana", minutosProgramados: 0 });
    expect(minutosDeSemana([alquiler], "2026-09-14")).toBe(8 * H);
  });

  it("alquiler con destino semana suma las horas reales, no las programadas", () => {
    const alquiler = turno({
      tipo: "alquiler",
      destino: "semana",
      inicio: "2026-09-12T19:00",
      fin: "2026-09-13T03:00",
      minutosProgramados: 0,
    });
    expect(minutosDeSemana([alquiler], "2026-09-10")).toBe(8 * H);
  });

  it("alquiler con destino deuda no suma a la semana", () => {
    const alquiler = turno({ tipo: "alquiler", destino: "deuda", minutosProgramados: 0 });
    expect(minutosDeSemana([alquiler], "2026-09-14")).toBe(0);
  });

  it("la semana arranca en lunes: el lunes entra y el domingo anterior no", () => {
    const domingo = turno({ inicio: "2026-09-13T07:00", fin: "2026-09-13T15:00" });
    const lunes = turno({ inicio: "2026-09-14T07:00", fin: "2026-09-14T15:00" });
    expect(minutosDeSemana([domingo, lunes], "2026-09-16")).toBe(8 * H);
  });

  it("el domingo cierra la semana: entra en la semana que termina ese día", () => {
    const domingo = turno({ inicio: "2026-09-20T07:00", fin: "2026-09-20T15:00" });
    expect(minutosDeSemana([domingo], "2026-09-14")).toBe(8 * H);
    expect(minutosDeSemana([domingo], "2026-09-21")).toBe(0);
  });

  it("ignora turnos de otras semanas", () => {
    const otra = turno({ inicio: "2026-09-07T07:00", fin: "2026-09-07T15:00" });
    const esta = turno({ inicio: "2026-09-15T07:00", fin: "2026-09-15T15:00" });
    expect(minutosDeSemana([otra, esta], "2026-09-18")).toBe(8 * H);
  });

  it("un turno que cruza de domingo a lunes cuenta en la semana donde empieza", () => {
    const cruza = turno({ inicio: "2026-09-13T19:00", fin: "2026-09-14T03:00" });
    expect(minutosDeSemana([cruza], "2026-09-10")).toBe(8 * H);
    expect(minutosDeSemana([cruza], "2026-09-15")).toBe(0);
  });

  it("un alquiler sin destino es un error", () => {
    expect(() => minutosDeSemana([turno({ tipo: "alquiler" })], "2026-09-14")).toThrow();
  });
});
