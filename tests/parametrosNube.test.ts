// La lectura de configuracion/parametros contra el emulador y con las reglas reales (CC14 y CC15 juntos):
//   npm run test:nube
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { cargarParametros, leerDeFirestore } from "../src/almacenamiento/parametros";
import { PARAMETROS_INCLUIDOS, validarParametros } from "../src/dominio/parametros";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const emulador = process.env.FIRESTORE_EMULATOR_HOST;
const inicial = (): Record<string, any> =>
  JSON.parse(/```json\n([\s\S]*?)\n```/.exec(readFileSync(join(RAIZ, "parametros-iniciales.md"), "utf8").replace(/\r\n/g, "\n"))![1]);
const almacenFalso = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe.skipIf(!emulador)("leer los parámetros de la clínica en Firestore", () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = emulador!.split(":");
    entorno = await initializeTestEnvironment({
      projectId: "demo-banco-horas-lectura-parametros",
      firestore: { rules: readFileSync(join(RAIZ, "firestore.rules"), "utf8"), host, port: Number(puerto) },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });
  beforeEach(async () => {
    await entorno.clearFirestore();
  });

  const sembrar = (datos: unknown) =>
    entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "configuracion/parametros"), datos as Record<string, unknown>);
    });
  const conSesion = () => entorno.authenticatedContext("ana").firestore();
  const sinSesion = () => entorno.unauthenticatedContext().firestore();

  it("con sesión y el documento bien, se lee de la nube", async () => {
    await sembrar({ ...inicial(), version: 4 });
    const r = await cargarParametros(leerDeFirestore(conSesion()), almacenFalso());
    expect(r.origen).toBe("nube");
    expect(r.aviso).toBeNull();
    expect(r.parametros).toEqual(validarParametros({ ...inicial(), version: 4 }));
  });

  it("sin sesión las reglas lo niegan y la app usa lo incluido, avisando", async () => {
    await sembrar(inicial());
    const r = await cargarParametros(leerDeFirestore(sinSesion()), almacenFalso());
    expect(r.origen).toBe("incluidas");
    expect(r.aviso).toMatch(/no se pudieron leer/i);
    expect(r.parametros).toEqual(PARAMETROS_INCLUIDOS);
  });

  it("si el documento no existe, avisa y usa lo incluido", async () => {
    const r = await cargarParametros(leerDeFirestore(conSesion()), almacenFalso());
    expect(r.origen).toBe("incluidas");
    expect(r.aviso).toMatch(/no se encontr/i);
  });

  it("un número guardado como texto en la consola se rechaza con un aviso claro", async () => {
    const malo = inicial();
    malo.reglas["2026-01-01"].minutosSemana = "2520";
    await sembrar(malo);
    const r = await cargarParametros(leerDeFirestore(conSesion()), almacenFalso());
    expect(r.origen).toBe("incluidas");
    expect(r.aviso).toMatch(/minutosSemana/);
  });

  it("si antes se leyó bien, un documento dañado después usa esa última copia", async () => {
    const almacen = almacenFalso();
    await sembrar({ ...inicial(), version: 5 });
    await cargarParametros(leerDeFirestore(conSesion()), almacen);
    await sembrar({ ...inicial(), version: "6" }); // alguien edita mal el documento
    const r = await cargarParametros(leerDeFirestore(conSesion()), almacen);
    expect(r.origen).toBe("copia");
    expect(r.parametros.version).toBe(5);
    expect(r.aviso).toMatch(/version/);
  });
});
