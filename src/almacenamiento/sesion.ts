import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from "firebase/auth";
import { connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { CONFIG_FIREBASE } from "./configFirebase";
import { crearFirestore } from "./firestore";

export type Usuario = { uid: string; correo: string; nombre: string };

export type Nube = {
  auth: Auth;
  db: Firestore;
};

let nube: Nube | null = null;

/**
 * Arranca Firebase una sola vez. Con `usarEmuladores` (npm run dev:emulador) todo va a los emuladores
 * locales y no toca el proyecto real.
 */
export function iniciarNube(usarEmuladores: boolean): Nube {
  if (nube) return nube;
  const app = initializeApp(usarEmuladores ? { ...CONFIG_FIREBASE, apiKey: "demo-emulador" } : CONFIG_FIREBASE);
  const auth = getAuth(app);
  const db = crearFirestore(app);
  if (usarEmuladores) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  nube = { auth, db };
  return nube;
}

/** Avisa cada vez que la persona entra o sale (también al abrir la app con la sesión ya iniciada). */
export function escucharSesion(
  { auth }: Nube,
  alCambiar: (usuario: Usuario | null) => void,
  alFallar: (error: Error) => void,
): () => void {
  return onAuthStateChanged(
    auth,
    (u) => alCambiar(u ? { uid: u.uid, correo: u.email ?? "", nombre: u.displayName ?? "" } : null),
    alFallar,
  );
}

// Cuando la ventana emergente no se puede usar (Safari en el iPhone a veces la bloquea), se pasa a la redirección.
const SIN_VENTANA = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"];

/** `soloRedireccion` salta la ventana emergente: así se prueba el camino de respaldo (y en el panel de pruebas no hay ventanas). */
export async function ingresarConGoogle({ auth }: Nube, soloRedireccion = false): Promise<void> {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: "select_account" });
  if (soloRedireccion) return signInWithRedirect(auth, proveedor);
  try {
    await signInWithPopup(auth, proveedor);
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? "";
    if (SIN_VENTANA.includes(codigo)) return signInWithRedirect(auth, proveedor);
    throw e;
  }
}

export function cerrarSesion({ auth }: Nube): Promise<void> {
  return signOut(auth);
}

/** Texto para mostrar cuando el ingreso falla. Cerrar la ventana no es un error. */
export function mensajeDeIngreso(e: unknown): string | null {
  const codigo = (e as { code?: string }).code ?? "";
  if (codigo === "auth/popup-closed-by-user" || codigo === "auth/cancelled-popup-request") return null;
  if (codigo === "auth/network-request-failed") return "No hay conexión. Para entrar necesitas internet.";
  if (codigo === "auth/unauthorized-domain") return "Esta dirección no está autorizada para iniciar sesión.";
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}
