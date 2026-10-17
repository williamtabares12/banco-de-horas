import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pantallaDeCuenta, respuestasPorDefecto } from "../src/dominio/bienvenida";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { leerAviso } from "../src/dominio/aviso";
import { esFestivo, unirFestivos } from "../src/dominio/festivos";
import {
  PARAMETROS_INCLUIDOS,
  calculoDe,
  descripcionDeReglas,
  plantillasDeParametros,
  type Parametros,
} from "../src/dominio/parametros";
import { segmentar } from "../src/dominio/segmentar";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const parametros = (cambios: Partial<Parametros> = {}): Parametros => ({ ...PARAMETROS_INCLUIDOS, ...cambios });

describe("unirFestivos: festivos de la clínica más los propios", () => {
  it("junta las dos listas sin repetir y sin tocar las originales", () => {
    const globales = { festivosAgregados: ["2026-12-31", "2026-12-24"], festivosQuitados: ["2026-08-17"] };
    const propios = { festivosAgregados: ["2026-12-24", "2026-11-30"], festivosQuitados: [] };
    const unidos = unirFestivos(globales, propios);
    expect(unidos.festivosAgregados.sort()).toEqual(["2026-11-30", "2026-12-24", "2026-12-31"]);
    expect(unidos.festivosQuitados).toEqual(["2026-08-17"]);
    expect(globales.festivosAgregados).toEqual(["2026-12-31", "2026-12-24"]);
  });
  it("con una lista vacía deja la otra igual", () => {
    const una = { festivosAgregados: ["2026-12-31"], festivosQuitados: [] };
    expect(unirFestivos(una, { festivosAgregados: [], festivosQuitados: [] })).toEqual(una);
  });
});

describe("calculoDe: con qué se calcula (config y reglas)", () => {
  it("sin parámetros (versión personal) todo queda como estaba: la configuración y ninguna regla", () => {
    const c = calculoDe(CONFIG_POR_DEFECTO);
    expect(c.config).toEqual(CONFIG_POR_DEFECTO);
    expect(c.reglas).toBeUndefined();
  });

  it("con parámetros, las reglas son las del documento", () => {
    expect(calculoDe(CONFIG_POR_DEFECTO, PARAMETROS_INCLUIDOS).reglas).toEqual(PARAMETROS_INCLUIDOS.reglas);
  });

  it("con parámetros, los festivos de la clínica se suman a los propios", () => {
    const c = calculoDe({ ...CONFIG_POR_DEFECTO, festivosAgregados: ["2026-11-30"] }, parametros({ festivosAgregados: ["2026-12-31"] }));
    expect(c.config.festivosAgregados.sort()).toEqual(["2026-11-30", "2026-12-31"]);
    expect(esFestivo("2026-12-31", c.config)).toBe(true);
    expect(esFestivo("2026-11-30", c.config)).toBe(true);
  });

  it("el festivo extra de la clínica cambia el cálculo de un turno ese día", () => {
    // Jueves 31 de diciembre de 2026: no es festivo oficial. Con el festivo extra, sus horas son dominicales.
    const normal = calculoDe(CONFIG_POR_DEFECTO, parametros());
    const extra = calculoDe(CONFIG_POR_DEFECTO, parametros({ festivosAgregados: ["2026-12-31"] }));
    const a = segmentar("2026-12-31T08:00", "2026-12-31T12:00", normal.config, 0, normal.reglas);
    const b = segmentar("2026-12-31T08:00", "2026-12-31T12:00", extra.config, 0, extra.reglas);
    expect(a.total.diurno).toBe(240);
    expect(b.total.dominicalDiurno).toBe(240);
  });

  it("no cambia los demás datos de la configuración personal", () => {
    const personal = { ...CONFIG_POR_DEFECTO, minutosSemana: 40 * 60 };
    expect(calculoDe(personal, PARAMETROS_INCLUIDOS).config.minutosSemana).toBe(2400);
  });
});

describe("plantillasPorDefecto del documento -> plantillas de una persona nueva", () => {
  it("se copian con su nombre, horario y descanso, y un id propio", () => {
    const p = plantillasDeParametros(PARAMETROS_INCLUIDOS);
    expect(p.map((x) => x.nombre)).toEqual(["Día 8 h", "Día 12 h", "Noche 12 h"]);
    expect(p[0]).toEqual({ id: "plantilla-dia8", nombre: "Día 8 h", inicio: "07:00", fin: "16:00", descansoMin: 60 });
    expect(new Set(p.map((x) => x.id)).size).toBe(3);
  });
  it("sin plantillas en el documento, la persona empieza sin ninguna", () => {
    expect(plantillasDeParametros(parametros({ plantillasPorDefecto: {} }))).toEqual([]);
  });
});

