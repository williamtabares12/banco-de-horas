import { describe, it, expect } from "vitest";
import {
  festivosDelAnio,
  festivosEfectivos,
  agregarFestivo,
  quitarFestivo,
  esFestivo,
  type CambiosFestivos,
} from "../src/dominio/festivos";

const sin: CambiosFestivos = { festivosAgregados: [], festivosQuitados: [] };

describe("festivosEfectivos", () => {
  it("sin cambios son los calculados", () => {
    expect(festivosEfectivos(2026, sin)).toEqual(festivosDelAnio(2026));
  });

  it("quita los festivos quitados y suma los agregados, en orden", () => {
    const r = festivosEfectivos(2026, {
      festivosAgregados: ["2026-10-13", "2026-02-02"],
      festivosQuitados: ["2026-10-12"],
    });
    expect(r).not.toContain("2026-10-12");
    expect(r).toContain("2026-10-13");
    expect(r).toContain("2026-02-02");
    expect(r).toEqual([...r].sort());
  });

  it("ignora los cambios de otros años", () => {
    const r = festivosEfectivos(2026, { festivosAgregados: ["2027-02-02"], festivosQuitados: ["2027-01-01"] });
    expect(r).toEqual(festivosDelAnio(2026));
  });
});

describe("quitarFestivo", () => {
  it("un festivo calculado pasa a la lista de quitados", () => {
    const r = quitarFestivo(sin, "2026-10-12");
    expect(r.festivosQuitados).toEqual(["2026-10-12"]);
    expect(esFestivo("2026-10-12", r)).toBe(false);
  });

  it("un festivo agregado a mano solo se saca de los agregados", () => {
    const r = quitarFestivo({ festivosAgregados: ["2026-10-13"], festivosQuitados: [] }, "2026-10-13");
    expect(r).toEqual(sin);
  });

  it("quitar dos veces no repite la fecha", () => {
    const r = quitarFestivo(quitarFestivo(sin, "2026-10-12"), "2026-10-12");
    expect(r.festivosQuitados).toEqual(["2026-10-12"]);
  });

  it("no modifica el objeto original", () => {
    quitarFestivo(sin, "2026-10-12");
    expect(sin).toEqual({ festivosAgregados: [], festivosQuitados: [] });
  });
});

describe("agregarFestivo", () => {
  it("una fecha nueva pasa a la lista de agregados", () => {
    const r = agregarFestivo(sin, "2026-10-13");
    expect(r.festivosAgregados).toEqual(["2026-10-13"]);
    expect(esFestivo("2026-10-13", r)).toBe(true);
  });

  it("agregar un festivo que se había quitado lo restaura sin duplicarlo", () => {
    const quitado = quitarFestivo(sin, "2026-10-12");
    const r = agregarFestivo(quitado, "2026-10-12");
    expect(r).toEqual(sin);
    expect(esFestivo("2026-10-12", r)).toBe(true);
  });

  it("agregar un festivo que ya es oficial no hace nada", () => {
    expect(agregarFestivo(sin, "2026-10-12")).toEqual(sin);
  });

  it("agregar dos veces no repite la fecha", () => {
    const r = agregarFestivo(agregarFestivo(sin, "2026-10-13"), "2026-10-13");
    expect(r.festivosAgregados).toEqual(["2026-10-13"]);
  });
});
