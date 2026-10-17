// Reglas puras del acceso (iniciar sesión, crear cuenta, recuperar contraseña). Portado de auth.js y
// main.js de Bitácora AIDA v2, sin Firebase ni DOM: aquí solo van los textos y las decisiones.

export type ModoAcceso = "login" | "registro";

export type CamposAcceso = {
  nombre: string;
  correo: string;
  contrasena: string;
  avisoAceptado: boolean;
};

const CORREO = /^\S+@\S+\.\S+$/;
const MIN_CONTRASENA = 6;

/**
 * Traduce el código de error de Firebase Auth a un mensaje para alguien sin formación técnica.
 * Devuelve null cuando no hay nada que mostrar (cerrar la ventana de Google no es un error).
 */
export function mensajeDeErrorAcceso(codigo: string): string | null {
  switch (codigo) {
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo. Inicia sesión en vez de registrarte.";
    case "auth/invalid-email":
      return "Ese correo no parece válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento y vuelve a intentar.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/network-request-failed":
      return "No hay conexión a internet en este momento. Para entrar necesitas internet.";
    case "auth/unauthorized-domain":
      return "Esta dirección no está autorizada para iniciar sesión.";
    case "auth/requires-recent-login":
      return "Por seguridad, vuelve a iniciar sesión e intenta de nuevo.";
    default:
      return "Algo salió mal. Inténtalo de nuevo en un momento.";
  }
}

/** Qué falta para enviar el formulario, o null si está bien. Crear la cuenta exige aceptar el aviso. */
export function errorDeAcceso(modo: ModoAcceso, c: CamposAcceso): string | null {
  const correo = c.correo.trim();
  if (modo === "registro" && c.nombre.trim() === "") return "Escribe tu nombre.";
  if (correo === "") return "Escribe tu correo.";
  if (modo === "registro" && !CORREO.test(correo)) return "Ese correo no parece válido.";
  if (c.contrasena === "") return "Escribe tu contraseña.";
  if (modo === "registro" && c.contrasena.length < MIN_CONTRASENA) return "La contraseña debe tener al menos 6 caracteres.";
  if (modo === "registro" && !c.avisoAceptado) {
    return "Para crear tu cuenta primero tienes que aceptar el aviso de privacidad (la casilla de abajo).";
  }
  return null;
}

export function errorDeRecuperacion(correo: string): string | null {
  const c = correo.trim();
  if (c === "") return "Escribe tu correo arriba primero, y toca de nuevo el enlace.";
  if (!CORREO.test(c)) return "Ese correo no parece válido.";
  return null;
}

/**
 * Con Google, Firebase crea la cuenta en el mismo paso si el correo nunca se había usado. Si pasó eso
 * sin que la persona haya aceptado el aviso (por ejemplo, entró con Google por primera vez desde
 * "Iniciar sesión"), el registro se anula: no queda una cuenta sin consentimiento.
 */
export function debeAnularse(r: { esNuevo: boolean; aceptoAviso: boolean }): boolean {
  return r.esNuevo && !r.aceptoAviso;
}

/**
 * Dominio con el que Firebase maneja el acceso. Debe ser el MISMO de la página: si la app se abre en
 * `proyecto.web.app` y el acceso va por `proyecto.firebaseapp.com`, la redirección de Google cruza de
 * sitio y Safari (y los navegadores internos, como el de WhatsApp) le niegan el sessionStorage, y el
 * ingreso falla con "missing initial state". Solo se acepta una dirección de los sitios de Hosting de este
 * proyecto (por defecto, el del mismo nombre del proyecto).
 */
export function authDomainPara(host: string, proyecto: string, porDefecto: string, sitios: string[] = [proyecto]): string {
  const actual = host.toLowerCase();
  const propias = sitios.flatMap((sitio) => [`${sitio}.web.app`, `${sitio}.firebaseapp.com`]);
  return propias.includes(actual) ? actual : porDefecto;
}

/**
 * Qué decirle a la persona si no se pudo borrar la cuenta. Siempre dice si se puede repetir, y nunca
 * enseña códigos técnicos. Si falló la confirmación de identidad, no se borró nada.
 */
export function mensajeDeErrorBorrado(codigo: string): string {
  switch (codigo) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "La contraseña no es correcta. No se borró nada.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Cancelaste la confirmación con Google. No se borró nada.";
    case "auth/popup-blocked":
      return "El navegador no dejó abrir la ventana de Google. Abre la app en Safari o Chrome e inténtalo de nuevo.";
    case "auth/network-request-failed":
    case "unavailable":
      return "No hay conexión. Revisa tu internet y vuelve a intentarlo: borrar la cuenta se puede repetir sin problema.";
    case "auth/requires-recent-login":
      return "Por seguridad, tienes que volver a confirmar quién eres. Inténtalo de nuevo.";
    default:
      return "No se pudo borrar la cuenta. Inténtalo de nuevo: se puede repetir sin problema.";
  }
}
