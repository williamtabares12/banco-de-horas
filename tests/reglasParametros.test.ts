// CC14: la regla de seguridad de configuracion/parametros, contra el emulador:
//   npm run test:nube
// Con `npm test` se salta (no hay emulador).
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const emulador = process.env.FIRESTORE_EMULATOR_HOST;

const PARAMETROS = "configuracion/parametros";

describe.skipIf(!emulador)("CC14: reglas de configuracion/parametros", () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = emulador!.split(":");
    entorno = await initializeTestEnvironment({
      projectId: "demo-banco-horas-parametros",
      firestore: { rules: readFileSync(join(RAIZ, "firestore.rules"), "utf8"), host, port: Number(puerto) },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });
  beforeEach(async () => {
    await entorno.clearFirestore();
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), PARAMETROS), { version: 1 });
      await setDoc(doc(ctx.firestore(), "configuracion/otro"), { secreto: true });
    });
  });

  const conSesion = (uid = "ana") => entorno.authenticatedContext(uid).firestore();
  const sinSesion = () => entorno.unauthenticatedContext().firestore();

  describe("leer", () => {
    it("cualquier persona con sesión puede leerlo", async () => {
      await assertSucceeds(getDoc(doc(conSesion("ana"), PARAMETROS)));
      await assertSucceeds(getDoc(doc(conSesion("beto"), PARAMETROS)));
    });
    it("sin sesión no se puede leer", () => assertFails(getDoc(doc(sinSesion(), PARAMETROS))));
  });

  describe("escribir: nadie lo escribe desde la app", () => {
    it("ni con sesión: crear, editar o borrar", async () => {
      await assertFails(setDoc(doc(conSesion(), PARAMETROS), { version: 99 }));
      await assertFails(updateDoc(doc(conSesion(), PARAMETROS), { version: 99 }));
      await assertFails(deleteDoc(doc(conSesion(), PARAMETROS)));
    });
    it("ni sin sesión", async () => {
      await assertFails(setDoc(doc(sinSesion(), PARAMETROS), { version: 99 }));
      await assertFails(updateDoc(doc(sinSesion(), PARAMETROS), { version: 99 }));
    });
  });

  describe("no abre nada más de la colección", () => {
    it("otro documento de configuracion sigue denegado, aun con sesión", async () => {
      await assertFails(getDoc(doc(conSesion(), "configuracion/otro")));
      await assertFails(setDoc(doc(conSesion(), "configuracion/nuevo"), { x: 1 }));
    });
    it("no se puede listar la colección", () => assertFails(getDocs(collection(conSesion(), "configuracion"))));
  });
});
