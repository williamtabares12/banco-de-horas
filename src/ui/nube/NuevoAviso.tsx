import { useState } from "react";
import type { AvisoPrivacidad } from "../../dominio/aviso";
import { Marca } from "../componentes/Marca";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { Interruptor } from "../componentes/Interruptor";
import { TextoAviso } from "./TextoAviso";

type Props = {
  aviso: AvisoPrivacidad;
  alAceptar: () => Promise<void>;
};

/** Cuando el aviso cambia de versión: se pide aceptarlo de nuevo, sin tocar los datos de la persona. */
export function NuevoAviso({ aviso, alAceptar }: Props) {
  const [acepto, setAcepto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  async function continuar() {
    setGuardando(true);
    setFalla(null);
    try {
      await alAceptar();
    } catch {
      setFalla("No se pudo guardar tu autorización. Revisa la conexión e intenta de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <main className="aplicacion">
      <header className="encabezado">
        <Marca />
      </header>
      <section className="pantalla">
        <p>El aviso de privacidad cambió. Léelo y confírmalo para seguir usando la app. Tus datos no se tocan.</p>
        <div className="seccion">
          <TextoAviso aviso={aviso} />
          <Interruptor etiqueta={aviso.textoAutorizacion} activo={acepto} onCambiar={setAcepto} />
        </div>
        {falla && <Aviso tipo="error">{falla}</Aviso>}
        <div className="acciones">
          <Boton variante="relleno" onClick={continuar} disabled={!acepto || guardando}>
            {guardando ? "Guardando…" : "Continuar"}
          </Boton>
        </div>
      </section>
    </main>
  );
}
