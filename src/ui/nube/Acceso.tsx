import { useState, type FormEvent } from "react";
import type { AvisoPrivacidad } from "../../dominio/aviso";
import { errorDeAcceso, errorDeRecuperacion, type ModoAcceso } from "../../dominio/acceso";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { Campo, Entrada } from "../componentes/Campo";
import { Enlace } from "../componentes/Enlace";
import { Interruptor } from "../componentes/Interruptor";
import { Pestanas } from "../componentes/Pestanas";
import { RelojArena } from "../componentes/RelojArena";
import { copiarTexto } from "../copiar";
import { HojaPrivacidad } from "./HojaPrivacidad";

/** Lo que devuelve cada acción de acceso: salió bien, o un mensaje listo para mostrar. */
export type ResultadoAcceso = { ok: true; mensaje?: string } | { ok: false; error: string; irARegistro?: boolean };

type Props = {
  aviso: AvisoPrivacidad;
  modoInicial?: ModoAcceso;
  /** Un error para mostrar al abrir (por ejemplo, una cuenta de Google que se anuló por no aceptar el aviso). */
  errorInicial?: string | null;
  /** Un mensaje normal para mostrar al abrir (por ejemplo, que la cuenta se borró). */
  confirmacionInicial?: string | null;
  alIniciarConCorreo: (correo: string, contrasena: string) => Promise<ResultadoAcceso>;
  alRegistrar: (nombre: string, correo: string, contrasena: string) => Promise<ResultadoAcceso>;
  /** `aceptoAviso`: si marcó la casilla antes de abrir Google (solo existe en "Crear cuenta"). */
  alEntrarConGoogle: (aceptoAviso: boolean) => Promise<ResultadoAcceso>;
  alRecuperar: (correo: string) => Promise<ResultadoAcceso>;
  /** Se abrió dentro del navegador de otra app (WhatsApp, Instagram...): ahí Google no deja entrar, y se avisa (RF-C20). */
  navegadorEmbebido?: boolean;
};

type Mensaje = { tipo: "error" | "confirmacion"; texto: string } | null;

/**
 * Pantalla sin sesión (portada del login de Bitácora AIDA v2): iniciar sesión, crear cuenta, entrar
 * con Google y recuperar la contraseña. Crear la cuenta exige marcar la casilla del aviso de privacidad.
 */
export function Acceso({ aviso, modoInicial = "login", errorInicial = null, confirmacionInicial = null, alIniciarConCorreo, alRegistrar, alEntrarConGoogle, alRecuperar, navegadorEmbebido = false }: Props) {
  const [modo, setModo] = useState<ModoAcceso>(modoInicial);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [avisoAceptado, setAvisoAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(
    errorInicial ? { tipo: "error", texto: errorInicial } : confirmacionInicial ? { tipo: "confirmacion", texto: confirmacionInicial } : null,
  );
  const [hoja, setHoja] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState<boolean | null>(null);

  const esRegistro = modo === "registro";
  const sinAceptar = esRegistro && !avisoAceptado;

  /** Corre una acción de acceso y muestra su resultado. Si sale bien, la sesión cambia sola y esta pantalla se va. */
  async function ejecutar(accion: () => Promise<ResultadoAcceso>) {
    setMensaje(null);
    setEnviando(true);
    try {
      const r = await accion();
      if (r.ok) {
        if (r.mensaje) setMensaje({ tipo: "confirmacion", texto: r.mensaje });
      } else {
        if (r.irARegistro) cambiarModo("registro");
        setMensaje({ tipo: "error", texto: r.error });
      }
    } finally {
      setEnviando(false);
    }
  }

  function cambiarModo(nuevo: ModoAcceso) {
    setModo(nuevo);
    setMensaje(null);
    setAvisoAceptado(false); // el aviso se acepta mirando la pantalla de "Crear cuenta", nunca de memoria
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const error = errorDeAcceso(modo, { nombre, correo, contrasena, avisoAceptado });
    if (error) return setMensaje({ tipo: "error", texto: error });
    void ejecutar(() => (esRegistro ? alRegistrar(nombre.trim(), correo.trim(), contrasena) : alIniciarConCorreo(correo.trim(), contrasena)));
  }

  function recuperar() {
    const error = errorDeRecuperacion(correo);
    if (error) return setMensaje({ tipo: "error", texto: error });
    void ejecutar(() => alRecuperar(correo.trim()));
  }

  return (
    <main className="aplicacion acceso">
      <div className="acceso__marca">
        <RelojArena />
        <h1 className="acceso__nombre">Arena</h1>
        <p className="acceso__frase">Tus horas, claras y tuyas</p>
      </div>

      {navegadorEmbebido && (
        <div className="seccion">
          <Aviso tipo="aviso">
            Ábrela en Chrome o Safari. Dentro de esta app, Google no deja iniciar sesión. Copia el enlace y pégalo en tu navegador.
          </Aviso>
          <div className="acciones">
            <Boton
              onClick={async () => setEnlaceCopiado(await copiarTexto(location.origin, navigator.clipboard))}
            >
              Copiar enlace
            </Boton>
          </div>
          {enlaceCopiado === true && <p className="texto-suave">Enlace copiado. Pégalo en Chrome o Safari.</p>}
          {enlaceCopiado === false && <p className="texto-suave">No se pudo copiar. Escribe esta dirección en tu navegador: {location.host}</p>}
        </div>
      )}

      <Pestanas
        elementos={[
          { id: "login", nombre: "Entrar" },
          { id: "registro", nombre: "Crear cuenta" },
        ]}
        activa={modo}
        onCambiar={cambiarModo}
        etiqueta="Entrar o crear cuenta"
      />

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <form className="formulario" onSubmit={enviar} noValidate>
        {esRegistro && (
          <Campo etiqueta="Tu nombre">
            <Entrada type="text" autoComplete="given-name" autoCapitalize="words" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
        )}
        <Campo etiqueta="Correo">
          <Entrada
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Contraseña">
          <Entrada
            type="password"
            autoComplete={esRegistro ? "new-password" : "current-password"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
        </Campo>

        {esRegistro && (
          <div className="seccion">
            <Interruptor etiqueta={aviso.textoAutorizacion} activo={avisoAceptado} onCambiar={setAvisoAceptado} />
            <Enlace onClick={() => setHoja(true)}>Leer el aviso de privacidad</Enlace>
          </div>
        )}

        <div className="acciones">
          <Boton variante="relleno" type="submit" disabled={enviando || sinAceptar}>
            {enviando ? "Un momento…" : esRegistro ? "Crear cuenta" : "Iniciar sesión"}
          </Boton>
        </div>
      </form>

      <p className="texto-suave acceso__o">o</p>
      <div className="acciones">
        <Boton disabled={enviando || sinAceptar} onClick={() => void ejecutar(() => alEntrarConGoogle(avisoAceptado))}>
          Continuar con Google
        </Boton>
      </div>

      {!esRegistro && (
        <div className="acciones acciones--fila">
          <Enlace onClick={recuperar}>¿Olvidaste tu contraseña?</Enlace>
        </div>
      )}

      <footer className="acceso__pie">
        <p className="texto-suave">Solo tú ves tus datos desde la app. Registro personal, no es una herramienta oficial de la clínica.</p>
        <Enlace onClick={() => setHoja(true)}>Aviso de privacidad</Enlace>
      </footer>
      {hoja && <HojaPrivacidad aviso={aviso} alCerrar={() => setHoja(false)} />}
    </main>
  );
}
