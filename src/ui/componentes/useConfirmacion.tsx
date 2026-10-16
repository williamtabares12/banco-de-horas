import { useState, type ReactNode } from "react";
import { DialogoConfirmacion } from "./DialogoConfirmacion";

type Pregunta = {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
};

/**
 * Reemplaza a window.confirm con la hoja de confirmación del estilo visual.
 *
 *   const { dialogo, preguntar } = useConfirmacion();
 *   preguntar({ titulo: "¿Borrar?", mensaje: "…", textoConfirmar: "Borrar" }, () => borrar());
 *   return <>…{dialogo}</>;
 */
export function useConfirmacion(): {
  dialogo: ReactNode;
  preguntar: (pregunta: Pregunta, alConfirmar: () => void) => void;
} {
  const [pendiente, setPendiente] = useState<(Pregunta & { alConfirmar: () => void }) | null>(null);

  const dialogo = pendiente ? (
    <DialogoConfirmacion
      titulo={pendiente.titulo}
      mensaje={pendiente.mensaje}
      textoConfirmar={pendiente.textoConfirmar}
      onConfirmar={() => {
        const accion = pendiente.alConfirmar;
        setPendiente(null);
        accion();
      }}
      onCancelar={() => setPendiente(null)}
    />
  ) : null;

  return { dialogo, preguntar: (pregunta, alConfirmar) => setPendiente({ ...pregunta, alConfirmar }) };
}
