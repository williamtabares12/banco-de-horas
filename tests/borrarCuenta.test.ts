// CC6: borrar la cuenta elimina todos los datos de la persona, de punta a punta contra los emuladores de
// Auth y Firestore (con las reglas reales):
//   npm run test:nube
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache, terminate } from "firebase/firestore";
import { borrarCuentaConClave } from "../src/almacenamiento/cuenta";
import { RepositorioFirestore } from "../src/almacenamiento/firestore";
import { importarJSON } from "../src/almacenamiento/respaldo";
import { crearPerfil } from "../src/dominio/bienvenida";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const hostAuth = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const hostFirestore = process.env.FIRESTORE_EMULATOR_HOST;
const PROYECTO = "demo-borrar-cuenta";
const CLAVE = "secreto123";
const AHORA = "2026-10-16T08:00:00";

const respaldo = () => importarJSON(readFileSync(join(RAIZ, "tests/fixtures/formato-2-respaldo.json"), "utf8"));

/** Lo que hay guardado en el servidor (se lee sin pasar por las reglas, como lo vería Alejandro en la consola). */
async function documentos(ruta: string): Promise<string[]> {
  const todos: string[] = [];
  let pagina = "";
  do {
    const url = `http://${hostFirestore}/v1/projects/${PROYECTO}/databases/(default)/documents/${ruta}?pageSize=300${pagina}`;
    const r = await fetch(url, { headers: { Authorization: "Bearer owner" } });
    const cuerpo = (await r.json()) as { documents?: { name: string }[]; nextPageToken?: string };
    todos.push(...(cuerpo.documents ?? []).map((d) => d.name.split("/documents/")[1]));
    pagina = cuerpo.nextPageToken ? `&pageToken=${encodeURIComponent(cuerpo.nextPageToken)}` : "";
  } while (pagina);
  return todos;
}
async function existe(ruta: string): Promise<boolean> {
  const url = `http://${hostFirestore}/v1/projects/${PROYECTO}/databases/(default)/documents/${ruta}`;
  return (await fetch(url, { headers: { Authorization: "Bearer owner" } })).status === 200;
}

