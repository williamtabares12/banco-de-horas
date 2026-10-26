import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAVE_COPIA_FORMATO_1, RepositorioLocal } from "../src/almacenamiento/local";
import { ErrorImportacion, exportarJSON, importar, importarJSON } from "../src/almacenamiento/respaldo";
import { extracto, saldo } from "../src/dominio/banco";
import { CONFIG_POR_DEFECTO, PLANTILLAS_POR_DEFECTO } from "../src/dominio/config";
import { nuevoTurno } from "../src/dominio/turnos";

// Archivos generados con el código REAL de la versión anterior (commit 38dea22):
// lo que esa versión dejaba en localStorage y lo que exportaba el botón "Exportar JSON".
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const FORMATO_1 = readFileSync(join(FIXTURES, "formato-1-localstorage.json"), "utf8");
const RESPALDO_FORMATO_1 = readFileSync(join(FIXTURES, "formato-1-respaldo.json"), "utf8");
const original = JSON.parse(FORMATO_1);

const CLAVE_DATOS = "banco-horas:datos";

function almacenFalso(inicial: Record<string, string> = {}) {
  const mapa = new Map<string, string>(Object.entries(inicial));
  return {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => void mapa.set(k, v),
    mapa,
  };
}

describe("el fixture es de verdad el formato anterior", () => {
  it("lleva version 1 y ningún campo de descansos", () => {
    expect(original.version).toBe(1);
    expect(original).not.toHaveProperty("schemaVersion");
    expect(original.config).not.toHaveProperty("plantillas");
    for (const t of original.turnos) expect(t).not.toHaveProperty("descansoMin");
  });
  it("trae un saldo inicial, movimientos manuales y automáticos", () => {
    const tipos = original.movimientos.map((m: { tipo: string }) => m.tipo);
    expect(tipos).toContain("saldo_inicial");
    expect(original.movimientos.some((m: { automatico: boolean }) => m.automatico)).toBe(true);
    expect(original.movimientos.some((m: { automatico: boolean; turnoId?: string }) => !m.automatico && m.turnoId)).toBe(true);
  });
});

describe("CA13: migración del formato 1 al 2", () => {
  const migrado = importarJSON(FORMATO_1);

  it("conserva el saldo inicial tal cual", () => {
    const antes = original.movimientos.find((m: { tipo: string }) => m.tipo === "saldo_inicial");
    const despues = migrado.movimientos.find((m) => m.tipo === "saldo_inicial");
    expect(despues).toEqual(antes);
    expect(despues?.minutos).toBe(40 * 60 + 30);
  });

  it("conserva todos los movimientos, idénticos y en el mismo orden", () => {
    expect(migrado.movimientos).toEqual(original.movimientos);
  });

  it("el saldo y el extracto dan lo mismo que antes de migrar", () => {
    const filas = extracto(migrado.movimientos);
    expect(saldo(migrado.movimientos)).toBe(saldo(original.movimientos));
    expect(filas[filas.length - 1].saldoDespues).toBe(saldo(original.movimientos));
  });

  it("los turnos quedan con descanso 0 y conservan todo lo demás", () => {
    expect(migrado.turnos).toHaveLength(original.turnos.length);
    migrado.turnos.forEach((t, i) => expect(t).toEqual({ ...original.turnos[i], descansoMin: 0 }));
  });

  it("agrega las tres plantillas de ejemplo", () => {
    expect(migrado.config.plantillas).toEqual(PLANTILLAS_POR_DEFECTO);
    expect(migrado.config.plantillas.map((p) => [p.nombre, p.inicio, p.fin, p.descansoMin])).toEqual([
      ["Día 8 h", "07:00", "16:00", 60],
      ["Día 12 h", "07:00", "19:00", 120],
      ["Noche 12 h", "19:00", "07:00", 120],
    ]);
  });

  it("conserva el resto de la configuración y la fecha del último respaldo", () => {
    const { plantillas: _p, ...resto } = migrado.config;
    expect(resto).toEqual({ ...original.config, inicioSemana: 0 }); // lo único nuevo: la semana de domingo a sábado
    expect(migrado.ultimoRespaldo).toBe("2026-10-03");
  });

  it("pasa al schemaVersion actual (3) y deja de usar el campo viejo", () => {
    expect(migrado.schemaVersion).toBe(3);
    expect(migrado).not.toHaveProperty("version");
  });

  it("el respaldo viejo exportado con sangría da los mismos datos", () => {
    expect(importarJSON(RESPALDO_FORMATO_1)).toEqual(migrado);
  });

  it("migrar no repite las plantillas: exportar y volver a importar da lo mismo", () => {
    expect(importarJSON(exportarJSON(migrado))).toEqual(migrado);
    expect(importarJSON(exportarJSON(migrado)).config.plantillas).toHaveLength(3);
  });

  it("migrar no comparte referencias con las plantillas por defecto", () => {
    const otro = importarJSON(FORMATO_1);
    otro.config.plantillas[0].nombre = "cambiado";
    expect(PLANTILLAS_POR_DEFECTO[0].nombre).toBe("Día 8 h");
  });
});

