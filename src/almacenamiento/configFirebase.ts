/**
 * Configuración PÚBLICA de la app web de Firebase (la que muestra la consola). La apiKey de web no es
 * un secreto: la seguridad la dan las reglas de Firestore (plan-nube.md §3). No hay aquí ninguna llave
 * de cuenta de servicio ni nada privado, y no debe haberla.
 */
export const CONFIG_FIREBASE = {
  apiKey: "AIzaSyBQf1sqcwNO9rUBlS9zWo5KKRbIuHOICRQ",
  authDomain: "banco-horas-f6890.firebaseapp.com",
  projectId: "banco-horas-f6890",
  appId: "1:127334451143:web:aaa2a2f6b6674b2fcb7be2",
  messagingSenderId: "127334451143",
  storageBucket: "banco-horas-f6890.firebasestorage.app",
};