describe.skipIf(!hostAuth || !hostFirestore)("CC6: borrar la cuenta", () => {
  let app: FirebaseApp;
  let correo = 0;

  beforeAll(() => {
    app = initializeApp({ projectId: PROYECTO, apiKey: "demo" }, "borrar-cuenta");
  });
  afterAll(async () => {
    await deleteApp(app);
  });
  beforeEach(async () => {
    // Datos limpios en Firestore antes de cada prueba
    await fetch(`http://${hostFirestore}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, { method: "DELETE" });
  });

  /** Una "persona" con su propia conexión: crea su cuenta de acceso y sus datos como lo haría la app. */
  async function persona(datos = respaldo()) {
    const nombre = `borrar-${Date.now()}-${correo++}`;
    const instancia = initializeApp({ projectId: PROYECTO, apiKey: "demo" }, nombre);
    const auth = getAuth(instancia);
    connectAuthEmulator(auth, `http://${hostAuth}`, { disableWarnings: true });
    const db = initializeFirestore(instancia, { localCache: memoryLocalCache() });
    const [host, puerto] = hostFirestore!.split(":");
    connectFirestoreEmulator(db, host, Number(puerto));
    const email = `${nombre}@correo.com`;
    const credencial = await createUserWithEmailAndPassword(auth, email, CLAVE);
    const uid = credencial.user.uid;
    const repo = new RepositorioFirestore(db, uid);
    await repo.iniciar();
    await repo.crearCuenta(crearPerfil(email, 1, AHORA), datos);
    return {
      email,
      uid,
      repo,
      nube: { auth, db },
      cerrar: async () => {
        await terminate(db);
        await deleteApp(instancia);
      },
    };
  }

  it("borra el perfil, la configuración, los turnos y los movimientos, y el usuario de acceso", async () => {
    const ana = await persona();
    expect((await documentos(`usuarios/${ana.uid}/turnos`)).length).toBeGreaterThan(0);
    expect((await documentos(`usuarios/${ana.uid}/movimientos`)).length).toBeGreaterThan(0);
    expect(await existe(`usuarios/${ana.uid}`)).toBe(true);

    await borrarCuentaConClave(ana.nube, ana.repo, CLAVE);

    expect(await documentos(`usuarios/${ana.uid}/turnos`)).toEqual([]);
    expect(await documentos(`usuarios/${ana.uid}/movimientos`)).toEqual([]);
    expect(await documentos(`usuarios/${ana.uid}/config`)).toEqual([]);
    expect(await existe(`usuarios/${ana.uid}`)).toBe(false);
    expect(ana.nube.auth.currentUser).toBeNull();

    // el usuario ya no existe: no se puede volver a entrar con esa cuenta
    await expect(signInWithEmailAndPassword(ana.nube.auth, ana.email, CLAVE)).rejects.toMatchObject({ code: expect.stringMatching(/invalid-credential|user-not-found/) });
    await ana.cerrar();
  });

  it("con la contraseña equivocada no se borra NADA", async () => {
    const ana = await persona();
    const turnosAntes = (await documentos(`usuarios/${ana.uid}/turnos`)).length;
    await expect(borrarCuentaConClave(ana.nube, ana.repo, "otra-clave")).rejects.toMatchObject({ code: expect.stringMatching(/wrong-password|invalid-credential/) });
    expect((await documentos(`usuarios/${ana.uid}/turnos`)).length).toBe(turnosAntes);
    expect(await existe(`usuarios/${ana.uid}`)).toBe(true);
    // y la cuenta sigue funcionando
    await signOut(ana.nube.auth);
    await expect(signInWithEmailAndPassword(ana.nube.auth, ana.email, CLAVE)).resolves.toBeTruthy();
    await ana.cerrar();
  });

  it("no toca los datos de otra persona", async () => {
    const ana = await persona();
    const beto = await persona();
    await borrarCuentaConClave(ana.nube, ana.repo, CLAVE);
    expect((await documentos(`usuarios/${beto.uid}/turnos`)).length).toBeGreaterThan(0);
    expect(await existe(`usuarios/${beto.uid}`)).toBe(true);
    await expect(signInWithEmailAndPassword(beto.nube.auth, beto.email, CLAVE)).resolves.toBeTruthy();
    await ana.cerrar();
    await beto.cerrar();
  });

  it("borra también cuando hay más de 500 documentos (en lotes)", async () => {
    const datos = respaldo();
    const base = datos.movimientos[0];
    datos.movimientos = Array.from({ length: 1100 }, (_, i) => ({ ...base, id: `mov-${i}`, turnoId: undefined }));
    const ana = await persona(datos);
    expect((await documentos(`usuarios/${ana.uid}/movimientos`)).length).toBe(1100);
    await borrarCuentaConClave(ana.nube, ana.repo, CLAVE);
    expect(await documentos(`usuarios/${ana.uid}/movimientos`)).toEqual([]);
    await ana.cerrar();
  });

  it("borrar los datos se puede repetir: si se había cortado a medias, termina el trabajo", async () => {
    const ana = await persona();
    // se simula un corte: el borrado se detuvo después de quitar solo los turnos
    const turnos = await documentos(`usuarios/${ana.uid}/turnos`);
    for (const ruta of turnos) {
      await fetch(`http://${hostFirestore}/v1/projects/${PROYECTO}/databases/(default)/documents/${ruta}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
    }
    await ana.repo.borrarTodo();
    await ana.repo.borrarTodo(); // una vez más: no falla ni deja nada
    expect(await documentos(`usuarios/${ana.uid}/movimientos`)).toEqual([]);
    expect(await existe(`usuarios/${ana.uid}`)).toBe(false);
    await ana.cerrar();
  });

  it("el perfil se borra al final: si algo falla antes, la cuenta sigue 'existiendo' y se puede reintentar", async () => {
    const ana = await persona();
    // sin conexión al servidor no se puede leer qué borrar: falla y el perfil queda
    await terminate(ana.nube.db);
    await expect(ana.repo.borrarTodo()).rejects.toBeTruthy();
    expect(await existe(`usuarios/${ana.uid}`)).toBe(true);
    await ana.cerrar().catch(() => {});
  });
});
