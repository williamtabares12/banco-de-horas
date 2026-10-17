import { type FirebaseApp } from "firebase/app";
import {
  collection,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  waitForPendingWrites,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { CONFIG_POR_DEFECTO } from "../dominio/config";
import type { PerfilNube } from "../dominio/bienvenida";
import type { Config, MovimientoBanco, Turno } from "../dominio/tipos";
import { VERSION_ESQUEMA } from "./migracion";
import type { Datos, Repositorio } from "./repositorio";
import { leerDatos } from "./respaldo";

/** Firestore guarda un lote de 500 operaciones como máximo. */
const MAX_LOTE = 500;

export type EstadoSincronizacion = {
  /** true: hay cambios guardados solo en este dispositivo, todavía sin confirmar por el servidor. */
  pendiente: boolean;
};

/**
 * Firestore con caché local persistente (IndexedDB, compartida entre pestañas): la app abre y guarda
 * sin señal, y sincroniza cuando vuelve. Solo funciona en un navegador.
 */
export function crearFirestore(app: FirebaseApp): Firestore {
  return initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

/** Copia sin los `undefined` (Firestore no los acepta) y con las llaves en orden fijo, para comparar. */
function canonico(valor: unknown): string {
  const ordenar = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(ordenar)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .filter(([, x]) => x !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, ordenar(x)]),
          )
        : v;
  return JSON.stringify(ordenar(valor));
}

/** Lo que se escribe al crear una cuenta: lo de la bienvenida, o un respaldo completo. */
export type DatosIniciales = {
  config: Config;
  turnos?: Turno[];
  movimientos: MovimientoBanco[];
  ultimoRespaldo?: string;
};

const sinUndefined = (valor: object): DocumentData => JSON.parse(JSON.stringify(valor));

export type Operacion = { tipo: "set"; ruta: string; datos: DocumentData; unir?: boolean } | { tipo: "delete"; ruta: string };

/**
 * Los datos de una persona en Firestore (plan-nube.md §2):
 *   usuarios/{uid}                    perfil (aquí solo se toca `ultimoRespaldo`)
 *   usuarios/{uid}/config/principal   Config
 *   usuarios/{uid}/turnos/{id}        Turno
 *   usuarios/{uid}/movimientos/{id}   MovimientoBanco
 *
 * Cumple `Repositorio` para que lo demás de la app siga igual: `cargar()` devuelve lo último que se
 * leyó (de la caché local o del servidor) y `guardar()` compara con eso y escribe solo lo que cambió,
 * todo en un mismo lote. No espera al servidor: sin señal, el cambio queda en el dispositivo y se
 * sube solo. Hay que llamar a `iniciar()` antes de usarlo.
 */
export class RepositorioFirestore implements Repositorio {
  private readonly db: Firestore;
  private readonly base: string;
  private actual: Datos = RepositorioFirestore.vacios();
  private estado: EstadoSincronizacion = { pendiente: false };
  private listo: Promise<void> | null = null;
  private yaLeyo = false;
  private baja: Unsubscribe[] = [];
  private oyentes = new Set<(datos: Datos, estado: EstadoSincronizacion) => void>();
  private oyentesError = new Set<(error: Error) => void>();

  // Última lectura de cada parte; el repositorio solo emite cuando ya llegaron las cuatro.
  private perfil?: { datos: DocumentData | undefined; pendiente: boolean };
  private config?: { datos: DocumentData | undefined; pendiente: boolean };
  private turnos?: { docs: DocumentData[]; pendiente: boolean };
  private movimientos?: { docs: DocumentData[]; pendiente: boolean };

  constructor(db: Firestore, uid: string) {
    this.db = db;
    this.base = `usuarios/${uid}`;
  }

  private static vacios(): Datos {
    return { schemaVersion: VERSION_ESQUEMA, config: structuredClone(CONFIG_POR_DEFECTO), turnos: [], movimientos: [] };
  }

  /** Empieza a escuchar. Resuelve con la primera lectura completa; falla si no se puede leer o hay datos dañados. */
  iniciar(): Promise<void> {
    if (this.listo) return this.listo;
    this.listo = new Promise<void>((resolve, reject) => {
      this.alPrimeraLectura = { resolve, reject };
      const opciones = { includeMetadataChanges: true };
      const error = (e: Error) => this.fallar(e);
      this.baja.push(
        onSnapshot(doc(this.db, this.base), opciones, (s) => {
          this.perfil = { datos: s.data(), pendiente: s.metadata.hasPendingWrites };
          this.recomponer();
        }, error),
        onSnapshot(doc(this.db, `${this.base}/config/principal`), opciones, (s) => {
          this.config = { datos: s.data(), pendiente: s.metadata.hasPendingWrites };
          this.recomponer();
        }, error),
        onSnapshot(collection(this.db, `${this.base}/turnos`), opciones, (s) => {
          this.turnos = { docs: s.docs.map((d) => d.data()), pendiente: s.metadata.hasPendingWrites };
          this.recomponer();
        }, error),
        onSnapshot(collection(this.db, `${this.base}/movimientos`), opciones, (s) => {
          this.movimientos = { docs: s.docs.map((d) => d.data()), pendiente: s.metadata.hasPendingWrites };
          this.recomponer();
        }, error),
      );
    });
    return this.listo;
  }