describe("RepositorioLocal con datos guardados en el formato 1", () => {
  it("cargar devuelve los datos migrados", () => {
    const repo = new RepositorioLocal(almacenFalso({ [CLAVE_DATOS]: FORMATO_1 }));
    const datos = repo.cargar();
    expect(datos.schemaVersion).toBe(3);
    expect(datos.movimientos).toEqual(original.movimientos);
  });

  it("cargar no reescribe lo guardado: sigue intacto el original", () => {
    const almacen = almacenFalso({ [CLAVE_DATOS]: FORMATO_1 });
    new RepositorioLocal(almacen).cargar();
    expect(almacen.mapa.get(CLAVE_DATOS)).toBe(FORMATO_1);
  });

  it("al migrar guarda una copia del original, por si algo sale mal", () => {
    const almacen = almacenFalso({ [CLAVE_DATOS]: FORMATO_1 });
    new RepositorioLocal(almacen).cargar();
    expect(almacen.mapa.get(CLAVE_COPIA_FORMATO_1)).toBe(FORMATO_1);
  });

  it("al guardar queda en el formato nuevo y nada se pierde; la copia sigue intacta", () => {
    const almacen = almacenFalso({ [CLAVE_DATOS]: FORMATO_1 });
    const repo = new RepositorioLocal(almacen);
    repo.guardar(repo.cargar());
    const guardado = JSON.parse(almacen.mapa.get(CLAVE_DATOS)!);
    expect(guardado.schemaVersion).toBe(3);
    expect(guardado.movimientos).toEqual(original.movimientos);
    expect(new RepositorioLocal(almacen).cargar().movimientos).toEqual(original.movimientos);
    expect(almacen.mapa.get(CLAVE_COPIA_FORMATO_1)).toBe(FORMATO_1);
  });

  it("datos que ya están en el formato nuevo no generan copia ni cambios", () => {
    const almacen = almacenFalso();
    const repo = new RepositorioLocal(almacen);
    repo.guardar(importarJSON(FORMATO_1));
    const antes = almacen.mapa.get(CLAVE_DATOS);
    new RepositorioLocal(almacen).cargar();
    expect(almacen.mapa.get(CLAVE_DATOS)).toBe(antes);
    expect(almacen.mapa.has(CLAVE_COPIA_FORMATO_1)).toBe(false);
  });

  it("si los datos viejos no se pueden migrar, falla sin tocar nada", () => {
    const roto = JSON.parse(FORMATO_1);
    roto.turnos[0].inicio = "mañana";
    const textoRoto = JSON.stringify(roto);
    const almacen = almacenFalso({ [CLAVE_DATOS]: textoRoto });
    expect(() => new RepositorioLocal(almacen).cargar()).toThrow(ErrorImportacion);
    expect(almacen.mapa.get(CLAVE_DATOS)).toBe(textoRoto);
  });

  it("importar un respaldo viejo reemplaza los datos por los migrados", () => {
    const repo = new RepositorioLocal(almacenFalso());
    importar(repo, RESPALDO_FORMATO_1);
    const datos = repo.cargar();
    expect(datos.movimientos).toEqual(original.movimientos);
    expect(datos.turnos.every((t) => t.descansoMin === 0)).toBe(true);
    expect(datos.config.plantillas).toHaveLength(3);
  });

  it("importar un respaldo viejo dañado no borra los datos actuales", () => {
    const repo = new RepositorioLocal(almacenFalso());
    importar(repo, RESPALDO_FORMATO_1);
    const antes = repo.cargar();
    const roto = JSON.parse(RESPALDO_FORMATO_1);
    delete roto.movimientos;
    expect(() => importar(repo, JSON.stringify(roto))).toThrow(ErrorImportacion);
    expect(repo.cargar()).toEqual(antes);
  });
});

