// RepositorioFirestore contra el emulador, con las reglas reales de firestore.rules:
//   npm run test:nube
// Con `npm test` se saltan (no hay emulador).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { disableNetwork, doc, enableNetwork, getDoc, setDoc } from "firebase/firestore";
import { RepositorioFirestore } from "../src/almacenamiento/firestore";
import type { Datos } from "../src/almacenamiento/repositorio";
import { leerDatos } from "../src/almacenamiento/respaldo";
import { crearDatosIniciales, crearPerfil, respuestasPorDefecto } from "../src/dominio/bienvenida";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import type { MovimientoBanco } from "../src/dominio/tipos";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const emulador = process.env.FIRESTORE_EMULATOR_HOST;

const MUESTRA: Datos = leerDatos(readFileSync(join(RAIZ, "tests/fixtures/formato-2-respaldo.json"), "utf8")).datos;
const copia = (): Datos => structuredClone(MUESTRA);
/** Lo que se lee de Firestore sale ordenado por id; así se compara sin depender del orden del archivo. */
const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
const ordenado = (d: Datos): Datos => ({ ...d, turnos: porId(d.turnos), movimientos: porId(d.movimientos) });

describe.skipIf(!emulador)("RepositorioFirestore", () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = emulador!.split(":");
    entorno = await initializeTestEnvironment({
      projectId: "demo-banco-horas-repo",
      firestore: { rules: readFileSync(join(RAIZ, "firestore.rules"), "utf8"), host, port: Number(puerto) },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });
  beforeEach(async () => {
    await entorno.clearFirestore();
  });

  /** Un "dispositivo" de una persona: su propia conexión a Firestore. */
  const dispositivo = (uid = "ana") => entorno.authenticatedContext(uid).firestore();
  async function abrir(uid = "ana") {
    const repo = new RepositorioFirestore(dispositivo(uid), uid);
    await repo.iniciar();
    return repo;
  }
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
  /** Espera hasta que la condición se cumpla (los cambios en vivo llegan de forma asíncrona). */
  async function hasta(condicion: () => boolean, ms = 5000) {
    const limite = Date.now() + ms;
    while (!condicion()) {
      if (Date.now() > limite) throw new Error("Se agotó la espera");
      await esperar(25);
    }
  }

  it("sin datos guardados devuelve datos vacíos con la configuración por defecto", async () => {
    const repo = await abrir();
    const d = repo.cargar();
    expect(d.turnos).toEqual([]);
    expect(d.movimientos).toEqual([]);
    expect(d.config).toEqual(CONFIG_POR_DEFECTO);
    repo.detener();
  });

  it("guardar y leer desde otro dispositivo de la misma persona devuelve lo mismo", async () => {
    const a = await abrir();
    a.guardar(copia());
    await a.esperarEscrituras();
    const b = await abrir();
    expect(b.cargar()).toEqual(ordenado(MUESTRA));
    a.detener();
    b.detener();
  });

  it("editar cambia solo ese documento", async () => {
    const a = await abrir();
    a.guardar(copia());
    await a.esperarEscrituras();
    const editado = copia();
    const primero = porId(editado.turnos)[0];
    editado.turnos = editado.turnos.map((t) => (t.id === primero.id ? { ...t, nota: "Cambié la nota", modificadoEn: "2026-09-15T08:00:00" } : t));
    a.guardar(editado);
    await a.esperarEscrituras();
    const b = await abrir();
    expect(b.cargar().turnos[0].nota).toBe("Cambié la nota");
    expect(b.cargar().turnos.slice(1)).toEqual(porId(MUESTRA.turnos).slice(1));
    expect(b.cargar().movimientos).toEqual(porId(MUESTRA.movimientos));
    a.detener();
    b.detener();
  });

  it("borrar quita el documento", async () => {
    const a = await abrir();
    a.guardar(copia());
    await a.esperarEscrituras();
    const menos = copia();
    const quitado = menos.turnos.pop()!;
    menos.movimientos = menos.movimientos.filter((m) => m.turnoId !== quitado.id);
    a.guardar(menos);
    await a.esperarEscrituras();
    const b = await abrir();
    expect(b.cargar().turnos.map((t) => t.id)).not.toContain(quitado.id);
    expect(b.cargar().turnos).toHaveLength(MUESTRA.turnos.length - 1);
    a.detener();
    b.detener();
  });

  it("el turno y su movimiento se escriben juntos: si uno no se puede escribir, no queda ninguno", async () => {
    const a = await abrir();
    const datos = copia();
    const malo: MovimientoBanco = { ...datos.movimientos[0], id: "no/vale", turnoId: datos.turnos[0].id };
    expect(() => a.guardar({ ...datos, movimientos: [malo] })).toThrow();
    await a.esperarEscrituras();
    const b = await abrir();
    expect(b.cargar().turnos).toEqual([]);
    expect(b.cargar().movimientos).toEqual([]);
    a.detener();
    b.detener();
  });

  it("guarda más de 500 documentos de una vez (en lotes)", async () => {
    const a = await abrir();
    const datos = copia();
    const base = datos.movimientos[0];
    datos.movimientos = Array.from({ length: 620 }, (_, i) => ({ ...base, id: `mov-${i}`, turnoId: undefined }));
    a.guardar(datos);
    await a.esperarEscrituras();
    const b = await abrir();
    expect(b.cargar().movimientos).toHaveLength(620);
    a.detener();
    b.detener();
  });

  it("lectura en tiempo real: lo que guarda un dispositivo le llega al otro", async () => {
    const a = await abrir();
    const b = await abrir();
    let ultimo: Datos | null = null;
    const dejar = b.suscribir((d) => (ultimo = d));
    a.guardar(copia());
    await hasta(() => ultimo !== null && (ultimo as Datos).turnos.length === MUESTRA.turnos.length);
    expect((ultimo as unknown as Datos).movimientos).toEqual(porId(MUESTRA.movimientos));
    dejar();
    a.detener();
    b.detener();
  });

  it("sin conexión: guardar funciona y se ve al instante; al volver la señal se sincroniza (CC4)", async () => {
    const db = dispositivo();
    const a = new RepositorioFirestore(db, "ana");
    await a.iniciar();
    const estados: boolean[] = [];
    a.suscribir((_d, e) => estados.push(e.pendiente));

    await disableNetwork(db);
    a.guardar(copia());
    expect(a.cargar().turnos).toHaveLength(MUESTRA.turnos.length); // se ve en el dispositivo
    await hasta(() => estados.includes(true)); // "solo en el dispositivo"

    const otro = await abrir();
    expect(otro.cargar().turnos).toEqual([]); // el servidor todavía no sabe nada

    await enableNetwork(db);
    await a.esperarEscrituras();
    await hasta(() => estados[estados.length - 1] === false); // "ya sincronizado"
    const despues = await abrir();
    expect(despues.cargar()).toEqual(ordenado(MUESTRA));
    a.detener();
    otro.detener();
    despues.detener();
  });

  it("la fecha del último respaldo se guarda sin pisar lo demás del perfil", async () => {
    const db = dispositivo();
    await setDoc(doc(db, "usuarios/ana"), { avisoVersion: 1, avisoAceptadoEn: "2026-10-01T08:00:00" });
    const a = new RepositorioFirestore(db, "ana");
    await a.iniciar();
    a.guardar({ ...copia(), ultimoRespaldo: "2026-10-10" });
    await a.esperarEscrituras();
    const perfil = (await getDoc(doc(db, "usuarios/ana"))).data();
    expect(perfil).toMatchObject({ avisoVersion: 1, avisoAceptadoEn: "2026-10-01T08:00:00", ultimoRespaldo: "2026-10-10" });
    const b = await abrir();
    expect(b.cargar().ultimoRespaldo).toBe("2026-10-10");
    a.detener();
    b.detener();
  });

  it("cada persona ve solo lo suyo; con el uid de otra persona no se puede ni abrir", async () => {
    const ana = await abrir("ana");
    ana.guardar(copia());
    await ana.esperarEscrituras();
    const beto = await abrir("beto");
    expect(beto.cargar().turnos).toEqual([]);
    const intruso = new RepositorioFirestore(dispositivo("beto"), "ana");
    await expect(intruso.iniciar()).rejects.toThrow();
    ana.detener();
    beto.detener();
  });

  describe("primer ingreso (plan-nube.md §5)", () => {
    const AHORA = "2026-10-16T08:00:00";
    const inicial = () => crearDatosIniciales({ ...respuestasPorDefecto("2026-10-01"), avisoAceptado: true, saldoMinutos: 180 }, AHORA, () => "saldo-1");
    const perfil = () => crearPerfil("ana@correo.com", 1, AHORA);

    it("una persona nueva no tiene perfil", async () => {
      const a = await abrir();
      expect(a.perfilGuardado()).toBeNull();
      a.detener();
    });

    it("crear la cuenta escribe perfil, configuración y saldo inicial, y ya se puede entrar", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), inicial());
      // al volver la promesa, la app ya ve todo junto: no hay un instante con perfil pero sin configuración ni saldo
      expect(a.perfilGuardado()).toEqual(perfil());
      expect(a.cargar().config).toEqual(inicial().config);
      expect(a.cargar().movimientos).toEqual(inicial().movimientos);
      const b = await abrir(); // otro dispositivo
      expect(b.perfilGuardado()).toEqual(perfil());
      expect(b.cargar().config).toEqual(inicial().config);
      expect(b.cargar().movimientos).toEqual(inicial().movimientos);
      a.detener();
      b.detener();
    });

    it("todo o nada: si el saldo inicial no se puede escribir, no queda ni el perfil", async () => {
      const a = await abrir();
      const malo = inicial();
      malo.movimientos = [{ ...malo.movimientos[0], id: "no/vale" }];
      await expect(a.crearCuenta(perfil(), malo)).rejects.toThrow();
      const b = await abrir();
      expect(b.perfilGuardado()).toBeNull();
      expect(b.cargar().movimientos).toEqual([]);
      a.detener();
      b.detener();
    });

    it("se puede detener y volver a iniciar (React monta los efectos dos veces en desarrollo)", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), inicial());
      a.detener();
      await a.iniciar();
      expect(a.perfilGuardado()).toEqual(perfil());
      // y vuelve a escuchar: lo que guarda otro dispositivo le llega
      const b = await abrir();
      b.guardar({ ...b.cargar(), movimientos: [...b.cargar().movimientos, { ...inicial().movimientos[0], id: "otro", minutos: 60 }] });
      await hasta(() => a.cargar().movimientos.length === 2);
      a.detener();
      b.detener();
    });

    it("aceptar una versión nueva del aviso cambia solo el perfil: no toca configuración, turnos ni saldo", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), inicial());
      a.guardar(copia());
      await a.esperarEscrituras();
      const antes = a.cargar();
      await a.aceptarAviso(2, "2026-11-01T09:00:00");
      expect(a.perfilGuardado()).toEqual({ ...perfil(), avisoVersion: 2, avisoAceptadoEn: "2026-11-01T09:00:00" });
      const b = await abrir();
      expect(b.cargar()).toEqual(antes);
      expect(b.perfilGuardado()?.creadoEn).toBe(AHORA);
      a.detener();
      b.detener();
    });

    it("guardar después no pisa el perfil", async () => {
      const a = await abrir();
      await a.crearCuenta(perfil(), inicial());
      await hasta(() => a.perfilGuardado() !== null);
      a.guardar({ ...a.cargar(), ultimoRespaldo: "2026-10-16" });
      await a.esperarEscrituras();
      const b = await abrir();
      expect(b.perfilGuardado()).toEqual(perfil());
      a.detener();
      b.detener();
    });
  });

  it("un documento dañado en la nube da error, no datos inventados", async () => {
    const db = dispositivo();
    await setDoc(doc(db, "usuarios/ana/turnos/malo"), { id: "malo", inicio: "no es una fecha" });
    const a = new RepositorioFirestore(db, "ana");
    await expect(a.iniciar()).rejects.toThrow();
  });
});
