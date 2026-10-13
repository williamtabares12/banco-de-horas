import { describe, it, expect } from "vitest";
import { RepositorioLocal } from "../src/almacenamiento/local";
import { exportarJSON, importarJSON, importar, ErrorImportacion } from "../src/almacenamiento/respaldo";
import type { Datos } from "../src/almacenamiento/repositorio";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";

// localStorage falso en memoria
function almacenFalso() {
  const mapa = new Map<string, string>();
  return {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => void mapa.set(k, v),
    mapa,
  };
}

const AHORA = "2026-09-20T10:00:00";

function datosEjemplo(): Datos {
  return {
    version: 1,
    config: { ...CONFIG_POR_DEFECTO, festivosAgregados: ["2026-10-13"] },
    turnos: [
      {
        id: "t1",
        inicio: "2026-09-12T19:00",
        fin: "2026-09-13T03:00",
        minutosProgramados: 360,
        tipo: "ordinario",
        nota: "turno de prueba",
        creadoEn: AHORA,
        modificadoEn: AHORA,
      },
      {
        id: "t2",
        inicio: "2026-09-14T07:00",
        fin: "2026-09-14T15:00",
        minutosProgramados: 0,
        tipo: "alquiler",
        destino: "deuda",
        creadoEn: AHORA,
        modificadoEn: AHORA,
      },
    ],
    movimientos: [
      {
        id: "m1",
        fecha: "2026-09-01",
        tipo: "saldo_inicial",
        minutos: 2400,
        automatico: false,
        creadoEn: AHORA,
        modificadoEn: AHORA,
      },
      {
        id: "m2",
        fecha: "2026-09-12",
        tipo: "pago",
        minutos: -120,
        turnoId: "t1",
        automatico: true,
        nota: "autorizó la coordinadora",
        creadoEn: AHORA,
        modificadoEn: AHORA,
      },
    ],
  };
}

describe("RepositorioLocal", () => {
  it("sin datos guardados devuelve datos vacíos con la configuración por defecto", () => {
    const repo = new RepositorioLocal(almacenFalso());
    expect(repo.cargar()).toEqual({ version: 1, config: CONFIG_POR_DEFECTO, turnos: [], movimientos: [] });
  });

  it("guarda y lee los mismos datos", () => {
    const repo = new RepositorioLocal(almacenFalso());
    repo.guardar(datosEjemplo());
    expect(repo.cargar()).toEqual(datosEjemplo());
  });

  it("dos repositorios sobre el mismo almacén comparten los datos", () => {
    const almacen = almacenFalso();
    new RepositorioLocal(almacen).guardar(datosEjemplo());
    expect(new RepositorioLocal(almacen).cargar()).toEqual(datosEjemplo());
  });

  it("si lo guardado está dañado lanza error en vez de devolver datos vacíos", () => {
    const almacen = almacenFalso();
    almacen.setItem("banco-horas:datos", "{no es json");
    expect(() => new RepositorioLocal(almacen).cargar()).toThrow();
  });
});

describe("exportar e importar JSON", () => {
  it("exportar y luego importar devuelve los mismos datos", () => {
    const texto = exportarJSON(datosEjemplo());
    expect(importarJSON(texto)).toEqual(datosEjemplo());
  });

  it("el JSON exportado es texto legible con la versión", () => {
    const parsed = JSON.parse(exportarJSON(datosEjemplo()));
    expect(parsed.version).toBe(1);
    expect(parsed.turnos).toHaveLength(2);
  });

  it("importar descarta campos desconocidos", () => {
    const sucio = JSON.parse(exportarJSON(datosEjemplo()));
    sucio.cedula = "123";
    sucio.turnos[0].salario = 999;
    sucio.movimientos[0].extra = "x";
    const limpio = importarJSON(JSON.stringify(sucio));
    expect(limpio).toEqual(datosEjemplo());
  });
});

describe("importar archivo inválido", () => {
  function conCambio(cambio: (d: any) => void): string {
    const d = JSON.parse(exportarJSON(datosEjemplo()));
    cambio(d);
    return JSON.stringify(d);
  }

  const casos: [string, string][] = [
    ["texto que no es JSON", "esto no es json"],
    ["JSON que no es un objeto", "[1, 2, 3]"],
    ["versión desconocida", conCambio((d) => (d.version = 99))],
    ["falta la lista de turnos", conCambio((d) => delete d.turnos)],
    ["falta la configuración", conCambio((d) => delete d.config)],
    ["turno sin inicio", conCambio((d) => delete d.turnos[0].inicio)],
    ["fecha con formato malo", conCambio((d) => (d.turnos[0].inicio = "12/09/2026 19:00"))],
    ["turno cuyo fin no es posterior al inicio", conCambio((d) => (d.turnos[0].fin = d.turnos[0].inicio))],
    ["minutos programados negativos", conCambio((d) => (d.turnos[0].minutosProgramados = -5))],
    ["minutos programados con decimales", conCambio((d) => (d.turnos[0].minutosProgramados = 10.5))],
    ["tipo de turno desconocido", conCambio((d) => (d.turnos[0].tipo = "extra"))],
    ["alquiler sin destino", conCambio((d) => delete d.turnos[1].destino)],
    ["alquiler con destino inválido", conCambio((d) => (d.turnos[1].destino = "plata"))],
    ["tipo de movimiento desconocido", conCambio((d) => (d.movimientos[0].tipo = "regalo"))],
    ["minutos de movimiento que no son entero", conCambio((d) => (d.movimientos[0].minutos = "40"))],
    ["automatico que no es booleano", conCambio((d) => (d.movimientos[0].automatico = "si"))],
    ["ids de turno repetidos", conCambio((d) => (d.turnos[1].id = d.turnos[0].id))],
    ["ids de movimiento repetidos", conCambio((d) => (d.movimientos[1].id = d.movimientos[0].id))],
    ["desfase de quincenas inválido", conCambio((d) => (d.config.desfaseQuincenas = 2))],
    ["hora nocturna con formato malo", conCambio((d) => (d.config.nocturnoDesde = "7pm"))],
    ["festivos que no son una lista de fechas", conCambio((d) => (d.config.festivosAgregados = ["mañana"]))],
  ];

  it.each(casos)("rechaza: %s", (_nombre, texto) => {
    expect(() => importarJSON(texto)).toThrow(ErrorImportacion);
  });

  it("el error dice qué estaba mal", () => {
    const texto = conCambio((d) => delete d.turnos[0].inicio);
    expect(() => importarJSON(texto)).toThrow(/turno/i);
  });

  it("un archivo inválido no borra los datos actuales", () => {
    const repo = new RepositorioLocal(almacenFalso());
    repo.guardar(datosEjemplo());
    for (const [, texto] of casos) {
      expect(() => importar(repo, texto)).toThrow(ErrorImportacion);
    }
    expect(repo.cargar()).toEqual(datosEjemplo());
  });

  it("un archivo válido reemplaza los datos actuales", () => {
    const repo = new RepositorioLocal(almacenFalso());
    repo.guardar({ version: 1, config: CONFIG_POR_DEFECTO, turnos: [], movimientos: [] });
    importar(repo, exportarJSON(datosEjemplo()));
    expect(repo.cargar()).toEqual(datosEjemplo());
  });
});
