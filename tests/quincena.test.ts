import { describe, it, expect } from "vitest";
import {
  horasDeQuincena,
  colillaDeQuincena,
  quincenaAnterior,
  quincenaSiguiente,
  etiquetaQuincena,
} from "../src/dominio/quincena";
import { nuevoTurno } from "../src/dominio/turnos";
import type { Turno } from "../src/dominio/tipos";

const AHORA = "2026-10-01T10:00:00";
const config = { nocturnoDesde: "19:00", nocturnoHasta: "06:00", festivosAgregados: [], festivosQuitados: [] };
const cero = { diurno: 0, nocturno: 0, dominicalDiurno: 0, dominicalNocturno: 0 };

function turno(id: string, inicio: string, fin: string): Turno {
  return nuevoTurno({ inicio, fin, minutosProgramados: 0, tipo: "ordinario" }, AHORA, id);
}

// Septiembre de 2026:
//  - jue 10, 07:00-15:00           -> 8 h diurnas (1a quincena)
//  - sáb 12 19:00 a dom 13 03:00   -> 5 h nocturnas + 3 h dominicales nocturnas (1a)
//  - mar 15 18:00 a mié 16 02:00   -> 1 h diurna y 5 h nocturnas (1a) + 2 h nocturnas (2a)
//  - dom 20, 08:00-16:00           -> 8 h dominicales diurnas (2a)
const turnos = [
  turno("a", "2026-09-10T07:00", "2026-09-10T15:00"),
  turno("b", "2026-09-12T19:00", "2026-09-13T03:00"),
  turno("c", "2026-09-15T18:00", "2026-09-16T02:00"),
  turno("d", "2026-09-20T08:00", "2026-09-20T16:00"),
];

const sep1 = { anio: 2026, mes: 9, numero: 1 } as const;
const sep2 = { anio: 2026, mes: 9, numero: 2 } as const;

describe("horasDeQuincena", () => {
  it("suma las horas por categoría de los turnos de la 1a quincena", () => {
    expect(horasDeQuincena(turnos, sep1, config)).toEqual({
      diurno: 480 + 60,
      nocturno: 300 + 300,
      dominicalDiurno: 0,
      dominicalNocturno: 180,
    });
  });

  it("un turno que cruza del 15 al 16 reparte sus horas en cada quincena", () => {
    expect(horasDeQuincena(turnos, sep2, config)).toEqual({
      ...cero,
      nocturno: 120,
      dominicalDiurno: 480,
    });
  });

  it("CA9: una quincena sin turnos muestra 0 en todo, sin errores", () => {
    expect(horasDeQuincena(turnos, { anio: 2026, mes: 10, numero: 1 }, config)).toEqual(cero);
    expect(horasDeQuincena([], sep1, config)).toEqual(cero);
  });

  it("CA9: una quincena con turnos pero sin nocturnas ni dominicales muestra 0 en esas", () => {
    const soloDia = [turno("x", "2026-09-14T07:00", "2026-09-14T15:00")];
    expect(horasDeQuincena(soloDia, sep1, config)).toEqual({ ...cero, diurno: 480 });
  });

  it("respeta los festivos de la configuración", () => {
    const festivo = [turno("f", "2026-10-12T08:00", "2026-10-12T16:00")];
    const oct1 = { anio: 2026, mes: 10, numero: 1 } as const;
    expect(horasDeQuincena(festivo, oct1, config)).toEqual({ ...cero, dominicalDiurno: 480 });
    expect(horasDeQuincena(festivo, oct1, { ...config, festivosQuitados: ["2026-10-12"] })).toEqual({
      ...cero,
      diurno: 480,
    });
  });
});

describe("colillaDeQuincena (CA6)", () => {
  it("lo trabajado en la 1a de septiembre se cobra en la 2a de septiembre", () => {
    expect(colillaDeQuincena(sep1, 1)).toEqual(sep2);
  });
  it("lo trabajado en la 2a de septiembre se cobra en la 1a de octubre", () => {
    expect(colillaDeQuincena(sep2, 1)).toEqual({ anio: 2026, mes: 10, numero: 1 });
  });
  it("la 2a de diciembre se cobra en la 1a de enero del año siguiente", () => {
    expect(colillaDeQuincena({ anio: 2026, mes: 12, numero: 2 }, 1)).toEqual({ anio: 2027, mes: 1, numero: 1 });
  });
  it("con desfase 0 se cobra en la misma quincena", () => {
    expect(colillaDeQuincena(sep1, 0)).toEqual(sep1);
  });
});

describe("moverse entre quincenas", () => {
  it("siguiente y anterior dentro del mes", () => {
    expect(quincenaSiguiente(sep1)).toEqual(sep2);
    expect(quincenaAnterior(sep2)).toEqual(sep1);
  });
  it("cruzan de mes", () => {
    expect(quincenaSiguiente(sep2)).toEqual({ anio: 2026, mes: 10, numero: 1 });
    expect(quincenaAnterior(sep1)).toEqual({ anio: 2026, mes: 8, numero: 2 });
  });
  it("cruzan de año", () => {
    expect(quincenaSiguiente({ anio: 2026, mes: 12, numero: 2 })).toEqual({ anio: 2027, mes: 1, numero: 1 });
    expect(quincenaAnterior({ anio: 2027, mes: 1, numero: 1 })).toEqual({ anio: 2026, mes: 12, numero: 2 });
  });
});

describe("etiquetaQuincena", () => {
  it("se escribe en español", () => {
    expect(etiquetaQuincena(sep1)).toBe("1.ª quincena de septiembre de 2026");
    expect(etiquetaQuincena({ anio: 2027, mes: 1, numero: 2 })).toBe("2.ª quincena de enero de 2027");
  });
});
