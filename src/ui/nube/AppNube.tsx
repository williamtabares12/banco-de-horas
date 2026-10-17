import { useEffect, useMemo, useState } from "react";
import avisoMarkdown from "../../../aviso-privacidad.md?raw";
import { RepositorioFirestore } from "../../almacenamiento/firestore";
import {
  anularRegistroGoogleSinAceptar,
  cerrarSesion,
  codigoDeError,
  enviarCorreoRecuperacion,
  escucharSesion,
  hayRedireccionPendiente,
  ingresarConGoogle,
  iniciarNube,
  iniciarSesionConCorreo,
  registrarConCorreo,
  resultadoDeRedireccion,
  type Usuario,
} from "../../almacenamiento/sesion";
import App from "../../App";
import { debeAnularse, mensajeDeErrorAcceso } from "../../dominio/acceso";
import { leerAviso } from "../../dominio/aviso";
import { crearDatosIniciales, crearPerfil } from "../../dominio/bienvenida";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { ahora, hoy, nuevoId } from "../utilidades";
import { Acceso, type ResultadoAcceso } from "./Acceso";
import { Bienvenida } from "./Bienvenida";
import { HojaPrivacidad } from "./HojaPrivacidad";
import { NuevoAviso } from "./NuevoAviso";

// `npm run dev:emulador` usa los emuladores locales; `dev:nube` y `build:nube` usan el proyecto real.
const usarEmuladores = import.meta.env.MODE === "emulador";
const nube = iniciarNube(usarEmuladores);
const aviso = leerAviso(avisoMarkdown);

const SIN_CUENTA_GOOGLE =
  "Ese correo de Google no tenía cuenta aquí todavía. Para crearla, primero acepta el aviso de privacidad.";

function Cargando() {
  return (
    <main className="aplicacion">
      <p className="vacio__texto">Cargando…</p>
    </main>
  );
}

/** Convierte un error de Firebase en el resultado que muestra la pantalla de acceso. */
function comoResultado(e: unknown): ResultadoAcceso {
  const mensaje = mensajeDeErrorAcceso(codigoDeError(e));
  return mensaje === null ? { ok: true } : { ok: false, error: mensaje };
}

const bien = (): ResultadoAcceso => ({ ok: true });

/** La versión con cuenta: acceso (correo o Google), primer ingreso y, después, la app de siempre. */
export default function AppNube() {
  const [sesion, setSesion] = useState<Usuario | null | undefined>(undefined); // undefined: todavía no se sabe
  // Mientras se decide si una cuenta de Google nueva se queda o se anula, no se debe ver la bienvenida.
  const [volviendoDeGoogle] = useState(hayRedireccionPendiente); // true solo al abrir la página tras una redirección
  const [revisandoGoogle, setRevisandoGoogle] = useState(volviendoDeGoogle);
  const [errorInicial, setErrorInicial] = useState<string | null>(null);

  useEffect(
    () =>
      escucharSesion(
        nube,
        (usuario) => setSesion(usuario),
        () => {
          setSesion(null);
          setErrorInicial("No se pudo comprobar tu sesión. Inténtalo de nuevo.");
        },
      ),
    [],
  );

  // Al volver de Google por redirección (respaldo para el iPhone): se decide lo mismo que con la ventana emergente.
  useEffect(() => {
    if (!revisandoGoogle || !volviendoDeGoogle) return;
    resultadoDeRedireccion(nube)
      .then(async (r) => {
        if (r && debeAnularse(r)) {
          await anularRegistroGoogleSinAceptar(nube);
          setErrorInicial(SIN_CUENTA_GOOGLE);
        }
      })
      .catch((e) => setErrorInicial(mensajeDeErrorAcceso(codigoDeError(e))))
      .finally(() => setRevisandoGoogle(false));
  }, [revisandoGoogle, volviendoDeGoogle]);

  async function conGoogle(aceptoAviso: boolean): Promise<ResultadoAcceso> {
    setRevisandoGoogle(true);
    try {
      const r = await ingresarConGoogle(nube, aceptoAviso, usarEmuladores);
      if (r && debeAnularse({ esNuevo: r.esNuevo, aceptoAviso })) {
        await anularRegistroGoogleSinAceptar(nube);
        return { ok: false, error: SIN_CUENTA_GOOGLE, irARegistro: true };
      }
      return bien();
    } catch (e) {
      return comoResultado(e);
    } finally {
      // con la redirección la página se va y esto no llega a verse
      setRevisandoGoogle(false);
    }
  }

  if (sesion === undefined || (revisandoGoogle && volviendoDeGoogle)) return <Cargando />;
  if (sesion === null || revisandoGoogle) {
    return (
      <Acceso
        aviso={aviso}
        modoInicial={errorInicial === SIN_CUENTA_GOOGLE ? "registro" : "login"}
        errorInicial={errorInicial}
        alIniciarConCorreo={(correo, contrasena) => iniciarSesionConCorreo(nube, correo, contrasena).then(bien, comoResultado)}
        alRegistrar={(nombre, correo, contrasena) => registrarConCorreo(nube, nombre, correo, contrasena).then(bien, comoResultado)}
        alEntrarConGoogle={conGoogle}
        alRecuperar={(correo) =>
          enviarCorreoRecuperacion(nube, correo).then(
            (): ResultadoAcceso => ({ ok: true, mensaje: "Te enviamos un correo para restablecer la contraseña." }),
            comoResultado,
          )
        }
      />
    );
  }
  return <Cuenta key={sesion.uid} usuario={sesion} />;
}

