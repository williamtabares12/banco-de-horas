import { useState } from "react";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { Campo, Entrada } from "../componentes/Campo";
import { useConfirmacion } from "../componentes/useConfirmacion";

export type ResultadoBorrado = { ok: true } | { ok: false; error: string };

type Props = {
  /** Cómo entró la persona: con contraseña se le pide escribirla; con Google se abre la ventana de Google. */
  proveedor: "password" | "google.com" | "otro";
  /** Borra todo. Si sale bien, la sesión se cierra sola y esta pantalla se va; si no, devuelve el motivo. */
  alBorrar: (clave: string) => Promise<ResultadoBorrado>;
};

/**
 * Borrar mi cuenta (RF-C9): elimina la cuenta y todos los datos, de forma definitiva. Pide volver a confirmar
 * quién es y, al final, una confirmación clara. Si algo falla se puede repetir.
 */
export function BorrarCuenta({ proveedor, alBorrar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dialogo, preguntar } = useConfirmacion();

  const pideClave = proveedor === "password";

  function empezar() {
    if (pideClave && clave === "") return setError("Escribe tu contraseña para confirmar que eres tú.");
    setError(null);
    preguntar(
      {
        titulo: "¿Borrar tu cuenta para siempre?",
        mensaje:
          "Se borran tu cuenta y todos tus datos: turnos, movimientos y configuración. No se puede deshacer y no se pueden recuperar.",
        textoConfirmar: "Borrar mi cuenta",
      },
      async () => {
        setBorrando(true);
        const r = await alBorrar(clave);
        if (!r.ok) {
          setError(r.error);
          setBorrando(false);
        }
      },
    );
  }

  return (
    <section className="seccion">
      <h2 className="titulo-seccion">Borrar mi cuenta</h2>
      <p>
        Elimina tu cuenta y todos tus datos (turnos, movimientos y configuración) para siempre. No se puede deshacer.
        Antes de borrar, descarga tu respaldo en la sección Respaldo de arriba.
      </p>

      {proveedor === "otro" ? (
        <p className="texto-suave">
          Tu tipo de cuenta no se puede borrar desde la app. Escribe al correo de contacto del aviso de privacidad y la
          borramos.
        </p>
      ) : !abierto ? (
        <div className="acciones">
          <Boton borra onClick={() => setAbierto(true)}>
            Borrar mi cuenta
          </Boton>
        </div>
      ) : (
        <div className="formulario">
          <p>
            {pideClave
              ? "Por seguridad, escribe tu contraseña para confirmar que eres tú."
              : "Por seguridad, vas a volver a iniciar sesión con Google para confirmar que eres tú."}
          </p>
          {pideClave && (
            <Campo etiqueta="Tu contraseña">
              <Entrada
                type="password"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                disabled={borrando}
              />
            </Campo>
          )}
          {error && <Aviso tipo="error">{error}</Aviso>}
          {borrando && (
            <p className="texto-suave" role="status">
              Borrando tu cuenta…
            </p>
          )}
          <div className="acciones">
            <Boton borra onClick={empezar} disabled={borrando}>
              {borrando ? "Borrando…" : "Borrar para siempre"}
            </Boton>
            <Boton
              onClick={() => {
                setAbierto(false);
                setClave("");
                setError(null);
              }}
              disabled={borrando}
            >
              Cancelar
            </Boton>
          </div>
        </div>
      )}
      {dialogo}
    </section>
  );
}
