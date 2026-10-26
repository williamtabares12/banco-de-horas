// T39 / CA22 y CA23: la semana va de domingo a sábado (el primer día es configurable: 0 = domingo, 1 = lunes).
import { describe, it, expect } from "vitest";
import { inicioSemana } from "../src/dominio/tiempo";
import { metaSemana, minutosDeSemana } from "../src/dominio/semana";
import { reglasDeConfig, REGLAS_POR_DEFECTO, reglasVigentes, type ReglasGlobales } from "../src/dominio/reglas";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { PARAMETROS_INCLUIDOS, validarParametros } from "../src/dominio/parametros";
import { migrar, VERSION_ESQUEMA } from "../src/almacenamiento/migracion";
import { leerDatos, validarConfig } from "../src/almacenamiento/respaldo";
import type { Turno } from "../src/dominio/tipos";

const H = 60;
const AHORA = "2026-10-26T10:00:00";

function turno(parcial: Partial<Turno> = {}): Turno {
  return {
    id: `t${Math.random()}`,
    inicio: "2026-10-04T07:00",
    fin: "2026-10-04T15:00",
    descansoMin: 0,
    minutosProgramados: 0,
    tipo: "alquiler",
    destino: "semana",
    creadoEn: AHORA,
    modificadoEn: AHORA,
    ...parcial,
  };
}

describe("inicioSemana: el primer día de la semana", () => {
  it("por defecto es el domingo", () => {
    expect(inicioSemana("2026-10-04")).toBe("2026-10-04"); // domingo: abre la semana
    expect(inicioSemana("2026-10-07")).toBe("2026-10-04"); // miércoles
    expect(inicioSemana("2026-10-10")).toBe("2026-10-04"); // sábado: la cierra
    expect(inicioSemana("2026-10-03")).toBe("2026-09-27"); // el sábado anterior es de la semana pasada
  });
  it("con 1 (lunes) vuelve a la semana de lunes a domingo", () => {
    expect(inicioSemana("2026-10-04", 1)).toBe("2026-09-28"); // el domingo cierra la semana
    expect(inicioSemana("2026-10-05", 1)).toBe("2026-10-05");
    expect(inicioSemana("2026-10-11", 1)).toBe("2026-10-05");
  });
});

describe("CA22: semana de domingo a sábado", () => {
  const domingo = turno({ inicio: "2026-10-04T07:00", fin: "2026-10-04T15:00" });

  it("un alquiler del domingo 4 de octubre suma a la semana del 4 al 10 y no a la del 27 de septiembre al 3 de octubre", () => {
    expect(minutosDeSemana([domingo], "2026-10-07")).toBe(8 * H);
    expect(minutosDeSemana([domingo], "2026-10-10")).toBe(8 * H);
    expect(minutosDeSemana([domingo], "2026-09-30")).toBe(0);
    expect(minutosDeSemana([domingo], "2026-10-03")).toBe(0);
  });

  it("la noche del sábado 3 (19:00) al domingo 4 (07:00) cuenta entera en la semana del 27 de septiembre al 3 de octubre", () => {
    const noche = turno({ inicio: "2026-10-03T19:00", fin: "2026-10-04T07:00" }); // 12 h
    expect(minutosDeSemana([noche], "2026-09-30")).toBe(12 * H);
    expect(minutosDeSemana([noche], "2026-10-03")).toBe(12 * H);
    expect(minutosDeSemana([noche], "2026-10-04")).toBe(0);
    expect(minutosDeSemana([noche], "2026-10-07")).toBe(0);
  });
});

describe("CA23: con inicioSemana en lunes se vuelve a lunes-domingo, y el saldo no cambia", () => {
  it("el alquiler del domingo 4 suma a la semana del 28 de septiembre al 4 de octubre", () => {
    const domingo = turno({ inicio: "2026-10-04T07:00", fin: "2026-10-04T15:00" });
    expect(minutosDeSemana([domingo], "2026-09-30", 1)).toBe(8 * H);
    expect(minutosDeSemana([domingo], "2026-10-04", 1)).toBe(8 * H);
    expect(minutosDeSemana([domingo], "2026-10-07", 1)).toBe(0);
  });
  it("el parámetro solo mueve el límite de la semana: no toca turnos ni movimientos (no hay nada que recalcular en el banco)", () => {
    const turnos = [turno({ inicio: "2026-10-04T07:00", fin: "2026-10-04T15:00" })];
    const copia = JSON.stringify(turnos);
    minutosDeSemana(turnos, "2026-10-07", 1);
    expect(JSON.stringify(turnos)).toBe(copia);
  });
});

