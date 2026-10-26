import { describe, it, expect } from "vitest";
import { necesitaRespaldo, exportarJSON, importarJSON, ErrorImportacion } from "../src/almacenamiento/respaldo";
import type { Datos } from "../src/almacenamiento/repositorio";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";

const HOY = "2026-10-13";

function datos(parcial: Partial<Datos> = {}): Datos {
  return { schemaVersion: 3, config: CONFIG_POR_DEFECTO, turnos: [], movimientos: [], ...parcial };
}

/** Datos con un movimiento creado en `creadoEn`. */
function conMovimientoDe(creadoEn: string, parcial: Partial<Datos> = {}): Datos {
  return datos({
    movimientos: [
      { id: "m1", fecha: creadoEn.slice(0, 10), tipo: "saldo_inicial", minutos: 60, automatico: false, creadoEn, modificadoEn: creadoEn },
    ],
    ...parcial,
  });
}

describe("necesitaRespaldo", () => {
  it("sin datos no hay nada que respaldar", () => {
    expect(necesitaRespaldo(datos(), HOY)).toBe(false);
  });

  it("datos recientes que nunca se exportaron: todavía no avisa", () => {
    expect(necesitaRespaldo(conMovimientoDe("2026-10-10T08:00:00"), HOY)).toBe(false);
  });

  it("datos de hace más de 14 días que nunca se exportaron: avisa", () => {
    expect(necesitaRespaldo(conMovimientoDe("2026-09-20T08:00:00"), HOY)).toBe(true);
  });

  it("usa el dato más antiguo, sea turno o movimiento", () => {
    const turno = {
      id: "t1", inicio: "2026-09-01T07:00", fin: "2026-09-01T15:00", descansoMin: 0, minutosProgramados: 480,
      tipo: "ordinario" as const, creadoEn: "2026-09-01T16:00:00", modificadoEn: "2026-09-01T16:00:00",
    };
    expect(necesitaRespaldo(datos({ turnos: [turno] }), HOY)).toBe(true);
  });

  it("exportado hace 10 días: no avisa", () => {
    expect(necesitaRespaldo(conMovimientoDe("2026-08-01T08:00:00", { ultimoRespaldo: "2026-10-03" }), HOY)).toBe(false);
  });

  it("exportado hace exactamente 14 días: todavía no avisa", () => {
    expect(necesitaRespaldo(conMovimientoDe("2026-08-01T08:00:00", { ultimoRespaldo: "2026-09-29" }), HOY)).toBe(false);
  });

  it("exportado hace 15 días: avisa", () => {
    expect(necesitaRespaldo(conMovimientoDe("2026-08-01T08:00:00", { ultimoRespaldo: "2026-09-28" }), HOY)).toBe(true);
  });

  it("un respaldo reciente cuenta aunque los datos sean viejos", () => {
    expect(necesitaRespaldo(conMovimientoDe("2026-01-01T08:00:00", { ultimoRespaldo: HOY }), HOY)).toBe(false);
  });
});

describe("ultimoRespaldo en el JSON", () => {
  it("se conserva al exportar e importar", () => {
    const original = conMovimientoDe("2026-09-01T08:00:00", { ultimoRespaldo: "2026-10-03" });
    expect(importarJSON(exportarJSON(original))).toEqual(original);
  });

  it("es opcional: un archivo sin el campo se importa igual", () => {
    expect(importarJSON(exportarJSON(datos()))).not.toHaveProperty("ultimoRespaldo");
  });

  it("rechaza una fecha de respaldo con formato inválido", () => {
    const sucio = JSON.parse(exportarJSON(datos()));
    sucio.ultimoRespaldo = "ayer";
    expect(() => importarJSON(JSON.stringify(sucio))).toThrow(ErrorImportacion);
  });
});
