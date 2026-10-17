import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { RepositorioLocal } from "./almacenamiento/local";
import type { Datos, Repositorio } from "./almacenamiento/repositorio";
import { importar } from "./almacenamiento/respaldo";
import { CONFIG_POR_DEFECTO } from "./dominio/config";
import { calculoDe, type Parametros } from "./dominio/parametros";
import { Acerca } from "./ui/nube/Acerca";
import type { ResultadoBorrado } from "./ui/nube/BorrarCuenta";
import { InstalarApp } from "./ui/InstalarApp";
import { useInstalacion } from "./ui/instalar";
import { navegacion } from "./ui/navegacion";
import { versionDeLaApp } from "./ui/version";
import { Aviso } from "./ui/componentes/Aviso";
import { Boton } from "./ui/componentes/Boton";
import { IndicadorSincronizacion } from "./ui/componentes/IndicadorSincronizacion";
import { BotonArchivo } from "./ui/componentes/BotonArchivo";
import { Pestanas } from "./ui/componentes/Pestanas";
import { useConfirmacion } from "./ui/componentes/useConfirmacion";
import { Ajustes } from "./ui/pantallas/Ajustes";
import { Banco } from "./ui/pantallas/Banco";
import { Extracto } from "./ui/pantallas/Extracto";
import { Inicio } from "./ui/pantallas/Inicio";
import { Quincena } from "./ui/pantallas/Quincena";
import { Turnos } from "./ui/pantallas/Turnos";

// La app personal guarda en este dispositivo. La versión con cuenta le pasa su propio repositorio.
const repoLocal = new RepositorioLocal(localStorage);

// Vista de componentes: solo en desarrollo (npm run dev, dirección /#componentes). No entra en el build publicado.
const Galeria = import.meta.env.DEV ? lazy(() => import("./ui/Galeria")) : null;

type Pestana = "inicio" | "turnos" | "banco" | "quincena" | "extracto" | "ajustes" | "acerca";
const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "inicio", nombre: "Inicio" },
  { id: "turnos", nombre: "Turnos" },
  { id: "banco", nombre: "Banco" },
  { id: "quincena", nombre: "Quincena" },
  { id: "extracto", nombre: "Extracto" },
  { id: "ajustes", nombre: "Ajustes" },
];

// "Acerca de" solo existe en la versión con cuenta (donde hay aviso de privacidad y a quién reportar)
const PESTANA_ACERCA = { id: "acerca" as const, nombre: "Acerca de" };

const CLAVE_INSTALAR_DESCARTADA = "arena:instalar-descartada";

type Estado = { datos: Datos } | { error: string };

