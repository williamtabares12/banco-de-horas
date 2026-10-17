// Importar un respaldo JSON a la cuenta (T27, CC5), contra el emulador y con las reglas reales:
//   npm run test:nube
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { RepositorioFirestore } from "../src/almacenamiento/firestore";
import type { Datos } from "../src/almacenamiento/repositorio";
import { ErrorImportacion, importar, importarJSON } from "../src/almacenamiento/respaldo";
import { saldo } from "../src/dominio/banco";
import { crearPerfil } from "../src/dominio/bienvenida";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const emulador = process.env.FIRESTORE_EMULATOR_HOST;
const fixture = (nombre: string) => readFileSync(join(RAIZ, "tests/fixtures", nombre), "utf8");

const RESPALDO_2 = fixture("formato-2-respaldo.json");
const RESPALDO_1 = fixture("formato-1-respaldo.json");
const AHORA = "2026-10-16T08:00:00";
const perfil = () => crearPerfil("ana@correo.com", 1, AHORA);

const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
const ordenado = (d: Datos): Datos => ({ ...d, turnos: porId(d.turnos), movimientos: porId(d.movimientos) });

describe.skipIf(!emulador)("importar un respaldo a la cuenta", () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = emulador!.split(":");
    entorno = await initializeTestEnvironment({
      projectId: "demo-banco-horas-importar",
      firestore: { rules: readFileSync(join(RAIZ, "firestore.rules"), "utf8"), host, port: Number(puerto) },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });
  beforeEach(async () => {
    await entorno.clearFirestore();
  });

  async function abrir(uid = "ana") {
    const repo = new RepositorioFirestore(entorno.authenticatedContext(uid).firestore(), uid);
    await repo.iniciar();
    return repo;
  }

  describe("CC5: el mismo saldo que tenía (primer ingreso)", () => {
    it("un respaldo del formato actual deja los mismos datos y el mismo saldo", async () => {
      const original = importarJSON(RESPALDO_2);
      const a = await abrir();
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_2));
      const b = await abrir(); // otro dispositivo, leyendo desde el servidor
      expect(ordenado(b.cargar())).toEqual(ordenado(original));
      expect(saldo(b.cargar().movimientos)).toBe(saldo(original.movimientos));
      expect(b.perfilGuardado()).toEqual(perfil());
      a.detener();
      b.detener();
    });

    it("un respaldo del formato 1 (sin descansos) se migra y conserva el saldo", async () => {
      const crudo = JSON.parse(RESPALDO_1) as { movimientos: { minutos: number }[] };
      const saldoOriginal = crudo.movimientos.reduce((suma, m) => suma + m.minutos, 0);
      const a = await abrir();
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_1));
      const b = await abrir();
      expect(saldo(b.cargar().movimientos)).toBe(saldoOriginal);
      expect(b.cargar().turnos.length).toBeGreaterThan(0);
      expect(b.cargar().config.plantillas.length).toBeGreaterThan(0); // la migración agregó las plantillas
      a.detener();
      b.detener();
    });

    it("conserva la fecha del último respaldo y deja intacto el resto del perfil", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), { ...importarJSON(RESPALDO_2), ultimoRespaldo: "2026-10-10" });
      const b = await abrir();
      expect(b.cargar().ultimoRespaldo).toBe("2026-10-10");
      expect(b.perfilGuardado()).toEqual(perfil());
      a.detener();
      b.detener();
    });

    it("repetir la importación (por ejemplo, si se cortó) no duplica nada", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_2));
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_2));
      const b = await abrir();
      expect(ordenado(b.cargar())).toEqual(ordenado(importarJSON(RESPALDO_2)));
      a.detener();
      b.detener();
    });
  });

  describe("un archivo inválido no escribe nada", () => {
    const invalidos: [string, string][] = [
      ["no es un JSON", "esto no es json"],
      ["es un JSON de otra cosa", JSON.stringify({ hola: "mundo" })],
      ["tiene un turno con fecha dañada", RESPALDO_2.replace(/"inicio": "2026-09-14T07:00"/, '"inicio": "ayer"')],
      ["es de una versión más nueva de la app", RESPALDO_2.replace('"schemaVersion": 2', '"schemaVersion": 99')],
    ];
    for (const [nombre, texto] of invalidos) {
      it(`${nombre}`, async () => {
        const a = await abrir();
        expect(() => importarJSON(texto)).toThrow(ErrorImportacion);
        expect(() => importar(a, texto)).toThrow(ErrorImportacion);
        await a.esperarEscrituras();
        const b = await abrir();
        expect(b.perfilGuardado()).toBeNull();
        expect(b.cargar().turnos).toEqual([]);
        expect(b.cargar().movimientos).toEqual([]);
        a.detener();
        b.detener();
      });
    }

    it("sobre una cuenta que ya tiene datos, un archivo inválido no cambia nada", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_2));
      const antes = ordenado(a.cargar());
      expect(() => importar(a, "esto no es json")).toThrow(ErrorImportacion);
      await a.esperarEscrituras();
      const b = await abrir();
      expect(ordenado(b.cargar())).toEqual(antes);
      a.detener();
      b.detener();
    });
  });

  describe("importar desde Ajustes a una cuenta que ya existe", () => {
    it("reemplaza los datos actuales por los del archivo, con el mismo saldo", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_1));
      importar(a, RESPALDO_2);
      await a.esperarEscrituras();
      const b = await abrir();
      expect(ordenado(b.cargar())).toEqual(ordenado(importarJSON(RESPALDO_2)));
      expect(b.perfilGuardado()).toEqual(perfil());
      a.detener();
      b.detener();
    });
  });

  describe("archivos grandes: lotes de máximo 500 operaciones", () => {
    const grande = (): string => {
      const base = JSON.parse(RESPALDO_2) as { turnos: Record<string, unknown>[]; movimientos: Record<string, unknown>[] };
      base.turnos = Array.from({ length: 700 }, (_, i) => ({ ...base.turnos[0], id: `t-${i}` }));
      base.movimientos = Array.from({ length: 700 }, (_, i) => ({ ...base.movimientos[0], id: `m-${i}`, turnoId: undefined }));
      return JSON.stringify(base);
    };

    it("primer ingreso con 1400 documentos: llega todo y el perfil queda al final", async () => {
      const a = await abrir();
      const datos = importarJSON(grande());
      await a.crearCuenta(perfil(), datos);
      const b = await abrir();
      expect(b.cargar().turnos).toHaveLength(700);
      expect(b.cargar().movimientos).toHaveLength(700);
      expect(saldo(b.cargar().movimientos)).toBe(saldo(datos.movimientos));
      expect(b.perfilGuardado()).toEqual(perfil());
      a.detener();
      b.detener();
    });

    it("el perfil se escribe en el último lote: si se corta a medias, no queda una cuenta a medias", async () => {
      const a = await abrir();
      const datos = importarJSON(grande());
      const lotes = a.lotesDeCuenta(perfil(), datos);
      expect(lotes.length).toBeGreaterThan(1);
      expect(lotes.every((l) => l.length <= 500)).toBe(true);
      expect(lotes[lotes.length - 1].some((op) => op.ruta === "usuarios/ana")).toBe(true);
      expect(lotes.slice(0, -1).some((l) => l.some((op) => op.ruta === "usuarios/ana"))).toBe(false);
      a.detener();
    });

    it("desde Ajustes, un archivo grande también se guarda en lotes", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), importarJSON(RESPALDO_2));
      importar(a, grande());
      await a.esperarEscrituras();
      const b = await abrir();
      expect(b.cargar().turnos).toHaveLength(700);
      expect(b.cargar().movimientos).toHaveLength(700);
      a.detener();
      b.detener();
    });
  });
});
