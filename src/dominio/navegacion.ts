// La pila de lo que hay abierto en la app, para que "atrás" haga lo que debe (RF-C21): primero cerrar lo que está
// encima (un diálogo, la hoja del aviso, un formulario), luego volver a la pestaña anterior, y desde Inicio, salir.
// Aquí solo va la lógica, sin navegador: el pegamento con el historial está en src/ui/navegacion.ts.

/** Una entrada de la pila: una pestaña a la que se fue, o una capa abierta encima de ella. */
export type Entrada = { tipo: "pestana"; id: string } | { tipo: "capa"; id: string; abierta: boolean };

/** La primera entrada es la raíz (la pestaña con la que se abre la app): de ahí no se retrocede. */
export type Pila = Entrada[];

export const pilaInicial = (pestana: string): Pila => [{ tipo: "pestana", id: pestana }];

/** La pestaña que se está viendo: la última entrada de pestaña, aunque haya capas encima. */
export function pestanaActual(pila: Pila): string {
  for (let i = pila.length - 1; i >= 0; i--) {
    const e = pila[i];
    if (e.tipo === "pestana") return e.id;
  }
  return "";
}

/** Ir a otra pestaña agrega una entrada. Tocar la pestaña en la que ya estás no agrega nada. */
export function irAPestana(pila: Pila, id: string): Pila {
  return id === pestanaActual(pila) ? pila : [...pila, { tipo: "pestana", id }];
}

export const abrirCapa = (pila: Pila, id: string): Pila => [...pila, { tipo: "capa", id, abierta: true }];

/** Marca como cerrada la capa de más arriba con ese nombre (la interfaz ya la cerró). */
export function marcarCerrada(pila: Pila, id: string): Pila {
  for (let i = pila.length - 1; i >= 1; i--) {
    const e = pila[i];
    if (e.tipo === "capa" && e.id === id && e.abierta) return pila.map((x, k) => (k === i ? { ...e, abierta: false } : x));
  }
  return pila;
}

/** El navegador volvió atrás hasta `profundidad`: se quita lo de más arriba (de arriba hacia abajo) y se devuelve lo quitado. */
export function recortar(pila: Pila, profundidad: number): { pila: Pila; quitadas: Entrada[] } {
  const destino = Math.max(0, profundidad) + 1;
  if (pila.length <= destino) return { pila, quitadas: [] };
  return { pila: pila.slice(0, destino), quitadas: pila.slice(destino).reverse() };
}

/** Si la cima es una capa que ya se cerró, un "atrás" ahí no tendría efecto visible: hay que seguir retrocediendo. */
export function debeSaltar(pila: Pila): boolean {
  if (pila.length <= 1) return false;
  const cima = pila[pila.length - 1];
  return cima.tipo === "capa" && !cima.abierta;
}
