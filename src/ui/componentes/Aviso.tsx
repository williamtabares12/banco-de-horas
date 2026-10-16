import type { ReactNode } from "react";

type Props = {
  /**
   * "aviso" y "error" llevan esa palabra delante (el estilo no usa rojo: la palabra y la línea fina
   * hacen el trabajo). "confirmacion" es para resultados normales (Guardado, PDF descargado) y no lleva palabra.
   */
  tipo: "aviso" | "error" | "confirmacion";
  children: ReactNode;
};

export function Aviso({ tipo, children }: Props) {
  return (
    <p className="aviso" role={tipo === "error" ? "alert" : "status"}>
      {tipo !== "confirmacion" && (
        <>
          <strong className="aviso__palabra">{tipo === "error" ? "Error" : "Aviso"}</strong>{" "}
        </>
      )}
      {children}
    </p>
  );
}
