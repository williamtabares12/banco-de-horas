import { describe, it, expect } from "vitest";
import {
  borrarPlantilla,
  duracionPlantilla,
  editarPlantilla,
  nuevaPlantilla,
  valoresDePlantilla,
} from "../src/dominio/plantillas";
import { movimientoDeTurno } from "../src/dominio/banco";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { fechasDeTurno, nuevoTurno } from "../src/dominio/turnos";
import type { PlantillaTurno } from "../src/dominio/tipos";

const H = 60;
const AHORA = "2026-09-20T10:00:00";
const [dia8, dia12, noche12] = CONFIG_POR_DEFECTO.plantillas;

describe("plantillas de ejemplo", () => {
  it("vienen tres: Día 8 h, Día 12 h y Noche 12 h", () => {
    expect(CONFIG_POR_DEFECTO.plantillas.map((p) => p.nombre)).toEqual(["Día 8 h", "Día 12 h", "Noche 12 h"]);
  });
});

describe("duracionPlantilla", () => {
  it("dentro del mismo día", () => {
    expect(duracionPlantilla(dia8)).toBe(9 * H); // 07:00 a 16:00
  });
  it("si el fin es menor que el inicio, cruza la medianoche", () => {
    expect(duracionPlantilla(noche12)).toBe(12 * H); // 19:00 a 07:00
  });
  it("el mismo inicio y fin son 24 horas", () => {
    expect(duracionPlantilla({ inicio: "07:00", fin: "07:00" })).toBe(24 * H);
  });
});

describe("CA12: elegir una plantilla rellena el formulario", () => {
  it("Día 8 h: inicio 07:00, fin 16:00, descanso 60 y 8 h programadas", () => {
    expect(valoresDePlantilla(dia8)).toEqual({
      horaInicio: "07:00",
      horaFin: "16:00",
      descansoMin: 60,
      minutosProgramados: 8 * H,
    });
  });

  it("las horas programadas son los minutos netos de la plantilla", () => {
    expect(valoresDePlantilla(dia12).minutosProgramados).toBe(10 * H); // 12 h de reloj menos 2 h
    expect(valoresDePlantilla(noche12)).toMatchObject({ horaInicio: "19:00", horaFin: "07:00", minutosProgramados: 10 * H });
  });

  it("los cuatro campos se pueden cambiar y el turno resultante es válido", () => {
    // se elige Día 8 h y luego se cambia la hora de fin, el descanso y las programadas
    const v = valoresDePlantilla(dia8);
    const { inicio, fin } = fechasDeTurno("2026-09-14", v.horaInicio, "19:00");
    const turno = nuevoTurno(
      { inicio, fin, descansoMin: 90, minutosProgramados: 9 * H, tipo: "ordinario" },
      AHORA,
      "t1",
    );
    expect(turno).toMatchObject({ inicio: "2026-09-14T07:00", fin: "2026-09-14T19:00", descansoMin: 90, minutosProgramados: 9 * H });
  });

  it("de punta a punta: Día 8 h con salida a las 19:00 genera un pago de 3 h (CA2)", () => {
    const v = valoresDePlantilla(dia8);
    const { inicio, fin } = fechasDeTurno("2026-09-14", v.horaInicio, "19:00");
    const turno = nuevoTurno(
      { inicio, fin, descansoMin: v.descansoMin, minutosProgramados: v.minutosProgramados, tipo: "ordinario" },
      AHORA,
      "t1",
    );
    expect(movimientoDeTurno(turno, { extrasDescuentanDeuda: true })).toEqual({
      fecha: "2026-09-14",
      tipo: "pago",
      minutos: -3 * H,
    });
  });

  it("un turno hecho con la plantilla sin tocar nada cumple su horario: sin movimiento de banco", () => {
    const v = valoresDePlantilla(dia8);
    const { inicio, fin } = fechasDeTurno("2026-09-14", v.horaInicio, v.horaFin);
    const turno = nuevoTurno(
      { inicio, fin, descansoMin: v.descansoMin, minutosProgramados: v.minutosProgramados, tipo: "ordinario" },
      AHORA,
      "t1",
    );
    expect(movimientoDeTurno(turno, { extrasDescuentanDeuda: true })).toBeNull();
  });

  it("cambiar una plantilla no modifica los turnos ya guardados", () => {
    const v = valoresDePlantilla(dia8);
    const { inicio, fin } = fechasDeTurno("2026-09-14", v.horaInicio, v.horaFin);
    const turno = nuevoTurno(
      { inicio, fin, descansoMin: v.descansoMin, minutosProgramados: v.minutosProgramados, tipo: "ordinario" },
      AHORA,
      "t1",
    );
    const copia = { ...turno };
    editarPlantilla(dia8, { nombre: "Día 8 h", inicio: "08:00", fin: "17:00", descansoMin: 30 });
    expect(turno).toEqual(copia);
  });
});

