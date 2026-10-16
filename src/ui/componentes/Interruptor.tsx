import { useId } from "react";
import { clases } from "./clases";

type Props = {
  etiqueta: string;
  activo: boolean;
  onCambiar: (activo: boolean) => void;
};

/** Apagado en gris de relleno, encendido en azul de acción. Toda la fila se puede tocar. */
export function Interruptor({ etiqueta, activo, onCambiar }: Props) {
  const idEtiqueta = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-labelledby={idEtiqueta}
      className={clases("interruptor", activo && "interruptor--encendido")}
      onClick={() => onCambiar(!activo)}
    >
      <span id={idEtiqueta} className="interruptor__etiqueta">
        {etiqueta}
      </span>
      <span className="interruptor__pista" aria-hidden="true">
        <span className="interruptor__bolita" />
      </span>
    </button>
  );
}
