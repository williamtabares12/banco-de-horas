import { useEffect, useId } from "react";
import { useCapa } from "../navegacion";
import { Boton } from "./Boton";

type Props = {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/**
 * Hoja de confirmación sobre un velo. Botón relleno para confirmar y de contorno para cancelar.
 * El foco empieza en "Cancelar" (así un Enter distraído no borra nada); Escape y tocar el velo cancelan.
 */
export function DialogoConfirmacion({
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
}: Props) {
  const idTitulo = useId();
  const idMensaje = useId();
  useCapa(true, onCancelar); // el botón atrás lo cierra, como Cancelar

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCancelar]);

  return (
    <div className="dialogo">
      <div className="dialogo__velo" onClick={onCancelar} />
      <div className="dialogo__hoja" role="alertdialog" aria-modal="true" aria-labelledby={idTitulo} aria-describedby={idMensaje}>
        <h2 id={idTitulo} className="dialogo__titulo">
          {titulo}
        </h2>
        <p id={idMensaje} className="dialogo__mensaje">
          {mensaje}
        </p>
        <div className="dialogo__acciones">
          <Boton variante="relleno" onClick={onConfirmar}>
            {textoConfirmar}
          </Boton>
          <Boton variante="contorno" onClick={onCancelar} autoFocus>
            {textoCancelar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
