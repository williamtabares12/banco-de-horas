import { useEffect, useMemo, useState } from "react";
import avisoMarkdown from "../../../aviso-privacidad.md?raw";
import { RepositorioFirestore } from "../../almacenamiento/firestore";
import {
  cerrarSesion,
  escucharSesion,
  ingresarConGoogle,
  iniciarNube,
  mensajeDeIngreso,
  type Usuario,
} from "../../almacenamiento/sesion";
import App from "../../App";
import { leerAviso } from "../../dominio/aviso";
import { crearDatosIniciales, crearPerfil } from "../../dominio/bienvenida";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { ahora, hoy, nuevoId } from "../utilidades";
import { Bienvenida } from "./Bienvenida";
import { Ingreso } from "./Ingreso";
import { NuevoAviso } from "./NuevoAviso";

// `npm run dev:emulador` usa los emuladores locales; `dev:nube` y `build:nube` usan el proyecto real.
const usarEmuladores = import.meta.env.MODE === "emulador";
const nube = iniciarNube(usarEmuladores);
const aviso = leerAviso(avisoMarkdown);

function Cargando() {
  return (
    <main className="aplicacion">
      <p className="vacio__texto">Cargando…</p>
    </main>
  );
}

/** La versión con cuenta: entrar con Google, primer ingreso y, después, la app de siempre. */
export default function AppNube() {
  const [sesion, setSesion] = useState<Usuario | null | undefined>(undefined); // undefined: todavía no se sabe
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      escucharSesion(
        nube,
        (usuario) => {
          setSesion(usuario);
          setEntrando(false);
        },
        () => {
          setSesion(null);
          setError("No se pudo comprobar tu sesión. Intenta de nuevo.");
        },
      ),
    [],
  );

  async function entrar() {
    setError(null);
    setEntrando(true);
    try {
      await ingresarConGoogle(nube, usarEmuladores);
    } catch (e) {
      setError(mensajeDeIngreso(e));
      setEntrando(false);
    }
  }

  if (sesion === undefined) return <Cargando />;
  if (sesion === null) return <Ingreso alEntrar={entrar} entrando={entrando} error={error} />;
  return <Cuenta key={sesion.uid} usuario={sesion} />;
}

function Cuenta({ usuario }: { usuario: Usuario }) {
  const repo = useMemo(() => new RepositorioFirestore(nube.db, usuario.uid), [usuario.uid]);
  const [estado, setEstado] = useState<"leyendo" | "listo" | { error: string }>("leyendo");
  const [, actualizar] = useState(0);

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
      />
    );
  }
  // Si el aviso cambió de versión, se pide aceptarlo otra vez. Solo eso: los datos no se tocan.
  if (perfil.avisoVersion !== aviso.version) {
    return <NuevoAviso aviso={aviso} alAceptar={() => repo.aceptarAviso(aviso.version, ahora())} />;
  }

  return <App repo={repo} alCerrarSesion={() => cerrarSesion(nube)} />;
}
