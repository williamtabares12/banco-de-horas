// Toda la interacción con Firebase Authentication vive aquí (portado de auth.js de Bitácora AIDA v2):
// el resto de la app solo conoce estas funciones, no los detalles de Firebase.
import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Auth,
} from "firebase/auth";
import { connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { authDomainPara } from "../dominio/acceso";
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
  // El dominio de acceso es el de la página (ver authDomainPara): así la redirección de Google no pierde el estado.
  const authDomain = authDomainPara(globalThis.location?.host ?? "", CONFIG_FIREBASE.projectId, CONFIG_FIREBASE.authDomain);
  const app = initializeApp(usarEmuladores ? { ...CONFIG_FIREBASE, apiKey: "demo-emulador" } : { ...CONFIG_FIREBASE, authDomain });
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

/** Código de error de Firebase (por ejemplo "auth/wrong-password"), o "" si no es un error de Firebase. */
export function codigoDeError(e: unknown): string {
  return (e as { code?: string } | null)?.code ?? "";
}

/** Crea la cuenta con correo y contraseña y le pone el nombre (para saludar sin leer nada más). */
export async function registrarConCorreo({ auth }: Nube, nombre: string, correo: string, contrasena: string): Promise<void> {
  const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
  await updateProfile(credencial.user, { displayName: nombre.trim() });
}

export async function iniciarSesionConCorreo({ auth }: Nube, correo: string, contrasena: string): Promise<void> {
  await signInWithEmailAndPassword(auth, correo, contrasena);
}

export async function enviarCorreoRecuperacion({ auth }: Nube, correo: string): Promise<void> {
  await sendPasswordResetEmail(auth, correo);
}

// Cuando la ventana emergente no se puede usar (Safari en el iPhone a veces la bloquea), se pasa a la redirección.
const SIN_VENTANA = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"];

// Con la redirección la página se recarga y se pierde lo que había en pantalla: si la persona marcó el
// aviso antes de abrir Google, se recuerda aquí (solo mientras dura la pestaña) para decidir al volver.
const CLAVE_ACEPTO_AVISO = "banco-horas:google-acepto-aviso";

function recordarAviso(acepto: boolean) {
  try {
    sessionStorage.setItem(CLAVE_ACEPTO_AVISO, acepto ? "1" : "0");
  } catch {
    // sin sessionStorage: al volver se tratará como "no aceptó", que es lo más seguro
  }
}

/** ¿Estamos volviendo de Google por redirección? Mientras tanto no se debe dibujar nada que dependa de la sesión. */
export function hayRedireccionPendiente(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_ACEPTO_AVISO) !== null;
  } catch {
    return false;
  }
}

/**
 * Entra con Google. Con la ventana emergente devuelve si la cuenta es nueva; con la redirección
 * (respaldo, o `soloRedireccion` en el modo emulador) devuelve null y el resultado se lee al volver,
 * con `resultadoDeRedireccion`.
 */
export async function ingresarConGoogle(
  { auth }: Nube,
  aceptoAviso: boolean,
  soloRedireccion = false,
): Promise<{ esNuevo: boolean } | null> {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: "select_account" });
  const redirigir = () => {
    recordarAviso(aceptoAviso);
    return signInWithRedirect(auth, proveedor).then(() => null);
  };
  if (soloRedireccion) return redirigir();
  try {
    const credencial = await signInWithPopup(auth, proveedor);
    return { esNuevo: Boolean(getAdditionalUserInfo(credencial)?.isNewUser) };
  } catch (e) {
    if (SIN_VENTANA.includes(codigoDeError(e))) return redirigir();
    throw e;
  }
}

/** Al volver de Google por redirección: si la cuenta es nueva y si la persona había aceptado el aviso. */
export async function resultadoDeRedireccion({ auth }: Nube): Promise<{ esNuevo: boolean; aceptoAviso: boolean } | null> {
  let aceptoAviso = false;
  try {
    aceptoAviso = sessionStorage.getItem(CLAVE_ACEPTO_AVISO) === "1";
    sessionStorage.removeItem(CLAVE_ACEPTO_AVISO);
  } catch {
    // ver recordarAviso
  }
  const credencial = await getRedirectResult(auth);
  if (!credencial) return null;
  return { esNuevo: Boolean(getAdditionalUserInfo(credencial)?.isNewUser), aceptoAviso };
}

/**
 * Deshace una cuenta de Google recién creada sin haber aceptado el aviso: borra la cuenta en vez de solo
 * cerrar sesión, para no dejar una cuenta sin consentimiento.
 */
export async function anularRegistroGoogleSinAceptar({ auth }: Nube): Promise<void> {
  try {
    if (auth.currentUser) await deleteUser(auth.currentUser);
  } catch {
    // si no se puede borrar (sesión vencida, por ejemplo), al menos que no quede con la sesión abierta
    await signOut(auth);
  }
}

export function cerrarSesion({ auth }: Nube): Promise<void> {
  return signOut(auth);
}
