import { RelojArena } from "./RelojArena";

/**
 * La cabecera de todas las pantallas (estilo-visual.md, sección 7): el reloj de arena de 30 px, quieto, y
 * "Arena" a 22 px y peso 600. Debajo van el estado de sincronización y las pestañas.
 */
export function Marca() {
  return (
    <div className="marca">
      <RelojArena cabecera decorativo />
      <h1 className="titulo-app">Arena</h1>
    </div>
  );
}