  private alPrimeraLectura: { resolve: () => void; reject: (e: Error) => void } | null = null;

  private fallar(e: Error) {
    if (this.alPrimeraLectura) {
      this.alPrimeraLectura.reject(e);
      this.alPrimeraLectura = null;
    }
    this.oyentesError.forEach((o) => o(e));
  }

  private recomponer() {
    if (!this.perfil || !this.config || !this.turnos || !this.movimientos) return;
    try {
      const crudo: Record<string, unknown> = {
        schemaVersion: VERSION_ESQUEMA,
        config: this.config.datos ?? CONFIG_POR_DEFECTO,
        turnos: [...this.turnos.docs].sort((a, b) => String(a.id).localeCompare(String(b.id))),
        movimientos: [...this.movimientos.docs].sort((a, b) => String(a.id).localeCompare(String(b.id))),
      };
      if (this.perfil.datos?.ultimoRespaldo !== undefined) crudo.ultimoRespaldo = this.perfil.datos.ultimoRespaldo;
      // Se valida igual que un respaldo: un documento dañado da error, no datos inventados.
      this.actual = leerDatos(JSON.stringify(crudo)).datos;
    } catch (e) {
      this.fallar(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    this.estado = { pendiente: [this.perfil, this.config, this.turnos, this.movimientos].some((p) => p.pendiente) };
    this.yaLeyo = true;
    if (this.alPrimeraLectura) {
      this.alPrimeraLectura.resolve();
      this.alPrimeraLectura = null;
    }
    this.oyentes.forEach((o) => o(this.actual, this.estado));
  }

  /**
   * Para pantallas que se actualizan solas. Avisa en cada cambio, también los de otro dispositivo, y
   * dice si lo último está solo en este dispositivo. Devuelve la función para dejar de escuchar.
   */
  suscribir(alCambiar: (datos: Datos, estado: EstadoSincronizacion) => void, alError?: (error: Error) => void): () => void {
    this.oyentes.add(alCambiar);
    if (alError) this.oyentesError.add(alError);
    if (this.yaLeyo) alCambiar(this.actual, this.estado);
    return () => {
      this.oyentes.delete(alCambiar);
      if (alError) this.oyentesError.delete(alError);
    };
  }

  /** Deja de escuchar y olvida lo leído. Se puede volver a llamar a `iniciar()`. */
  detener() {
    this.baja.forEach((b) => b());
    this.baja = [];
    this.oyentes.clear();
    this.oyentesError.clear();
    this.listo = null;
    this.yaLeyo = false;
    this.perfil = this.config = this.turnos = this.movimientos = undefined;
  }

  /** El perfil de la persona, o null si todavía no hizo el primer ingreso (entonces va la bienvenida). */
  perfilGuardado(): PerfilNube | null {
    const p = this.perfil?.datos;
    if (!p || typeof p.avisoVersion !== "number") return null;
    return {
      correo: p.correo,
      creadoEn: p.creadoEn,
      avisoVersion: p.avisoVersion,
      avisoAceptadoEn: p.avisoAceptadoEn,
      schemaVersion: 2,
    };
  }

  /**
   * Lo que se escribe al crear la cuenta, partido en lotes de máximo 500 operaciones. El perfil va en
   * el ÚLTIMO lote: si algo se corta a medias, la cuenta todavía "no existe" y la bienvenida se puede
   * repetir sin dejar nada a medias (volver a escribir los mismos documentos no duplica nada).
   */
  lotesDeCuenta(perfil: PerfilNube, inicial: DatosIniciales): Operacion[][] {
    const operaciones: Operacion[] = [
      { tipo: "set", ruta: `${this.base}/config/principal`, datos: sinUndefined(inicial.config) },
      ...(inicial.turnos ?? []).map((t): Operacion => ({ tipo: "set", ruta: `${this.base}/turnos/${t.id}`, datos: sinUndefined(t) })),
      ...inicial.movimientos.map((m): Operacion => ({ tipo: "set", ruta: `${this.base}/movimientos/${m.id}`, datos: sinUndefined(m) })),
    ];
    const datosPerfil: DocumentData = { ...perfil };
    if (inicial.ultimoRespaldo !== undefined) datosPerfil.ultimoRespaldo = inicial.ultimoRespaldo;
    const lotes: Operacion[][] = [];
    for (let i = 0; i < operaciones.length; i += MAX_LOTE) lotes.push(operaciones.slice(i, i + MAX_LOTE));
    const ultimo = lotes[lotes.length - 1];
    const perfilOp: Operacion = { tipo: "set", ruta: this.base, datos: datosPerfil, unir: true };
    if (ultimo && ultimo.length < MAX_LOTE) ultimo.push(perfilOp);
    else lotes.push([perfilOp]);
    return lotes;
  }

  /**
   * Primer ingreso, con o sin respaldo importado: escribe perfil, configuración y datos. Si es poca
   * cosa va todo en un solo lote (o se escribe todo o nada). Espera al servidor: entrar con Google
   * ya exige conexión.
   */
  async crearCuenta(perfil: PerfilNube, inicial: DatosIniciales): Promise<void> {
    // Se arman todos los lotes antes de enviar ninguno: un id inválido lanza aquí y no se escribe nada.
    const lotes = this.lotesDeCuenta(perfil, inicial).map((ops) => this.armarLote(ops));
    for (const lote of lotes) await lote.commit(); // en orden: el perfil, que va en el último, es lo que "abre" la cuenta
    // El perfil, la configuración y el saldo llegan por oyentes distintos: se espera a verlos todos,
    // para que la app no arranque con el perfil nuevo y la configuración vieja.
    await this.hasta(
      () =>
        this.perfilGuardado() !== null &&
        canonico(this.actual.config) === canonico(inicial.config) &&
        (inicial.turnos ?? []).length === this.actual.turnos.length &&
        inicial.movimientos.length === this.actual.movimientos.length,
    );
  }

  private armarLote(operaciones: Operacion[]) {
    const lote = writeBatch(this.db);
    for (const op of operaciones) {
      const ref = doc(this.db, op.ruta);
      if (op.tipo === "set") lote.set(ref, op.datos, op.unir ? { merge: true } : {});
      else lote.delete(ref);
    }
    return lote;
  }

  /** Vuelve a aceptar el aviso cuando cambió de versión. Solo toca esos dos campos del perfil. */
  async aceptarAviso(version: number, ahora: string): Promise<void> {
    await setDoc(doc(this.db, this.base), { avisoVersion: version, avisoAceptadoEn: ahora }, { merge: true });
    await this.hasta(() => this.perfilGuardado()?.avisoVersion === version);
  }

  /** Resuelve cuando la lectura cumple la condición (o a los 5 s: lo escrito ya está en el servidor). */
  private hasta(condicion: () => boolean): Promise<void> {
    return new Promise((resolve) => {
      if (condicion()) return resolve();
      const terminar = () => {
        clearTimeout(plazo);
        this.oyentes.delete(revisar);
        resolve();
      };
      const revisar = () => condicion() && terminar();
      const plazo = setTimeout(terminar, 5000);
      this.oyentes.add(revisar);
    });
  }

  /** Lo último que se leyó. Antes de `iniciar()` son datos vacíos. */
  cargar(): Datos {
    return this.actual;
  }

  guardar(datos: Datos): void {
    const antes = this.actual;
    const operaciones: Operacion[] = [];

    const cambioConfig = canonico(antes.config) !== canonico(datos.config);
    if (cambioConfig) operaciones.push({ tipo: "set", ruta: `${this.base}/config/principal`, datos: sinUndefined(datos.config) });

    if (datos.ultimoRespaldo !== undefined && datos.ultimoRespaldo !== antes.ultimoRespaldo) {
      operaciones.push({ tipo: "set", ruta: this.base, datos: { ultimoRespaldo: datos.ultimoRespaldo }, unir: true });
    }

    for (const [coleccion, viejos, nuevos] of [
      ["turnos", antes.turnos, datos.turnos],
      ["movimientos", antes.movimientos, datos.movimientos],
    ] as const) {
      const porId = new Map<string, unknown>(viejos.map((x) => [x.id, x]));
      for (const x of nuevos) {
        const previo = porId.get(x.id);
        porId.delete(x.id);
        if (previo === undefined || canonico(previo) !== canonico(x)) {
          operaciones.push({ tipo: "set", ruta: `${this.base}/${coleccion}/${x.id}`, datos: sinUndefined(x) });
        }
      }
      for (const id of porId.keys()) operaciones.push({ tipo: "delete", ruta: `${this.base}/${coleccion}/${id}` });
    }

    // Primero se arman todos los lotes (una ruta inválida lanza aquí y no se escribe nada) y después se envían.
    const lotes = [];
    for (let i = 0; i < operaciones.length; i += MAX_LOTE) lotes.push(this.armarLote(operaciones.slice(i, i + MAX_LOTE)));

    this.actual = structuredClone(datos); // se ve ya, sin esperar al servidor
    for (const lote of lotes) lote.commit().catch((e: Error) => this.oyentesError.forEach((o) => o(e)));
  }

  /** Resuelve cuando el servidor confirmó todo lo guardado. Sin señal, queda esperando hasta que vuelva. */
  esperarEscrituras(): Promise<void> {
    return waitForPendingWrites(this.db);
  }
}
