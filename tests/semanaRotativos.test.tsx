// T39: turnos rotativos. La semana es la del calendario (domingo a sábado) y no depende de qué día
// de la semana sea el primer turno de cada persona: puede ser lunes, martes o cualquier otro.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Inicio } from "../src/ui/pantallas/Inicio";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { minutosDeSemana } from "../src/dominio/semana";
import type { Datos } from "../src/almacenamiento/repositorio";
import type { Turno } from "../src/dominio/tipos";

const H = 60;
const noop = () => {};
const AHORA = "2026-10-28T09:00:00";

// Hoy es miércoles 28 de octubre de 2026: la semana va del domingo 25 al sábado 31.
function turno(dia: string, parcial: Partial<Turno> = {}): Turno {
  return {
    id: `t-${dia}-${parcial.inicio ?? ""}`,
    inicio: `${dia}T07:00`,
    fin: `${dia}T15:00`,
    descansoMin: 0,
    minutosProgramados: 8 * H,
    tipo: "ordinario",
    creadoEn: AHORA,
    modificadoEn: AHORA,
    ...parcial,
  };
}
const inicio = (turnos: Turno[]) =>
  renderToStaticMarkup(
    <Inicio datos={{ schemaVersion: 3, config: CONFIG_POR_DEFECTO, turnos, movimientos: [] } as Datos} alRegistrar={noop} alIrARespaldo={noop} />,
  );

describe("turnos rotativos: el primer turno de la semana no tiene que ser el domingo", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 12, 0, 0));
  });
  afterAll(() => vi.useRealTimers());

  it("si el primer turno es el martes, la barra cuenta desde el martes y no mezcla la semana anterior", () => {
    const m = inicio([turno("2026-10-19"), turno("2026-10-27"), turno("2026-10-28")]); // lunes de la semana pasada, martes y miércoles
    expect(m).toContain("16 h / 42 h");
  });
  it("si el primer turno es el lunes, cuenta desde el lunes", () => {
    const m = inicio([turno("2026-10-26"), turno("2026-10-27")]);
    expect(m).toContain("16 h / 42 h");
  });
  it("sin ningún turno el domingo ni el lunes, la barra no se rompe: muestra 0 de 42 h", () => {
    const m = inicio([]);
    expect(m).toMatch(/0 min \/ 42 h|0 h \/ 42 h/);
    expect(m).toMatch(/aria-valuenow="0"/);
    expect(m).not.toMatch(/NaN|undefined/);
  });
  it("la barra nunca pasa del 100 %, aunque la persona trabaje más de 42 h (rotativos con horas extra)", () => {
    const seis = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((d) => turno(d)); // 48 h
    const m = inicio(seis);
    expect(m).toContain("48 h / 42 h");
    expect(m).toMatch(/style="width:100%"/);
    expect(m).toMatch(/aria-valuenow="2520"/);
  });
  it("una noche del sábado 31 al domingo 1 de noviembre cuenta en esta semana y no en la siguiente", () => {
    const noche = turno("2026-10-31", { inicio: "2026-10-31T19:00", fin: "2026-11-01T07:00", minutosProgramados: 12 * H });
    expect(minutosDeSemana([noche], "2026-10-28")).toBe(12 * H);
    expect(minutosDeSemana([noche], "2026-11-02")).toBe(0);
  });
  it("el domingo que abre la semana arranca en cero aunque la semana anterior haya sido larga", () => {
    const semanaPasada = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"].map((d) => turno(d));
    expect(minutosDeSemana(semanaPasada, "2026-10-25")).toBe(0);
    expect(minutosDeSemana(semanaPasada, "2026-10-24")).toBe(48 * H);
  });
});
