import { useEffect, useRef, useState } from "react";
import { RepositorioLocal } from "./almacenamiento/local";
import type { Datos } from "./almacenamiento/repositorio";
import { importar } from "./almacenamiento/respaldo";
import { CONFIG_POR_DEFECTO } from "./dominio/config";
import { Ajustes } from "./ui/pantallas/Ajustes";
import { Banco } from "./ui/pantallas/Banco";
import { Extracto } from "./ui/pantallas/Extracto";
import { Inicio } from "./ui/pantallas/Inicio";
import { Quincena } from "./ui/pantallas/Quincena";
import { Turnos } from "./ui/pantallas/Turnos";
import "./App.css";

const repo = new RepositorioLocal(localStorage);

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

function cargarInicial(): Estado {
  try {
    return { datos: repo.cargar() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron leer los datos guardados" };
  }
}

export default function App() {
  const [estado, setEstado] = useState<Estado>(cargarInicial);
  const [pestana, setPestana] = useState<Pestana>("inicio");
  const [abrirTurnoNuevo, setAbrirTurnoNuevo] = useState(false);
  const [fallaGuardado, setFallaGuardado] = useState(false);

  // En pantallas angostas la barra de pestañas se desplaza: la pestaña activa queda siempre a la vista
  // y un degradado en el borde avisa de que hay más pestañas a ese lado.
  const barra = useRef<HTMLElement>(null);
  function marcarBordes() {
    const n = barra.current;
    if (!n) return;
    n.dataset.masIzquierda = String(n.scrollLeft > 1);
    n.dataset.masDerecha = String(n.scrollLeft + n.clientWidth < n.scrollWidth - 1);
  }
  useEffect(() => {
    document.querySelector("nav .activa")?.scrollIntoView({ inline: "center", block: "nearest" });
    marcarBordes();
    window.addEventListener("resize", marcarBordes);
    return () => window.removeEventListener("resize", marcarBordes);
  }, [pestana]);

  if ("error" in estado) {
    return (
      <main>
        <h1>Banco de horas</h1>
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
    <main>
      <h1>Banco de horas</h1>
      <nav aria-label="Secciones" ref={barra} onScroll={marcarBordes}>
        {PESTANAS.map((p) => (
          <button key={p.id} className={p.id === pestana ? "activa" : ""} onClick={() => {
              setAbrirTurnoNuevo(false);
              setPestana(p.id);
            }}>
            {p.nombre}
          </button>
        ))}
      </nav>
      {fallaGuardado && (
        <p className="error" role="alert">
          No se pudo guardar en este dispositivo (¿poco espacio o navegación privada?). Descarga un respaldo en Ajustes.
        </p>
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
      {pestana === "extracto" && <Extracto datos={datos} />}
      {pestana === "ajustes" && (
        <Ajustes
          datos={datos}
          cambiar={cambiar}
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
  return (
    <div className="formulario">
      <p className="error" role="alert">
        Los datos guardados en este dispositivo están dañados: {props.mensaje}. No se ha borrado nada.
      </p>
      <label>
        Importar un respaldo
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            if (!archivo) return;
            try {
              props.alImportar(await archivo.text());
            } catch (err) {
              setProblema(err instanceof Error ? err.message : "No se pudo importar");
            }
          }}
        />
      </label>
      {problema && <p className="error">{problema}</p>}
      <button
        onClick={() => {
          if (window.confirm("Se borran los datos dañados y empiezas de cero. ¿Seguir?")) props.alEmpezarDeCero();
        }}
      >
        Empezar de cero
      </button>
    </div>
  );
}