function cargarInicial(repo: Repositorio): Estado {
  try {
    return { datos: repo.cargar() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron leer los datos guardados" };
  }
}

type Props = {
  repo?: Repositorio;
  /** Solo con cuenta: muestra el botón de cerrar sesión en Ajustes. */
  alCerrarSesion?: () => void;
  /** Solo con cuenta: abre el aviso de privacidad desde Ajustes. */
  alVerAviso?: () => void;
  /** Solo con cuenta: por qué no se usaron los parámetros de la clínica (null si todo está bien). */
  avisoParametros?: string | null;
  /** Solo con cuenta: las reglas de la clínica que mandan en el cálculo (hora nocturna, desfase, extras, festivos). */
  parametros?: Parametros;
  /** Solo con cuenta: true si lo último está guardado solo en este dispositivo; false si ya se sincronizó. */
  pendienteDeSincronizar?: boolean;
  /** Solo con cuenta: ofrece "Borrar mi cuenta" en Ajustes. */
  cuenta?: { proveedor: "password" | "google.com" | "otro"; alBorrar: (clave: string) => Promise<ResultadoBorrado> };
};

export default function App({ repo = repoLocal, alCerrarSesion, alVerAviso, avisoParametros = null, parametros, pendienteDeSincronizar, cuenta }: Props) {
  const [estado, setEstado] = useState<Estado>(() => cargarInicial(repo));
  const [pestana, setPestana] = useState<Pestana>("inicio");
  // El botón atrás de Android y el gesto de iPhone vuelven a la pestaña anterior (RF-C21)
  useEffect(() => {
    navegacion?.iniciar("inicio", (id) => setPestana(id as Pestana));
  }, []);
  // Instalar la app (RF-C19): en Inicio, un aviso que se puede descartar (se recuerda); en Ajustes, siempre
  const instalacion = useInstalacion();
  const [descartada, setDescartada] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_INSTALAR_DESCARTADA) === "1";
    } catch {
      return false;
    }
  });
  const descartarInstalacion = () => {
    setDescartada(true);
    try {
      localStorage.setItem(CLAVE_INSTALAR_DESCARTADA, "1");
    } catch {
      // sin almacenamiento: se oculta solo mientras la app esté abierta
    }
  };
  const irA = (id: Pestana) => {
    navegacion?.irAPestana(id);
    setPestana(id);
  };
  const [abrirTurnoNuevo, setAbrirTurnoNuevo] = useState(false);
  const [fallaGuardado, setFallaGuardado] = useState(false);
  // Con qué se calcula: la configuración y, con cuenta, las reglas de la clínica. Se recalcula solo si cambian.
  const config = "error" in estado ? null : estado.datos.config;
  const calculo = useMemo(() => (config ? calculoDe(config, parametros) : null), [config, parametros]);

  if (Galeria && location.hash === "#componentes") {
    return (
      <Suspense fallback={null}>
        <Galeria />
      </Suspense>
    );
  }

  if ("error" in estado) {
    return (
      <main className="aplicacion">
        <header className="encabezado">
          <h1 className="titulo-app">Arena</h1>
        </header>
        <PantallaError
          mensaje={estado.error}
          alImportar={(texto) => {
            importar(repo, texto);
            setEstado({ datos: repo.cargar() });
          }}
          alEmpezarDeCero={() => {
            repo.guardar({ schemaVersion: 2, config: CONFIG_POR_DEFECTO, turnos: [], movimientos: [] });
            setEstado({ datos: repo.cargar() });
          }}
        />
      </main>
    );
  }

  const { datos } = estado;

  function cambiar(fn: (d: Datos) => Datos) {
    const siguiente = fn(datos);
    try {
      repo.guardar(siguiente);
      setFallaGuardado(false);
    } catch {
      setFallaGuardado(true); // se ve en pantalla, pero no se pierde lo que acaba de hacer
    }
    setEstado({ datos: siguiente });
  }

  return (
    <main className="aplicacion">
      <header className="encabezado">
        <h1 className="titulo-app">Arena</h1>
        {pendienteDeSincronizar !== undefined && <IndicadorSincronizacion pendiente={pendienteDeSincronizar} />}
        <Pestanas
          elementos={alVerAviso ? [...PESTANAS, PESTANA_ACERCA] : PESTANAS}
          activa={pestana}
          onCambiar={(id) => {
            setAbrirTurnoNuevo(false);
            irA(id);
          }}
        />
      </header>
      {fallaGuardado && (
        <div className="pantalla">
          <Aviso tipo="error">
            No se pudo guardar en este dispositivo (¿poco espacio o navegación privada?). Descarga un respaldo en Ajustes.
          </Aviso>
        </div>
      )}
      {avisoParametros && (
        <div className="pantalla">
          <Aviso tipo="aviso">{avisoParametros}</Aviso>
        </div>
      )}
      {pestana === "inicio" && (
        <Inicio
          datos={datos}
          instalar={descartada ? undefined : <InstalarApp opcion={instalacion.opcion} alInstalar={instalacion.instalar} alDescartar={descartarInstalacion} />}
          alRegistrar={() => {
            setAbrirTurnoNuevo(true);
            irA("turnos");
          }}
          alIrARespaldo={() => irA("ajustes")}
        />
      )}
      {pestana === "turnos" && <Turnos datos={datos} calculo={calculo!} cambiar={cambiar} abrirNuevo={abrirTurnoNuevo} />}
      {pestana === "banco" && <Banco datos={datos} cambiar={cambiar} />}
      {pestana === "quincena" && <Quincena datos={datos} calculo={calculo!} />}
      {pestana === "extracto" && <Extracto datos={datos} alIrABanco={() => irA("banco")} />}
      {pestana === "acerca" && alVerAviso && <Acerca {...versionDeLaApp()} alVerAviso={alVerAviso} />}
      {pestana === "ajustes" && (
        <Ajustes
          datos={datos}
          cambiar={cambiar}
          alCerrarSesion={alCerrarSesion}
          alVerAviso={alVerAviso}
          parametros={parametros}
          cuenta={cuenta}
          instalar={<InstalarApp opcion={instalacion.opcion} alInstalar={instalacion.instalar} />}
          importarTexto={(texto) => {
            importar(repo, texto);
            setEstado({ datos: repo.cargar() });
          }}
        />
      )}
    </main>
  );
}

function PantallaError(props: {
  mensaje: string;
  alImportar: (texto: string) => void;
  alEmpezarDeCero: () => void;
}) {
  const [problema, setProblema] = useState("");
  const { dialogo, preguntar } = useConfirmacion();
  return (
    <section className="pantalla">
      <Aviso tipo="error">
        Los datos guardados en este dispositivo están dañados: {props.mensaje}. No se ha borrado nada.
      </Aviso>
      <div className="acciones">
        <BotonArchivo
          etiqueta="Importar un respaldo"
          accept="application/json,.json"
          onArchivo={async (archivo) => {
            try {
              props.alImportar(await archivo.text());
            } catch (err) {
              setProblema(err instanceof Error ? err.message : "No se pudo importar");
            }
          }}
        />
        <Boton
          borra
          onClick={() =>
            preguntar(
              {
                titulo: "¿Empezar de cero?",
                mensaje: "Se borran los datos dañados de este dispositivo. Esto no se puede deshacer.",
                textoConfirmar: "Empezar de cero",
              },
              props.alEmpezarDeCero,
            )
          }
        >
          Empezar de cero
        </Boton>
      </div>
      {problema && <Aviso tipo="error">{problema}</Aviso>}
      {dialogo}
    </section>
  );
}
