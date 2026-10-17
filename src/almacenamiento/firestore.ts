import { type FirebaseApp } from "firebase/app";
import {
  collection,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  waitForPendingWrites,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { CONFIG_POR_DEFECTO } from "../dominio/config";
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

const sinUndefined = (valor: object): DocumentData => JSON.parse(JSON.stringify(valor));

type Operacion = { tipo: "set"; ruta: string; datos: DocumentData; unir?: boolean } | { tipo: "delete"; ruta: string };

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

  detener() {
    this.baja.forEach((b) => b());
    this.baja = [];
    this.oyentes.clear();
    this.oyentesError.clear();
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
    for (let i = 0; i < operaciones.length; i += MAX_LOTE) {
      const lote = writeBatch(this.db);
      for (const op of operaciones.slice(i, i + MAX_LOTE)) {
        const ref = doc(this.db, op.ruta);
        if (op.tipo === "set") lote.set(ref, op.datos, op.unir ? { merge: true } : {});
        else lote.delete(ref);
      }
      lotes.push(lote);
    }

    this.actual = structuredClone(datos); // se ve ya, sin esperar al servidor
    for (const lote of lotes) lote.commit().catch((e: Error) => this.oyentesError.forEach((o) => o(e)));
  }

  /** Resuelve cuando el servidor confirmó todo lo guardado. Sin señal, queda esperando hasta que vuelva. */
  esperarEscrituras(): Promise<void> {
    return waitForPendingWrites(this.db);
  }
}
