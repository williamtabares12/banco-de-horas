import type { ButtonHTMLAttributes } from "react";
import { clases } from "./clases";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** "relleno" es la acción principal (uno por pantalla); "contorno", la secundaria. */
  variante?: "relleno" | "contorno";
  /** Las acciones que borran usan contorno con el color del texto. */
  borra?: boolean;
};

export function Boton({ variante = "contorno", borra = false, className, type = "button", ...resto }: Props) {
  return (
    <button
      {...resto}
      type={type}
      className={clases("boton", `boton--${variante}`, borra && "boton--borra", className)}
    />
  );
}
