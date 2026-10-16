import { useEffect, useRef } from "react";
import { clases } from "./clases";

export type ElementoPestana<Id extends string = string> = { id: Id; nombre: string };

type Props<Id extends string> = {
  elementos: ElementoPestana<Id>[];
  activa: Id;
  onCambiar: (id: Id) => void;
  etiqueta?: string;
};

/**
 * Navegación: una fila de pastillas que se desplaza de lado. La activa va en azul de acción y
 * siempre queda a la vista; ninguna etiqueta se corta ni se encoge.
 */
export function Pestanas<Id extends string>({ elementos, activa, onCambiar, etiqueta = "Secciones" }: Props<Id>) {
  const barra = useRef<HTMLElement>(null);

  useEffect(() => {
    barra.current?.querySelector(".pestana--activa")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activa]);

  return (
    <nav className="pestanas" aria-label={etiqueta} ref={barra}>
      {elementos.map((e) => (
        <button
          key={e.id}
          type="button"
          className={clases("pestana", e.id === activa && "pestana--activa")}
          aria-current={e.id === activa ? "page" : undefined}
          onClick={() => onCambiar(e.id)}
        >
          {e.nombre}
        </button>
      ))}
    </nav>
  );
}