describe("la bienvenida arranca con los valores de la clínica", () => {
  it("sin parámetros, igual que antes", () => {
    const r = respuestasPorDefecto("2026-10-16");
    expect(r.minutosSemana).toBe(2520);
    expect(r.nocturnoDesde).toBe("19:00");
    expect(r.plantillas).toEqual(CONFIG_POR_DEFECTO.plantillas);
  });
  it("con parámetros, las horas semanales y las plantillas salen del documento", () => {
    const p = parametros({
      reglas: { "2026-01-01": { ...PARAMETROS_INCLUIDOS.reglas["2026-01-01"], minutosSemana: 2400, nocturnoDesde: "20:00" } },
      plantillasPorDefecto: { solo: { nombre: "Única", inicio: "08:00", fin: "14:00", descansoMin: 30 } },
    });
    const r = respuestasPorDefecto("2026-10-16", p);
    expect(r.minutosSemana).toBe(2400);
    expect(r.nocturnoDesde).toBe("20:00");
    expect(r.plantillas).toEqual([{ id: "plantilla-solo", nombre: "Única", inicio: "08:00", fin: "14:00", descansoMin: 30 }]);
  });
  it("usa la regla que rige HOY, no la primera", () => {
    const p = parametros({
      reglas: {
        "2026-01-01": { ...PARAMETROS_INCLUIDOS.reglas["2026-01-01"], minutosSemana: 2520 },
        "2026-10-01": { ...PARAMETROS_INCLUIDOS.reglas["2026-01-01"], minutosSemana: 2400 },
      },
    });
    expect(respuestasPorDefecto("2026-09-30", p).minutosSemana).toBe(2520);
    expect(respuestasPorDefecto("2026-10-16", p).minutosSemana).toBe(2400);
  });
  it("el aviso sigue empezando sin aceptar", () => {
    expect(respuestasPorDefecto("2026-10-16", PARAMETROS_INCLUIDOS).avisoAceptado).toBe(false);
  });
});

describe("CC17: si sube avisoVersion, se pide aceptar el aviso de nuevo", () => {
  const perfil = (avisoVersion: number) => ({
    correo: "ana@correo.com",
    creadoEn: "2026-10-01T08:00:00",
    avisoVersion,
    avisoAceptadoEn: "2026-10-01T08:00:00",
    schemaVersion: 2 as const,
  });

  it("sin perfil es la primera vez: bienvenida", () => {
    expect(pantallaDeCuenta(null, 1)).toBe("bienvenida");
  });
  it("con el aviso vigente aceptado, entra a la app", () => {
    expect(pantallaDeCuenta(perfil(1), 1)).toBe("app");
  });
  it("si la versión vigente subió, pide aceptar de nuevo (sin pasar por la bienvenida)", () => {
    expect(pantallaDeCuenta(perfil(1), 2)).toBe("nuevoAviso");
    expect(pantallaDeCuenta(perfil(2), 5)).toBe("nuevoAviso");
  });
  it("si alguien baja el número por error, no se vuelve a pedir lo ya aceptado", () => {
    expect(pantallaDeCuenta(perfil(3), 2)).toBe("app");
  });
});

describe("el número de versión del aviso", () => {
  it("el documento de parámetros incluido y aviso-privacidad.md dicen lo mismo", () => {
    const aviso = leerAviso(readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8"));
    expect(PARAMETROS_INCLUIDOS.avisoVersion).toBe(aviso.version);
  });
});

describe("descripcionDeReglas: lo que se muestra en solo lectura en Ajustes", () => {
  const base = PARAMETROS_INCLUIDOS.reglas["2026-01-01"];
  const reglas = {
    "2027-01-01": { ...base, nocturnoDesde: "21:00", desfaseQuincenas: 0 as const, extrasDescuentanDeuda: false },
    "2026-01-01": base,
  };

  it("lista cada regla con su fecha de inicio, de la más antigua a la más nueva", () => {
    const d = descripcionDeReglas(reglas, "2026-10-16");
    expect(d.map((x) => x.desde)).toEqual(["2026-01-01", "2027-01-01"]);
  });
  it("dice la hora nocturna, las horas semanales, dónde se cobra y si las extras descuentan deuda", () => {
    const [primera] = descripcionDeReglas(reglas, "2026-10-16");
    expect(primera.nocturna).toBe("19:00 a 06:00");
    expect(primera.semana).toBe("42 h");
    expect(primera.cobro).toBe("En la quincena siguiente");
    expect(primera.extras).toBe("Sí");
    const segunda = descripcionDeReglas(reglas, "2026-10-16")[1];
    expect(segunda.nocturna).toBe("21:00 a 06:00");
    expect(segunda.cobro).toBe("En la misma quincena");
    expect(segunda.extras).toBe("No");
  });
  it("marca cuál rige hoy y cuáles todavía no empiezan", () => {
    const d = descripcionDeReglas(reglas, "2026-10-16");
    expect(d.map((x) => x.estado)).toEqual(["vigente", "programada"]);
    const despues = descripcionDeReglas(reglas, "2027-03-01");
    expect(despues.map((x) => x.estado)).toEqual(["anterior", "vigente"]);
  });
  it("antes de la primera regla rige la primera (hacia atrás)", () => {
    expect(descripcionDeReglas(reglas, "2020-01-01").map((x) => x.estado)).toEqual(["vigente", "programada"]);
  });
});