describe("el primer día de la semana viaja en las reglas", () => {
  it("las reglas incluidas en la app arrancan la semana en domingo", () => {
    expect(REGLAS_POR_DEFECTO["2026-01-01"].inicioSemana).toBe(0);
    expect(PARAMETROS_INCLUIDOS.reglas["2026-01-01"].inicioSemana).toBe(0);
  });
  it("la configuración personal se ve como una regla con su inicioSemana", () => {
    expect(reglasVigentes(reglasDeConfig({ ...CONFIG_POR_DEFECTO, inicioSemana: 1 }), "2026-10-04").inicioSemana).toBe(1);
    expect(reglasVigentes(reglasDeConfig(CONFIG_POR_DEFECTO), "2026-10-04").inicioSemana).toBe(0);
  });
  it("metaSemana busca la regla con el primer día de la semana que corresponde", () => {
    const base = REGLAS_POR_DEFECTO["2026-01-01"];
    const reglas: ReglasGlobales = {
      "2026-01-01": base,
      "2026-10-05": { ...base, minutosSemana: 40 * H }, // arranca un lunes
    };
    // semana de domingo: la del 4 al 10 empieza el domingo 4, antes de la regla nueva
    expect(metaSemana("2026-10-07", reglas)).toBe(42 * H);
    expect(metaSemana("2026-10-11", reglas)).toBe(40 * H);
  });
});

describe("el documento de parámetros", () => {
  const documento = () => JSON.parse(JSON.stringify(PARAMETROS_INCLUIDOS));

  it("lee inicioSemana de cada regla", () => {
    const d = documento();
    d.reglas["2026-01-01"].inicioSemana = 1;
    expect(validarParametros(d).reglas["2026-01-01"].inicioSemana).toBe(1);
  });
  it("si la regla no lo trae (el documento publicado antes de T39), rige el domingo, que es el valor por defecto", () => {
    const d = documento();
    delete d.reglas["2026-01-01"].inicioSemana;
    expect(validarParametros(d).reglas["2026-01-01"].inicioSemana).toBe(0);
  });
  it("rechaza un valor que no sea 0 ni 1 (por ejemplo, el texto 'domingo' o un 2)", () => {
    for (const malo of [2, -1, "0", "domingo", null]) {
      const d = documento();
      d.reglas["2026-01-01"].inicioSemana = malo;
      expect(() => validarParametros(d), String(malo)).toThrow(/inicioSemana/);
    }
  });
});

describe("datos guardados: schemaVersion 3 agrega config.inicioSemana = 0", () => {
  const configV2 = () => {
    const { inicioSemana: _quitada, ...resto } = CONFIG_POR_DEFECTO;
    return resto;
  };

  it("la versión actual del esquema es 3", () => {
    expect(VERSION_ESQUEMA).toBe(3);
  });
  it("migrar lleva un respaldo de la versión 2 a la 3 sin tocar turnos ni movimientos", () => {
    const movimientos = [
      { id: "m1", fecha: "2026-08-10", tipo: "saldo_inicial", minutos: 1560, automatico: false, creadoEn: AHORA, modificadoEn: AHORA },
    ];
    const v2 = { schemaVersion: 2, config: configV2(), turnos: [], movimientos };
    const { datos, migrado } = migrar(v2) as { datos: { schemaVersion: number; config: { inicioSemana: number }; movimientos: unknown }; migrado: boolean };
    expect(migrado).toBe(true);
    expect(datos.schemaVersion).toBe(3);
    expect(datos.config.inicioSemana).toBe(0);
    expect(datos.movimientos).toEqual(movimientos);
  });
  it("migrar no cambia una configuración que ya trae inicioSemana", () => {
    const v2 = { schemaVersion: 2, config: { ...configV2(), inicioSemana: 1 }, turnos: [], movimientos: [] };
    const { datos } = migrar(v2) as { datos: { config: { inicioSemana: number } } };
    expect(datos.config.inicioSemana).toBe(1);
  });
  it("un respaldo de la versión 1 pasa por las dos migraciones", () => {
    const v1 = { version: 1, config: { ...configV2(), plantillas: undefined }, turnos: [], movimientos: [] };
    const { datos } = migrar(v1) as { datos: { schemaVersion: number; config: { inicioSemana: number } } };
    expect(datos.schemaVersion).toBe(3);
    expect(datos.config.inicioSemana).toBe(0);
  });
  it("importar un respaldo de la versión 2 funciona y queda en la versión 3", () => {
    const v2 = JSON.stringify({ schemaVersion: 2, config: configV2(), turnos: [], movimientos: [] });
    const { datos, migrado } = leerDatos(v2);
    expect(migrado).toBe(true);
    expect(datos.schemaVersion).toBe(3);
    expect(datos.config.inicioSemana).toBe(0);
  });
  it("una configuración guardada en la nube antes de T39 (sin inicioSemana) se lee con domingo", () => {
    expect(validarConfig(configV2()).inicioSemana).toBe(0);
  });
  it("validarConfig rechaza un inicioSemana que no sea 0 ni 1", () => {
    expect(() => validarConfig({ ...CONFIG_POR_DEFECTO, inicioSemana: 3 })).toThrow(/inicioSemana/);
  });
  it("la configuración por defecto arranca en domingo", () => {
    expect(CONFIG_POR_DEFECTO.inicioSemana).toBe(0);
  });
});
