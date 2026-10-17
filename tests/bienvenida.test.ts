import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAviso } from "../src/dominio/aviso";
import {
  PASOS,
  crearDatosIniciales,
  crearPerfil,
  errorDelPaso,
  puedeContinuar,
  respuestasPorDefecto,
  type Respuestas,
} from "../src/dominio/bienvenida";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const AVISO = readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8");

describe("el aviso de privacidad se lee de aviso-privacidad.md", () => {
  const aviso = leerAviso(AVISO);

  it("trae la versión del aviso", () => {
    expect(aviso.version).toBe(1);
  });
  it("trae el título y las 11 secciones, sin las notas para Alejandro", () => {
    expect(aviso.titulo).toMatch(/^Aviso de privacidad de /);
    expect(aviso.secciones).toHaveLength(11);
    expect(aviso.secciones[0].titulo).toBe("1. Quién es el responsable");
    expect(aviso.secciones[10].titulo).toBe("11. Cambios");
    expect(JSON.stringify(aviso)).not.toMatch(/Notas para Alejandro|Hazlo revisar/);
  });
  it("no queda ningún dato pendiente entre corchetes en lo que ve la gente", () => {
    expect(JSON.stringify(aviso)).not.toMatch(/\[[A-ZÁÉÍÓÚÑ ]{4,}\]/);
  });
  it("trae el nombre de la app, el responsable y el correo de contacto", () => {
    const todo = JSON.stringify(aviso);
    expect(todo).toContain("Arena");
    expect(todo).toContain("ALEJANDRO TABARES");
    expect(todo).toContain("wtabares@comfamiliar.com");
  });
  it("distingue párrafos de listas", () => {
    const datos = aviso.secciones[1]; // 2. Qué datos se guardan
    const lista = datos.bloques.find((b) => b.tipo === "lista");
    expect(lista && lista.tipo === "lista" && lista.items).toHaveLength(5);
  });
  it("trae el texto de la casilla de autorización", () => {
    expect(aviso.textoAutorizacion).toBe("He leído el aviso de privacidad y autorizo el tratamiento de mis datos para el fin descrito.");
  });
  it("sin versión o sin secciones es un error (no se muestra un aviso a medias)", () => {
    expect(() => leerAviso("# nada")).toThrow();
    expect(() => leerAviso("Versión del aviso: 1 (borrador)\n\n---\n\n## Título\n")).toThrow();
  });
  it("se entiende con saltos de línea de Windows", () => {
    expect(leerAviso(AVISO.replace(/\n/g, "\r\n")).secciones).toHaveLength(11);
  });
});

