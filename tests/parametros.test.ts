import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copiarPlantillas } from "../src/dominio/config";
import { PARAMETROS_INCLUIDOS, ParametrosInvalidos, validarParametros } from "../src/dominio/parametros";
import { REGLAS_POR_DEFECTO } from "../src/dominio/reglas";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

/** El documento inicial tal como lo describe parametros-iniciales.md. */
const inicial = () => JSON.parse(/```json\n([\s\S]*?)\n```/.exec(leer("parametros-iniciales.md"))![1]);

/** Copia del documento inicial con un cambio hecho por `f`. */
function con(f: (d: Record<string, any>) => void): unknown {
  const d = inicial();
  f(d);
  return d;
}

describe("validarParametros: el documento de la clínica", () => {
  it("acepta el documento inicial de parametros-iniciales.md", () => {
    const p = validarParametros(inicial());
    expect(p.version).toBe(1);
    expect(p.avisoVersion).toBe(1);
    expect(p.reglas).toEqual(REGLAS_POR_DEFECTO);
    expect(p.festivosAgregados).toEqual([]);
    expect(p.festivosQuitados).toEqual([]);
    expect(Object.keys(p.plantillasPorDefecto)).toEqual(["dia8", "dia12", "noche12"]);
  });

  it("acepta el documento que se creó en Firebase (parametros-iniciales.firestore.json, ya decodificado)", () => {
    type V = Record<string, any>;
    const aPlano = (v: V): unknown =>
      "stringValue" in v ? v.stringValue
      : "integerValue" in v ? Number(v.integerValue)
      : "booleanValue" in v ? v.booleanValue
      : "mapValue" in v ? Object.fromEntries(Object.entries((v.mapValue.fields ?? {}) as Record<string, V>).map(([k, x]) => [k, aPlano(x)]))
      : (v.arrayValue.values ?? []).map(aPlano);
    const doc = JSON.parse(leer("parametros-iniciales.firestore.json")).fields as Record<string, V>;
    const plano = Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, aPlano(v)]));
    expect(validarParametros(plano)).toEqual(validarParametros(inicial()));
  });

  it("las reglas incluidas en la app son las del documento inicial", () => {
    expect(PARAMETROS_INCLUIDOS).toEqual(validarParametros(inicial()));
  });

  it("las plantillas incluidas coinciden con las de ejemplo de la app", () => {
    const ejemplo = copiarPlantillas().map(({ nombre, inicio, fin, descansoMin }) => ({ nombre, inicio, fin, descansoMin }));
    expect(Object.values(PARAMETROS_INCLUIDOS.plantillasPorDefecto)).toEqual(ejemplo);
  });

  it("descarta los campos que no conoce", () => {
    const p = validarParametros(con((d) => { d.cosaRara = 1; d.reglas["2026-01-01"].otra = "x"; }));
    expect(p).not.toHaveProperty("cosaRara");
    expect(p.reglas["2026-01-01"]).not.toHaveProperty("otra");
  });

  it("acepta varias reglas con fechas distintas y plantillas vacías", () => {
    const p = validarParametros(
      con((d) => {
        d.reglas["2027-01-01"] = { ...d.reglas["2026-01-01"], nocturnoDesde: "21:00" };
        d.plantillasPorDefecto = {};
        d.festivosAgregados = ["2026-12-31"];
      }),
    );
    expect(Object.keys(p.reglas)).toEqual(["2026-01-01", "2027-01-01"]);
    expect(p.festivosAgregados).toEqual(["2026-12-31"]);
    expect(p.plantillasPorDefecto).toEqual({});
  });

  describe("rechaza lo que está mal formado, diciendo dónde", () => {
    const rechaza = (caso: unknown, donde: RegExp) => {
      expect(() => validarParametros(caso)).toThrow(ParametrosInvalidos);
      expect(() => validarParametros(caso)).toThrow(donde);
    };

    it("algo que no es un documento", () => {
      rechaza(null, /documento/i);
      rechaza("texto", /documento/i);
      rechaza([], /documento/i);
    });

    for (const campo of ["version", "avisoVersion", "reglas", "festivosAgregados", "festivosQuitados", "plantillasPorDefecto"]) {
      it(`falta ${campo}`, () => rechaza(con((d) => delete d[campo]), new RegExp(campo)));
    }

    it("version y avisoVersion: enteros de 1 en adelante, no texto", () => {
      rechaza(con((d) => (d.version = "1")), /version/);
      rechaza(con((d) => (d.version = 0)), /version/);
      rechaza(con((d) => (d.version = 1.5)), /version/);
      rechaza(con((d) => (d.avisoVersion = -1)), /avisoVersion/);
      rechaza(con((d) => (d.avisoVersion = "1")), /avisoVersion/);
    });

    it("reglas: un mapa con al menos una regla", () => {
      rechaza(con((d) => (d.reglas = {})), /reglas/);
      rechaza(con((d) => (d.reglas = [])), /reglas/);
      rechaza(con((d) => (d.reglas = "x")), /reglas/);
    });

    it("la clave de cada regla es una fecha AAAA-MM-DD real", () => {
      rechaza(con((d) => { d.reglas = { enero: d.reglas["2026-01-01"] }; }), /enero/);
      rechaza(con((d) => { d.reglas = { "2026-13-45": d.reglas["2026-01-01"] }; }), /2026-13-45/);
    });

    it("cada campo de una regla tiene su tipo (un número guardado como texto se rechaza)", () => {
      const r = (f: (x: Record<string, any>) => void) => con((d) => f(d.reglas["2026-01-01"]));
      rechaza(r((x) => (x.minutosSemana = "2520")), /reglas\.2026-01-01\.minutosSemana/);
      rechaza(r((x) => (x.minutosSemana = 0)), /minutosSemana/);
      rechaza(r((x) => (x.minutosSemana = 7 * 24 * 60 + 1)), /minutosSemana/);
      rechaza(r((x) => (x.nocturnoDesde = "7pm")), /nocturnoDesde/);
      rechaza(r((x) => (x.nocturnoHasta = 6)), /nocturnoHasta/);
      rechaza(r((x) => (x.desfaseQuincenas = 2)), /desfaseQuincenas/);
      rechaza(r((x) => (x.desfaseQuincenas = "1")), /desfaseQuincenas/);
      rechaza(r((x) => (x.extrasDescuentanDeuda = "true")), /extrasDescuentanDeuda/);
      rechaza(r((x) => delete x.extrasDescuentanDeuda), /extrasDescuentanDeuda/);
      rechaza(r((x) => delete x.nocturnoDesde), /nocturnoDesde/);
    });

    it("los festivos son listas de fechas reales", () => {
      rechaza(con((d) => (d.festivosAgregados = "2026-12-31")), /festivosAgregados/);
      rechaza(con((d) => (d.festivosAgregados = [20261231])), /festivosAgregados/);
      rechaza(con((d) => (d.festivosQuitados = ["31-12-2026"])), /festivosQuitados/);
      rechaza(con((d) => (d.festivosQuitados = ["2026-02-30"])), /festivosQuitados/);
    });

    it("las plantillas: nombre, horas HH:mm y descanso entero que quepa en el turno", () => {
      const p = (f: (x: Record<string, any>) => void) => con((d) => f(d.plantillasPorDefecto.dia8));
      rechaza(p((x) => (x.nombre = "  ")), /plantillasPorDefecto\.dia8/);
      rechaza(p((x) => (x.inicio = "7")), /plantillasPorDefecto\.dia8/);
      rechaza(p((x) => (x.fin = 16)), /plantillasPorDefecto\.dia8/);
      rechaza(p((x) => (x.descansoMin = -5)), /plantillasPorDefecto\.dia8/);
      rechaza(p((x) => (x.descansoMin = "60")), /plantillasPorDefecto\.dia8/);
      rechaza(p((x) => (x.descansoMin = 600)), /plantillasPorDefecto\.dia8/);
      rechaza(p((x) => delete x.nombre), /plantillasPorDefecto\.dia8/);
    });
  });
});
