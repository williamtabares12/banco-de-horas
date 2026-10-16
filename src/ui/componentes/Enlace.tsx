import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ComoAncla = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type ComoBoton = ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

/**
 * Texto de enlace sin fondo. Con `href` es un <a>; si solo lleva una acción es un <button>,
 * para no engañar a quien usa un lector de pantalla.
 */
export function Enlace(props: ComoAncla | ComoBoton) {
  if (props.href !== undefined) return <a {...(props as ComoAncla)} className="enlace" />;
  return <button type="button" {...(props as ComoBoton)} className="enlace" />;
}
