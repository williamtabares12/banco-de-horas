// T39: la barra "Esta semana" de Inicio usa la semana de domingo a sábado (o la que digan las reglas).
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Inicio } from "../src/ui/pantallas/Inicio";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { REGLAS_POR_DEFECTO, type ReglasGlobales } from "../src/dominio/reglas";
import type { Datos } from "../src/almacenamiento/repositorio";

const noop = () => {};
const AHORA = "2026-10-28T09:00:00";

// Hoy es miércoles 28 de octubre de 2026. El domingo 25 es de esta semana si la semana empieza en domingo.
const domingo = {
  id: "t1",
  inicio: "2026-10-25T07:00",
  fin: "2026-10-25T15:00",
  descansoMin: 0,
  minutosProgramados: 8 * 60,
  tipo: "ordinario" as const,
  creadoEn: AHORA,
  modificadoEn: AHORA,
};
const datos: Datos = { schemaVersion: 3, config: CONFIG_POR_DEFECTO, turnos: [domingo], movimientos: [] };

const lunes: ReglasGlobales = { "2026-01-01": { ...REGLAS_POR_DEFECTO["2026-01-01"], inicioSemana: 1 } };

describe("Inicio: avance de la semana", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 12, 0, 0));
  });
  afterAll(() => vi.useRealTimers());

  it("por defecto la semana empieza el domingo: el turno del domingo 25 cuenta esta semana", () => {
    const m = renderToStaticMarkup(<Inicio datos={datos} alRegistrar={noop} alIrARespaldo={noop} />);
    expect(m).toContain("8 h / 42 h");
  });
  it("con la configuración personal en lunes, el domingo 25 es de la semana pasada", () => {
    const d = { ...datos, config: { ...CONFIG_POR_DEFECTO, inicioSemana: 1 as const } };
    const m = renderToStaticMarkup(<Inicio datos={d} alRegistrar={noop} alIrARespaldo={noop} />);
    expect(m).not.toContain("8 h / 42 h");
  });
  it("con las reglas de la clínica (nube) en lunes, también", () => {
    const m = renderToStaticMarkup(<Inicio datos={datos} reglas={lunes} alRegistrar={noop} alIrARespaldo={noop} />);
    expect(m).not.toContain("8 h / 42 h");
  });
  it("con las reglas de la clínica en domingo, cuenta", () => {
    const m = renderToStaticMarkup(<Inicio datos={datos} reglas={REGLAS_POR_DEFECTO} alRegistrar={noop} alIrARespaldo={noop} />);
    expect(m).toContain("8 h / 42 h");
  });
});