describe("pasos de la bienvenida (RF-C2)", () => {
  const base = (): Respuestas => ({ ...respuestasPorDefecto("2026-10-16"), avisoAceptado: true });

  it("son cuatro, en este orden", () => {
    expect(PASOS).toEqual(["aviso", "saldo", "jornada", "plantillas"]);
  });

  describe("CC3: sin aceptar el aviso no se continúa", () => {
    it("por defecto el aviso NO está aceptado", () => {
      expect(respuestasPorDefecto("2026-10-16").avisoAceptado).toBe(false);
      expect(puedeContinuar("aviso", respuestasPorDefecto("2026-10-16"))).toBe(false);
    });
    it("aceptado, se puede seguir", () => {
      expect(puedeContinuar("aviso", base())).toBe(true);
    });
    it("no se crean los datos de la cuenta si no se aceptó", () => {
      const sinAceptar = { ...base(), avisoAceptado: false };
      expect(() => crearDatosIniciales(sinAceptar, "2026-10-16T08:00:00", () => "id")).toThrow(/aviso/i);
    });
  });

  it("valores por defecto: 42 h, jornada nocturna desde las 19:00, las tres plantillas de ejemplo y saldo de hoy", () => {
    const r = respuestasPorDefecto("2026-10-16");
    expect(r.minutosSemana).toBe(42 * 60);
    expect(r.nocturnoDesde).toBe("19:00");
    expect(r.plantillas).toEqual(CONFIG_POR_DEFECTO.plantillas);
    expect(r.saldoFecha).toBe("2026-10-16");
    expect(r.saldoMinutos).toBe(0);
  });

  describe("saldo inicial", () => {
    it("puede ser 0", () => {
      expect(errorDelPaso("saldo", { ...base(), saldoMinutos: 0 })).toBeNull();
    });
    it("no puede ser negativo ni fraccionario", () => {
      expect(errorDelPaso("saldo", { ...base(), saldoMinutos: -60 })).not.toBeNull();
      expect(errorDelPaso("saldo", { ...base(), saldoMinutos: 90.5 })).not.toBeNull();
    });
    it("si no se entiende lo escrito, el mensaje dice cómo escribirlo", () => {
      expect(errorDelPaso("saldo", { ...base(), saldoMinutos: NaN })).toMatch(/No entiendo.*4:30/);
    });
    it("la fecha debe ser AAAA-MM-DD válida", () => {
      expect(errorDelPaso("saldo", { ...base(), saldoFecha: "" })).not.toBeNull();
      expect(errorDelPaso("saldo", { ...base(), saldoFecha: "2026-13-40" })).not.toBeNull();
    });
  });

  describe("jornada", () => {
    it("42 h y 19:00 son válidos", () => {
      expect(errorDelPaso("jornada", base())).toBeNull();
    });
    it("las horas semanales deben ser positivas y caber en una semana", () => {
      expect(errorDelPaso("jornada", { ...base(), minutosSemana: 0 })).not.toBeNull();
      expect(errorDelPaso("jornada", { ...base(), minutosSemana: 7 * 24 * 60 + 1 })).not.toBeNull();
      expect(errorDelPaso("jornada", { ...base(), minutosSemana: 40 * 60 })).toBeNull();
    });
    it("si no se entienden las horas semanales, el mensaje dice cómo escribirlas", () => {
      expect(errorDelPaso("jornada", { ...base(), minutosSemana: NaN })).toMatch(/No entiendo.*42/);
    });
    it("el inicio de la jornada nocturna debe ser una hora HH:mm", () => {
      expect(errorDelPaso("jornada", { ...base(), nocturnoDesde: "7pm" })).not.toBeNull();
      expect(errorDelPaso("jornada", { ...base(), nocturnoDesde: "20:30" })).toBeNull();
    });
  });

  describe("plantillas", () => {
    it("las de ejemplo son válidas y también puede quedar sin ninguna", () => {
      expect(errorDelPaso("plantillas", base())).toBeNull();
      expect(errorDelPaso("plantillas", { ...base(), plantillas: [] })).toBeNull();
    });
    it("una plantilla dañada no deja continuar", () => {
      const malas = [{ ...base().plantillas[0], nombre: "  " }];
      expect(errorDelPaso("plantillas", { ...base(), plantillas: malas })).not.toBeNull();
    });
  });
});

describe("datos que se crean al terminar", () => {
  const r: Respuestas = {
    avisoAceptado: true,
    saldoFecha: "2026-10-01",
    saldoMinutos: 5 * 60,
    minutosSemana: 40 * 60,
    nocturnoDesde: "20:00",
    plantillas: respuestasPorDefecto("2026-10-16").plantillas.slice(0, 2),
  };
  const ahora = "2026-10-16T08:00:00";

  it("la configuración toma lo elegido y deja el resto por defecto", () => {
    const { config } = crearDatosIniciales(r, ahora, () => "id-1");
    expect(config).toEqual({ ...CONFIG_POR_DEFECTO, minutosSemana: 40 * 60, nocturnoDesde: "20:00", plantillas: r.plantillas });
  });
  it("el saldo inicial es un movimiento manual con su fecha y las horas que debe", () => {
    const { movimientos } = crearDatosIniciales(r, ahora, () => "id-1");
    expect(movimientos).toEqual([
      { id: "id-1", fecha: "2026-10-01", tipo: "saldo_inicial", minutos: 300, automatico: false, creadoEn: ahora, modificadoEn: ahora },
    ]);
  });
  it("con saldo 0 no se crea ningún movimiento", () => {
    expect(crearDatosIniciales({ ...r, saldoMinutos: 0 }, ahora, () => "id-1").movimientos).toEqual([]);
  });
  it("un paso inválido impide crear los datos", () => {
    expect(() => crearDatosIniciales({ ...r, minutosSemana: 0 }, ahora, () => "id")).toThrow();
  });
  it("el perfil guarda correo, fechas y la versión del aviso aceptado, y nada más", () => {
    expect(crearPerfil("ana@correo.com", 1, ahora)).toEqual({
      correo: "ana@correo.com",
      creadoEn: ahora,
      avisoVersion: 1,
      avisoAceptadoEn: ahora,
      schemaVersion: 2,
    });
  });
});
