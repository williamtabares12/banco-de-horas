import type { Datos, Repositorio } from "../almacenamiento/repositorio";

/**
 * Aplica un cambio partiendo de lo último que tiene el repositorio, no de la copia que la pantalla
 * leyó al abrir. Así una pestaña o un celular que no se ha enterado de un cambio de otro dispositivo
 * no lo reescribe al guardar otra cosa (RF-C5, CC24). Devuelve lo guardado. Si guardar falla, lanza.
 */
export function aplicarCambio(repo: Repositorio, fn: (d: Datos) => Datos): Datos {
  const siguiente = fn(repo.cargar());
  repo.guardar(siguiente);
  return siguiente;
}

/**
 * Avisa cada vez que el repositorio trae datos nuevos (también los de otro dispositivo).
 * Con un repositorio que no avisa, como el local, no hace nada. Devuelve la función para dejar de escuchar.
 */
export function escucharDatos(repo: Repositorio, alCambiar: (d: Datos) => void): () => void {
  return repo.suscribir ? repo.suscribir((datos) => alCambiar(datos)) : () => {};
}