describe("versiones desconocidas", () => {
  const nuevo = () => JSON.parse(exportarJSON(importarJSON(FORMATO_1)));

  it("un archivo de una versión más nueva se rechaza con un mensaje claro", () => {
    const d = nuevo();
    d.schemaVersion = 4;
    expect(() => importarJSON(JSON.stringify(d))).toThrow(/versi/i);
  });
  it("un archivo sin ninguna versión se rechaza", () => {
    const d = nuevo();
    delete d.schemaVersion;
    expect(() => importarJSON(JSON.stringify(d))).toThrow(ErrorImportacion);
  });
  it("una versión que no es número se rechaza", () => {
    const d = nuevo();
    d.schemaVersion = "2";
    expect(() => importarJSON(JSON.stringify(d))).toThrow(ErrorImportacion);
  });
});

describe("modelo nuevo: descanso en el turno", () => {
  const entrada = {
    inicio: "2026-09-14T07:00",
    fin: "2026-09-14T16:00",
    minutosProgramados: 480,
    tipo: "ordinario" as const,
  };

  it("un turno nuevo sin descanso queda con descansoMin 0", () => {
    expect(nuevoTurno(entrada, "2026-09-14T17:00:00", "t1").descansoMin).toBe(0);
  });
  it("guarda el descanso indicado", () => {
    expect(nuevoTurno({ ...entrada, descansoMin: 60 }, "2026-09-14T17:00:00", "t1").descansoMin).toBe(60);
  });
  it("un turno de alquiler siempre tiene descanso 0", () => {
    const t = nuevoTurno({ ...entrada, tipo: "alquiler", destino: "deuda", descansoMin: 60 }, "2026-09-14T17:00:00", "t1");
    expect(t.descansoMin).toBe(0);
  });
  it("rechaza un descanso negativo o con decimales", () => {
    expect(() => nuevoTurno({ ...entrada, descansoMin: -1 }, "x", "t1")).toThrow();
    expect(() => nuevoTurno({ ...entrada, descansoMin: 30.5 }, "x", "t1")).toThrow();
  });
  it("rechaza un descanso mayor que el turno", () => {
    expect(() => nuevoTurno({ ...entrada, descansoMin: 9 * 60 + 1 }, "x", "t1")).toThrow(/descanso/i);
  });
});

describe("modelo nuevo: validación al importar", () => {
  const nuevo = () => JSON.parse(exportarJSON(importarJSON(FORMATO_1)));
  function rechaza(cambio: (d: any) => void) {
    const d = nuevo();
    cambio(d);
    expect(() => importarJSON(JSON.stringify(d))).toThrow(ErrorImportacion);
  }

  it("el formato 2 completo se importa sin cambios", () => {
    const d = nuevo();
    expect(importarJSON(JSON.stringify(d))).toEqual(d);
  });
  it("un turno del formato 2 necesita descansoMin", () => rechaza((d) => delete d.turnos[0].descansoMin));
  it("descansoMin negativo", () => rechaza((d) => (d.turnos[0].descansoMin = -5)));
  it("descansoMin con decimales", () => rechaza((d) => (d.turnos[0].descansoMin = 10.5)));
  it("descansoMin mayor que el turno", () => rechaza((d) => (d.turnos[0].descansoMin = 99999)));
  it("la configuración del formato 2 necesita plantillas", () => rechaza((d) => delete d.config.plantillas));
  it("plantillas que no son una lista", () => rechaza((d) => (d.config.plantillas = "x")));
  it("plantilla sin nombre", () => rechaza((d) => (d.config.plantillas[0].nombre = "")));
  it("plantilla con hora de inicio inválida", () => rechaza((d) => (d.config.plantillas[0].inicio = "7am")));
  it("plantilla con hora de fin inválida", () => rechaza((d) => (d.config.plantillas[0].fin = "")));
  it("plantilla con descanso negativo", () => rechaza((d) => (d.config.plantillas[0].descansoMin = -1)));
  it("plantillas con ids repetidos", () => rechaza((d) => (d.config.plantillas[1].id = d.config.plantillas[0].id)));
  it("una lista de plantillas vacía es válida (se pueden borrar todas)", () => {
    const d = nuevo();
    d.config.plantillas = [];
    expect(importarJSON(JSON.stringify(d)).config.plantillas).toEqual([]);
  });
  it("la configuración por defecto trae las tres plantillas", () => {
    expect(CONFIG_POR_DEFECTO.plantillas).toEqual(PLANTILLAS_POR_DEFECTO);
  });
});
