// Fixture: tests/fixtures/respaldo-2026-10-29.json, el respaldo real del piloto del 29 de octubre de 2026 (sin notas).
// Lo usan las pruebas de CA33 a CA35, CA40 y CA41 a CA45. Los datos hasta el 21 de octubre son los mismos del respaldo
// anterior, pero el saldo total es de 13 h (no 26 h) y hay 10 turnos de alquiler (no 5).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importarJSON, leerDatos } from "../src/almacenamiento/respaldo";
import { RepositorioLocal } from "../src/almacenamiento/local";
import { saldoActual, saldoProyectado } from "../src/dominio/banco";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEXTO = readFileSync(join(RAIZ, "tests/fixtures/respaldo-2026-10-29.json"), "utf8");
const H = 60;

describe("respaldo-2026-10-29.json", () => {
  it("carga sin errores con la validación de la app", () => {
    expect(() => importarJSON(TEXTO)).not.toThrow();
  });

  it("ya está en el formato actual: no hace falta migrarlo", () => {
    expect(leerDatos(TEXTO).migrado).toBe(false);
  });

  it("el saldo total es de 13 h (no 26 h)", () => {
    const { movimientos } = importarJSON(TEXTO);
    expect(saldoProyectado(movimientos)).toBe(13 * H);
  });

  it("el saldo de hoy (29 de octubre) también es de 13 h: no hay nada programado que lo distinga del total", () => {
    const { movimientos } = importarJSON(TEXTO);
    expect(saldoActual(movimientos, "2026-10-29")).toBe(13 * H);
  });

  it("trae 24 turnos y 14 movimientos, con 10 turnos de alquiler (no 5)", () => {
    const { turnos, movimientos } = importarJSON(TEXTO);
    expect(turnos).toHaveLength(24);
    expect(movimientos).toHaveLength(14);
    expect(turnos.filter((t) => t.tipo === "alquiler")).toHaveLength(10);
    expect(turnos.filter((t) => t.tipo === "ordinario")).toHaveLength(14);
  });

  it("todos los alquileres tienen destino y ninguno tiene sede todavía (T47 las agrega después)", () => {
    const alquileres = importarJSON(TEXTO).turnos.filter((t) => t.tipo === "alquiler");
    for (const t of alquileres) {
      expect(["deuda", "semana"]).toContain(t.destino);
      expect(t).not.toHaveProperty("sede");
    }
  });

  it("es real y sin notas: ningún turno ni movimiento trae una nota (no se guardan datos personales)", () => {
    const { turnos, movimientos } = importarJSON(TEXTO);
    expect([...turnos, ...movimientos].filter((x) => x.nota !== undefined)).toEqual([]);
  });

  it("la app lo abre desde el almacenamiento local, como lo haría un compañero que lo importó", () => {
    const mapa = new Map<string, string>([["banco-horas:datos", TEXTO]]);
    const repo = new RepositorioLocal({ getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v) });
    const datos = repo.cargar();
    expect(datos.turnos).toHaveLength(24);
    expect(saldoProyectado(datos.movimientos)).toBe(13 * H);
  });

  it("el alquiler del 29 de octubre (14:00 a 22:00) paga deuda y su pago de 8 h está en el banco (CA41 y CA43)", () => {
    const { turnos, movimientos } = importarJSON(TEXTO);
    const alquiler = turnos.find((t) => t.tipo === "alquiler" && t.inicio === "2026-10-29T14:00");
    expect(alquiler?.fin).toBe("2026-10-29T22:00");
    expect(alquiler?.destino).toBe("deuda");
    const pago = movimientos.find((m) => m.turnoId === alquiler?.id);
    expect(pago?.minutos).toBe(-8 * H);
  });
});
