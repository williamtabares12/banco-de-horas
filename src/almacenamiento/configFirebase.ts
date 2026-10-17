/**
 * Configuración PÚBLICA de la app web de Firebase (la que muestra la consola). La apiKey de web no es
 * un secreto: la seguridad la dan las reglas de Firestore (plan-nube.md §3). No hay aquí ninguna llave
 * de cuenta de servicio ni nada privado, y no debe haberla.
 */
/**
 * Los sitios de Hosting del proyecto: la app se publica en el primero (arena-horas.web.app). El segundo es el
 * sitio original, que sigue existiendo. Cada uno tiene dos direcciones: `<sitio>.web.app` y `<sitio>.firebaseapp.com`.
 */
export const SITIOS_HOSTING = ["arena-horas", "banco-horas-f6890"];

export const CONFIG_FIREBASE = {
  apiKey: "AIzaSyBQf1sqcwNO9rUBlS9zWo5KKRbIuHOICRQ",
  authDomain: "banco-horas-f6890.firebaseapp.com",
  projectId: "banco-horas-f6890",
  appId: "1:127334451143:web:aaa2a2f6b6674b2fcb7be2",
  messagingSenderId: "127334451143",
  storageBucket: "banco-horas-f6890.firebasestorage.app",
};
