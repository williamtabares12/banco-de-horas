import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { clases } from "./clases";

/**
 * Etiqueta arriba y el campo debajo. La etiqueta envuelve al campo, así quedan asociados sin ids.
 * `ayuda` es una frase corta debajo del campo (por ejemplo, el recordatorio de las notas).
 */
export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {ayuda && <span className="campo__ayuda">{ayuda}</span>}
    </label>
  );
}

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clases("campo__control", className)} />;
}

export function Seleccion({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clases("campo__control", className)} />;
}
