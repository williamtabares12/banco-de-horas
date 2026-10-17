import { doc, getDoc, type Firestore } from "firebase/firestore";
import { PARAMETROS_INCLUIDOS, ParametrosInvalidos, validarParametros, type Parametros } from "../dominio/parametros";

/** Dónde se guarda la última copia buena de los parámetros, en este dispositivo. */
export const CLAVE_COPIA_PARAMETROS = "banco-horas:parametros";

type Almacen = Pick<Storage, "getItem" | "setItem">;

/** De dónde salieron los parámetros que se van a usar. */
export type OrigenParametros = "nube" | "copia" | "incluidas";

export type ResultadoParametros = {
  /** Siempre válidos: la app nunca calcula con valores a medias. */
  parametros: Parametros;
  origen: OrigenParametros;
  /** Qué decirle a la persona cuando no se usó el documento de la nube; null si todo está bien. */
  aviso: string | null;
};

/** El documento tal como está en Firestore, o undefined si no existe. */
export type LeerDocumento = () => Promise<unknown | undefined>;

export function leerDeFirestore(db: Firestore): LeerDocumento {
  return async () => {
    const instantanea = await getDoc(doc(db, "configuracion/parametros"));
    return instantanea.exists() ? instantanea.data() : undefined;
  };
}

function leerCopia(almacen: Almacen): Parametros | null {
  try {
    const texto = almacen.getItem(CLAVE_COPIA_PARAMETROS);
    return texto === null ? null : validarParametros(JSON.parse(texto));
  } catch {
    return null; // una copia dañada se ignora
  }
}

function guardarCopia(almacen: Almacen, parametros: Parametros) {
  try {
    almacen.setItem(CLAVE_COPIA_PARAMETROS, JSON.stringify(parametros));
  } catch {
    // sin espacio para la copia: no pasa nada, se sigue con los de la nube
  }
}

/**
 * Lee los parámetros de la clínica, los valida y, si algo falla, usa en este orden: la última copia buena
 * guardada en el dispositivo o las reglas incluidas en la app. Siempre dice qué pasó. Un documento malo
 * nunca pisa la copia buena.
 */
export async function cargarParametros(leer: LeerDocumento, almacen: Almacen): Promise<ResultadoParametros> {
  let problema: string;
  try {
    const crudo = await leer();
    if (crudo === undefined) {
      problema = "No se encontró el documento de parámetros de la clínica";
    } else {
      const parametros = validarParametros(crudo);
      guardarCopia(almacen, parametros);
      return { parametros, origen: "nube", aviso: null };
    }
  } catch (e) {
    problema =
      e instanceof ParametrosInvalidos
        ? `Los parámetros de la clínica están mal formados (${e.message})`
        : "No se pudieron leer los parámetros de la clínica";
  }

  const copia = leerCopia(almacen);
  if (copia) return { parametros: copia, origen: "copia", aviso: `${problema}. Se usan los últimos parámetros guardados en este dispositivo.` };
  return { parametros: PARAMETROS_INCLUIDOS, origen: "incluidas", aviso: `${problema}. Se usan las reglas incluidas en la app.` };
}

/** Una sola lectura por sesión: las llamadas siguientes (o a la vez) reciben el mismo resultado en memoria. */
export function lectorDeParametros(leer: LeerDocumento, almacen: Almacen): () => Promise<ResultadoParametros> {
  let lectura: Promise<ResultadoParametros> | null = null;
  return () => (lectura ??= cargarParametros(leer, almacen));
}
