import { useId } from "react";

/**
 * El reloj de arena de la marca (estilo-visual.md §6b), animado con CSS: la arena baja durante 3,5 s, el reloj
 * gira 180° y se repite, en ciclos de 5 s. Con "reducir movimiento" queda quieto. Mide 96 px de lado y solo se
 * usa en el login y en la pantalla de carga. Es el mismo dibujo de arena-animado.html, con los colores de los tokens.
 */
export function RelojArena({ decorativo = false }: { decorativo?: boolean }) {
  const id = useId().replace(/:/g, "");
  // Como dibujo decorativo (en la pantalla de carga, que ya anuncia "Abriendo Arena") no se anuncia aparte.
  const accesible = decorativo ? { "aria-hidden": true } : { role: "img", "aria-label": "Reloj de arena" };
  return (
    <svg className="reloj-arena" viewBox="0 0 64 64" fill="none" {...accesible}>
      <defs>
        <clipPath id={`${id}-arriba`}>
          <path d="M22 10H42C42 21 36 26 32 30C28 26 22 21 22 10Z" />
        </clipPath>
        <clipPath id={`${id}-abajo`}>
          <path d="M32 34C36 38 42 43 42 54H22C22 43 28 38 32 34Z" />
        </clipPath>
      </defs>
      <g className="reloj-arena__vidrio">
        <g clipPath={`url(#${id}-arriba)`}>
          <rect className="reloj-arena__arena reloj-arena__arriba" x="16" y="8" width="32" height="24" />
        </g>
        <g clipPath={`url(#${id}-abajo)`}>
          <rect className="reloj-arena__arena reloj-arena__abajo" x="16" y="32" width="32" height="24" />
        </g>
        <path className="reloj-arena__hilo" d="M32 31V50" />
        <path className="reloj-arena__contorno" d="M16 8H48M16 56H48" strokeWidth="3" strokeLinecap="round" />
        <path
          className="reloj-arena__contorno"
          d="M20 8H44C44 22 36 27 32 32C36 37 44 42 44 56H20C20 42 28 37 32 32C28 27 20 22 20 8Z"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
