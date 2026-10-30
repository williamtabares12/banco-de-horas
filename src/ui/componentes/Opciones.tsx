import { useId } from "react";
import { clases } from "./clases";

export type Opcion<Id extends string> = { id: Id; nombre: string };

type Props<Id extends string> = {
  /** La pregunta que va arriba, por ejemplo "¿Qué horario hiciste?". */
  etiqueta: string;
  opciones: Opcion<Id>[];
  /** La opción elegida, o una cadena vacía si todavía no se eligió ninguna. */
  valor: Id | "";
  onCambiar: (id: Id) => void;
};

/**
 * Varias opciones como botones grandes y siempre visibles (pastillas elegibles), de las que se elige una. Para
 * decisiones que la persona no debe pasar por alto, donde una lista desplegable esconde las opciones.
 */
export function Opciones<Id extends string>({ etiqueta, opciones, valor, onCambiar }: Props<Id>) {
  const idEtiqueta = useId();
  return (
    <div className="campo" role="radiogroup" aria-labelledby={idEtiqueta}>
      <span className="campo__etiqueta" id={idEtiqueta}>
        {etiqueta}
      </span>
      <div className="opciones">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === valor}
            className={clases("opcion", o.id === valor && "opcion--activa")}
            onClick={() => onCambiar(o.id)}
          >
            {o.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
