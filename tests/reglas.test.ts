// Reglas de seguridad de Firestore (CC1 y CC2). Corren contra el emulador:
//   npm run test:nube
// Con `npm test` se saltan, porque ahí no hay emulador (ni hace falta Java).
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const emulador = process.env.FIRESTORE_EMULATOR_HOST;

/** Las mismas rutas de plan-nube.md sección 2. */
const RUTAS = {
  perfil: (uid: string) => `usuarios/${uid}`,
  config: (uid: string) => `usuarios/${uid}/config/principal`,
  turno: (uid: string) => `usuarios/${uid}/turnos/t1`,
  movimiento: (uid: string) => `usuarios/${uid}/movimientos/m1`,
};
const DOCUMENTOS = ["perfil", "config", "turno", "movimiento"] as const;
const DATO = { minutos: 60, nota: "x" };

describe.skipIf(!emulador)("reglas de Firestore", () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = emulador!.split(":");
    entorno = await initializeTestEnvironment({
      projectId: "demo-banco-horas-reglas",
      firestore: { rules: readFileSync(join(RAIZ, "firestore.rules"), "utf8"), host, port: Number(puerto) },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });
  beforeEach(async () => {
    await entorno.clearFirestore();
    // Datos de Ana y de Beto, puestos sin reglas
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const uid of ["ana", "beto"]) for (const d of DOCUMENTOS) await setDoc(doc(db, RUTAS[d](uid)), DATO);
    });
  });

  const comoAna = () => entorno.authenticatedContext("ana").firestore();
  const visitante = () => entorno.unauthenticatedContext().firestore();

  describe("CC1: sin sesión no se lee ni se escribe nada", () => {
    for (const d of DOCUMENTOS) {
      it(`${d}: leer`, () => assertFails(getDoc(doc(visitante(), RUTAS[d]("ana")))));
      it(`${d}: crear`, () => assertFails(setDoc(doc(visitante(), RUTAS[d]("nueva")), DATO)));
      it(`${d}: editar`, () => assertFails(updateDoc(doc(visitante(), RUTAS[d]("ana")), { minutos: 1 })));
      it(`${d}: borrar`, () => assertFails(deleteDoc(doc(visitante(), RUTAS[d]("ana")))));
    }
    it("listar turnos y movimientos", async () => {
      await assertFails(getDocs(collection(visitante(), "usuarios/ana/turnos")));
      await assertFails(getDocs(collection(visitante(), "usuarios/ana/movimientos")));
    });
    it("listar los usuarios", () => assertFails(getDocs(collection(visitante(), "usuarios"))));
  });

  describe("una persona sí maneja lo suyo", () => {
    for (const d of DOCUMENTOS) {
      it(`${d}: leer, crear, editar y borrar`, async () => {
        const db = comoAna();
        await assertSucceeds(getDoc(doc(db, RUTAS[d]("ana"))));
        await assertSucceeds(setDoc(doc(db, RUTAS[d]("ana")), { minutos: 90 }));
        await assertSucceeds(updateDoc(doc(db, RUTAS[d]("ana")), { minutos: 120 }));
        await assertSucceeds(deleteDoc(doc(db, RUTAS[d]("ana"))));
      });
    }
    it("crea documentos nuevos en sus subcolecciones y las lista", async () => {
      const db = comoAna();
      await assertSucceeds(setDoc(doc(db, "usuarios/ana/turnos/nuevo"), DATO));
      await assertSucceeds(getDocs(collection(db, "usuarios/ana/turnos")));
      await assertSucceeds(getDocs(collection(db, "usuarios/ana/movimientos")));
    });
  });

  describe("CC2: Ana no toca lo de Beto, y al revés", () => {
    for (const d of DOCUMENTOS) {
      it(`${d}: Ana no lee`, () => assertFails(getDoc(doc(comoAna(), RUTAS[d]("beto")))));
      it(`${d}: Ana no crea`, () => assertFails(setDoc(doc(comoAna(), RUTAS[d]("beto")), DATO)));
      it(`${d}: Ana no edita`, () => assertFails(updateDoc(doc(comoAna(), RUTAS[d]("beto")), { minutos: 1 })));
      it(`${d}: Ana no borra`, () => assertFails(deleteDoc(doc(comoAna(), RUTAS[d]("beto")))));
    }
    it("Ana no lista los turnos ni los movimientos de Beto", async () => {
      await assertFails(getDocs(collection(comoAna(), "usuarios/beto/turnos")));
      await assertFails(getDocs(collection(comoAna(), "usuarios/beto/movimientos")));
    });
    it("Ana no lista a los usuarios", () => assertFails(getDocs(collection(comoAna(), "usuarios"))));
    it("Beto tampoco lee lo de Ana", () => assertFails(getDoc(doc(entorno.authenticatedContext("beto").firestore(), RUTAS.perfil("ana")))));
  });

  describe("cualquier otra ruta queda denegada, aun con sesión", () => {
    it("una colección fuera de usuarios", async () => {
      await assertFails(setDoc(doc(comoAna(), "otra/cosa"), DATO));
      await assertFails(getDoc(doc(comoAna(), "otra/cosa")));
    });
    it("una ruta que se parece a la de Ana", () => assertFails(setDoc(doc(comoAna(), "publico/ana/usuarios/ana"), DATO)));
  });
});