function Cuenta({ usuario }: { usuario: Usuario }) {
  const repo = useMemo(() => new RepositorioFirestore(nube.db, usuario.uid), [usuario.uid]);
  const [estado, setEstado] = useState<"leyendo" | "listo" | { error: string }>("leyendo");
  const [, actualizar] = useState(0);
  const [hoja, setHoja] = useState(false);

  useEffect(() => {
    let vivo = true;
    repo.iniciar().then(
      () => vivo && setEstado("listo"),
      (e: Error) => vivo && setEstado({ error: e.message }),
    );
    // Cambia el perfil (por ejemplo, al terminar la bienvenida): se vuelve a dibujar.
    const dejar = repo.suscribir(() => vivo && actualizar((n) => n + 1));
    return () => {
      vivo = false;
      dejar();
      repo.detener();
    };
  }, [repo]);

  if (estado === "leyendo") return <Cargando />;

  if (typeof estado === "object") {
    return (
      <main className="aplicacion">
        <header className="encabezado">
          <h1 className="titulo-app">Banco de horas</h1>
        </header>
        <section className="pantalla">
          <Aviso tipo="error">No se pudieron leer tus datos: {estado.error}. No se ha borrado nada.</Aviso>
          <div className="acciones">
            <Boton onClick={() => cerrarSesion(nube)}>Cerrar sesión</Boton>
          </div>
        </section>
      </main>
    );
  }

  const perfil = repo.perfilGuardado();
  if (!perfil) {
    return (
      <Bienvenida
        aviso={aviso}
        hoy={hoy()}
        alTerminar={async (respuestas) => {
          const momento = ahora();
          await repo.crearCuenta(crearPerfil(usuario.correo, aviso.version, momento), crearDatosIniciales(respuestas, momento, nuevoId));
          actualizar((n) => n + 1);
        }}
        alImportar={async (datos) => {
          await repo.crearCuenta(crearPerfil(usuario.correo, aviso.version, ahora()), datos);
          actualizar((n) => n + 1);
        }}
      />
    );
  }
  // Si el aviso cambió de versión, se pide aceptarlo otra vez. Solo eso: los datos no se tocan.
  if (perfil.avisoVersion !== aviso.version) {
    return <NuevoAviso aviso={aviso} alAceptar={() => repo.aceptarAviso(aviso.version, ahora())} />;
  }

  return (
    <>
      <App repo={repo} alCerrarSesion={() => cerrarSesion(nube)} alVerAviso={() => setHoja(true)} />
      {hoja && <HojaPrivacidad aviso={aviso} alCerrar={() => setHoja(false)} />}
    </>
  );
}
