import { lazy, Suspense, useState } from "react";
import { RepositorioLocal } from "./almacenamiento/local";
import type { Datos, Repositorio } from "./almacenamiento/repositorio";
import { importar } from "./almacenamiento/respaldo";
import { CONFIG_POR_DEFECTO } from "./dominio/config";
import { Aviso } from "./ui/componentes/Aviso";
import { Boton } from "./ui/componentes/Boton";
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

type Pestana = "inicio" | "turnos" | "banco" | "quincena" | "extracto" | "ajustes";
const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "inicio", nombre: "Inicio" },
  { id: "turnos", nombre: "Turnos" },
  { id: "banco", nombre: "Banco" },
  { id: "quincena", nombre: "Quincena" },
  { id: "extracto", nombre: "Extracto" },
  { id: "ajustes", nombre: "Ajustes" },
];

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
};

export default function App({ repo = repoLocal, alCerrarSesion }: Props) {
  const [estado, setEstado] = useState<Estado>(() => cargarInicial(repo));
  const [pestana, setPestana] = useState<Pestana>("inicio");
  const [abrirTurnoNuevo, setAbrirTurnoNuevo] = useState(false);
  const [fallaGuardado, setFallaGuardado] = useState(false);

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
          <h1 className="titulo-app">Banco de horas</h1>
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
        <h1 className="titulo-app">Banco de horas</h1>
        <Pestanas
          elementos={PESTANAS}
          activa={pestana}
          onCambiar={(id) => {
            setAbrirTurnoNuevo(false);
            setPestana(id);
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
      {pestana === "inicio" && (
        <Inicio
          datos={datos}
          alRegistrar={() => {
            setAbrirTurnoNuevo(true);
            setPestana("turnos");
          }}
          alIrARespaldo={() => setPestana("ajustes")}
        />
      )}
      {pestana === "turnos" && <Turnos datos={datos} cambiar={cambiar} abrirNuevo={abrirTurnoNuevo} />}
      {pestana === "banco" && <Banco datos={datos} cambiar={cambiar} />}
      {pestana === "quincena" && <Quincena datos={datos} />}
      {pestana === "extracto" && <Extracto datos={datos} alIrABanco={() => setPestana("banco")} />}
      {pestana === "ajustes" && (
        <Ajustes
          datos={datos}
          cambiar={cambiar}
          alCerrarSesion={alCerrarSesion}
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
