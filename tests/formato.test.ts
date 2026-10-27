import { describe, it, expect } from "vitest";
import { parsearDuracion, formatearDuracion } from "../src/dominio/tiempo";

describe("parsearDuracion", () => {
  it.each([
    ["8", 480],
    ["0", 0],
    ["8:30", 510],
    ["0:45", 45],
    ["08:05", 485],
    ["2,5", 150],
    ["2.5", 150],
    ["  3 ", 180],
  ])("lee %s como %i minutos", (texto, minutos) => {
    expect(parsearDuracion(texto)).toBe(minutos);
  });

  it.each([[""], ["   "], ["abc"], ["-2"], ["2:75"], ["2:5"], ["1:2:3"], ["2h"], ["2,5,1"], ["0.33"]])( // "0.33" antes valía 20 min; con RF15 es ambiguo (T41)
    "rechaza %j",
    (texto) => {
      expect(parsearDuracion(texto)).toBeNull();
    },
  );
});

describe("formatearDuracion", () => {
  it.each([
    [0, "0 h"],
    [45, "45 min"],
    [120, "2 h"],
    [150, "2 h 30 min"],
    [2520, "42 h"],
    [-150, "-2 h 30 min"],
    [-45, "-45 min"],
  ])("%i minutos se muestra como %s", (minutos, texto) => {
    expect(formatearDuracion(minutos)).toBe(texto);
  });
});