describe("nuevaPlantilla", () => {
  const entrada = { nombre: "Tarde 6 h", inicio: "13:00", fin: "19:00", descansoMin: 30 };

  it("crea una plantilla con el id dado", () => {
    expect(nuevaPlantilla(entrada, "p1")).toEqual({ id: "p1", ...entrada });
  });
  it("recorta los espacios del nombre", () => {
    expect(nuevaPlantilla({ ...entrada, nombre: "  Tarde 6 h  " }, "p1").nombre).toBe("Tarde 6 h");
  });
  it("una plantilla sin descanso es válida", () => {
    expect(nuevaPlantilla({ ...entrada, descansoMin: 0 }, "p1").descansoMin).toBe(0);
  });
  it("rechaza un nombre vacío", () => {
    expect(() => nuevaPlantilla({ ...entrada, nombre: "   " }, "p1")).toThrow(/nombre/i);
  });
  it("rechaza horas con formato inválido", () => {
    expect(() => nuevaPlantilla({ ...entrada, inicio: "1pm" }, "p1")).toThrow();
    expect(() => nuevaPlantilla({ ...entrada, fin: "" }, "p1")).toThrow();
    expect(() => nuevaPlantilla({ ...entrada, inicio: "25:00" }, "p1")).toThrow();
  });
  it("rechaza un descanso negativo o con decimales", () => {
    expect(() => nuevaPlantilla({ ...entrada, descansoMin: -1 }, "p1")).toThrow();
    expect(() => nuevaPlantilla({ ...entrada, descansoMin: 30.5 }, "p1")).toThrow();
  });
  it("rechaza un descanso mayor que el turno", () => {
    expect(() => nuevaPlantilla({ ...entrada, descansoMin: 6 * H + 1 }, "p1")).toThrow(/descanso/i);
  });
});

describe("editarPlantilla", () => {
  it("conserva el id y cambia el resto", () => {
    const e = editarPlantilla(dia8, { nombre: "Día 8 h (nuevo)", inicio: "06:00", fin: "15:00", descansoMin: 45 });
    expect(e).toEqual({ id: dia8.id, nombre: "Día 8 h (nuevo)", inicio: "06:00", fin: "15:00", descansoMin: 45 });
  });
  it("no modifica la original", () => {
    const copia = { ...dia8 };
    editarPlantilla(dia8, { nombre: "x", inicio: "06:00", fin: "15:00", descansoMin: 45 });
    expect(dia8).toEqual(copia);
  });
  it("aplica las mismas validaciones", () => {
    expect(() => editarPlantilla(dia8, { nombre: "", inicio: "06:00", fin: "15:00", descansoMin: 45 })).toThrow();
    expect(() => editarPlantilla(dia8, { nombre: "x", inicio: "06:00", fin: "15:00", descansoMin: 99999 })).toThrow();
  });
});

describe("borrarPlantilla", () => {
  const lista: PlantillaTurno[] = [dia8, dia12, noche12];
  it("quita solo la plantilla indicada", () => {
    expect(borrarPlantilla(lista, dia12.id)).toEqual([dia8, noche12]);
  });
  it("con un id que no existe no cambia nada", () => {
    expect(borrarPlantilla(lista, "no-existe")).toEqual(lista);
  });
  it("se pueden borrar todas", () => {
    expect(borrarPlantilla(borrarPlantilla(borrarPlantilla(lista, dia8.id), dia12.id), noche12.id)).toEqual([]);
  });
  it("no modifica la lista original", () => {
    borrarPlantilla(lista, dia8.id);
    expect(lista).toHaveLength(3);
  });
});
