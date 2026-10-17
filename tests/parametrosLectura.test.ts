import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAVE_COPIA_PARAMETROS, cargarParametros, lectorDeParametros } from "../src/almacenamiento/parametros";
import { PARAMETROS_INCLUIDOS, validarParametros } from "../src/dominio/parametros";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const inicial = (): Record<string, any> =>
  JSON.parse(/```json\n([\s\S]*?)\n```/.exec(readFileSync(join(RAIZ, "parametros-iniciales.md"), "utf8").replace(/\r\n/g, "\n"))![1]);

function almacenFalso(inicialmente: Record<string, string> = {}) {
  const mapa = new Map<string, string>(Object.entries(inicialmente));
  return {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => void mapa.set(k, v),
    mapa,
  };
}

const conVersion = (version: number) => ({ ...inicial(), version });

describe("cargarParametros: leer, validar y, si no se puede, un respaldo claro (CC15)", () => {
  describe("el documento está bien", () => {
    it("se usa y no hay aviso", async () => {
      const r = await cargarParametros(async () => conVersion(3), almacenFalso());
      expect(r.origen).toBe("nube");
      expect(r.aviso).toBeNull();
      expect(r.parametros.version).toBe(3);
    });
    it("se guarda una copia en el dispositivo para la próxima vez que falle", async () => {
      const almacen = almacenFalso();
      await cargarParametros(async () => conVersion(3), almacen);
      expect(validarParametros(JSON.parse(almacen.mapa.get(CLAVE_COPIA_PARAMETROS)!)).version).toBe(3);
    });
    it("si no hay dónde guardar la copia, igual funciona", async () => {
      const sinEspacio = { getItem: () => null, setItem: () => { throw new Error("lleno"); } };
      const r = await cargarParametros(async () => conVersion(3), sinEspacio);
      expect(r.origen).toBe("nube");
    });
  });

  describe("el documento no existe", () => {
    it("con una copia guardada, usa la última copia y avisa", async () => {
      const almacen = almacenFalso({ [CLAVE_COPIA_PARAMETROS]: JSON.stringify(conVersion(7)) });
      const r = await cargarParametros(async () => undefined, almacen);
      expect(r.origen).toBe("copia");
      expect(r.parametros.version).toBe(7);
      expect(r.aviso).toMatch(/no se encontr/i);
      expect(r.aviso).toMatch(/últimos parámetros guardados/i);
    });
    it("sin copia, usa las reglas incluidas en la app y avisa", async () => {
      const r = await cargarParametros(async () => undefined, almacenFalso());
      expect(r.origen).toBe("incluidas");
      expect(r.parametros).toEqual(PARAMETROS_INCLUIDOS);
      expect(r.aviso).toMatch(/no se encontr/i);
      expect(r.aviso).toMatch(/reglas incluidas/i);
    });
  });

  describe("el documento está mal formado", () => {
    const malo = () => {
      const d = inicial();
      d.reglas["2026-01-01"].minutosSemana = "2520"; // un número guardado como texto, el error típico en la consola
      return d;
    };
    it("avisa qué campo está mal y usa la última copia", async () => {
      const almacen = almacenFalso({ [CLAVE_COPIA_PARAMETROS]: JSON.stringify(conVersion(7)) });
      const r = await cargarParametros(async () => malo(), almacen);
      expect(r.origen).toBe("copia");
      expect(r.parametros.version).toBe(7);
      expect(r.aviso).toMatch(/minutosSemana/);
    });
    it("sin copia, usa las reglas incluidas", async () => {
      const r = await cargarParametros(async () => malo(), almacenFalso());
      expect(r.origen).toBe("incluidas");
      expect(r.aviso).toMatch(/minutosSemana/);
    });
    it("un documento malo NO pisa la copia buena", async () => {
      const almacen = almacenFalso({ [CLAVE_COPIA_PARAMETROS]: JSON.stringify(conVersion(7)) });
      await cargarParametros(async () => malo(), almacen);
      expect(JSON.parse(almacen.mapa.get(CLAVE_COPIA_PARAMETROS)!).version).toBe(7);
    });
    it("nunca devuelve valores a medias: lo que se devuelve siempre es válido", async () => {
      const r = await cargarParametros(async () => malo(), almacenFalso());
      expect(() => validarParametros(r.parametros)).not.toThrow();
    });
  });

  describe("no se puede leer (sin conexión, sin permiso...)", () => {
    it("avisa y usa el respaldo", async () => {
      const almacen = almacenFalso({ [CLAVE_COPIA_PARAMETROS]: JSON.stringify(conVersion(7)) });
      const r = await cargarParametros(async () => { throw new Error("offline"); }, almacen);
      expect(r.origen).toBe("copia");
      expect(r.aviso).toMatch(/no se pudieron leer/i);
    });
  });

  describe("la copia guardada también puede estar dañada", () => {
    it("una copia que no es JSON se ignora y se usan las reglas incluidas", async () => {
      const r = await cargarParametros(async () => undefined, almacenFalso({ [CLAVE_COPIA_PARAMETROS]: "no es json" }));
      expect(r.origen).toBe("incluidas");
    });
    it("una copia mal formada se ignora", async () => {
      const copia = inicial();
      copia.reglas = {};
      const r = await cargarParametros(async () => undefined, almacenFalso({ [CLAVE_COPIA_PARAMETROS]: JSON.stringify(copia) }));
      expect(r.origen).toBe("incluidas");
    });
  });
});

describe("lectorDeParametros: una sola lectura por sesión", () => {
  it("lee una vez y después responde desde la copia en memoria", async () => {
    let lecturas = 0;
    const lector = lectorDeParametros(async () => { lecturas++; return conVersion(lecturas); }, almacenFalso());
    const a = await lector();
    const b = await lector();
    expect(lecturas).toBe(1);
    expect(b).toBe(a);
    expect(a.parametros.version).toBe(1);
  });
  it("dos llamadas a la vez comparten la misma lectura", async () => {
    let lecturas = 0;
    const lector = lectorDeParametros(async () => { lecturas++; return inicial(); }, almacenFalso());
    await Promise.all([lector(), lector(), lector()]);
    expect(lecturas).toBe(1);
  });
});
