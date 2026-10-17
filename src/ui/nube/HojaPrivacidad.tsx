import { useEffect, useId } from "react";
import type { AvisoPrivacidad } from "../../dominio/aviso";
import { Boton } from "../componentes/Boton";
import { useCapa } from "../navegacion";
import { TextoAviso } from "./TextoAviso";

type Props = {
  aviso: AvisoPrivacidad;
  alCerrar: () => void;
};

/**
 * El aviso de privacidad en una hoja sobre un velo, disponible desde el ingreso y desde Ajustes.
 * Escape y tocar el velo la cierran. El texto es el mismo de aviso-privacidad.md.
 */
export function HojaPrivacidad({ aviso, alCerrar }: Props) {
  const idTitulo = useId();
  useCapa(true, alCerrar); // el botón atrás la cierra

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  return (
    <div className="dialogo">
      <div className="dialogo__velo" onClick={alCerrar} />
      <div className="dialogo__hoja dialogo__hoja--larga" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo} className="dialogo__titulo">
          Aviso de privacidad
        </h2>
        <TextoAviso aviso={aviso} sinTitulo />
        <div className="dialogo__acciones">
          <Boton variante="relleno" onClick={alCerrar} autoFocus>
            Cerrar
          </Boton>
        </div>
      </div>
    </div>
  );
}
