import { useState, type FormEvent } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { ErrorImportacion, exportarJSON, validarConfig } from "../../almacenamiento/respaldo";
import { agregarFestivo, festivosEfectivos, quitarFestivo, festivosDelAnio } from "../../dominio/festivos";
import { borrarPlantilla, duracionPlantilla, editarPlantilla, nuevaPlantilla } from "../../dominio/plantillas";
import { diaSemana, formatearDuracion, parsearDuracion } from "../../dominio/tiempo";
import type { Config, PlantillaTurno } from "../../dominio/tipos";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { BotonArchivo } from "../componentes/BotonArchivo";
import { Campo, Entrada, Seleccion } from "../componentes/Campo";
import { Enlace } from "../componentes/Enlace";
import { FilaLista, ListaFilas } from "../componentes/FilaLista";
import { Interruptor } from "../componentes/Interruptor";
import { useConfirmacion } from "../componentes/useConfirmacion";
import { aTextoHoras, hoy, nuevoId } from "../utilidades";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

type Props = {
  datos: Datos;
  cambiar: (fn: (d: Datos) => Datos) => void;
  /** Valida y reemplaza todos los datos con el texto de un respaldo; lanza ErrorImportacion si es inválido. */
  importarTexto: (texto: string) => void;
  /** Solo en la versión con cuenta. */
  alCerrarSesion?: () => void;
};

type Mensaje = { texto: string; error: boolean } | null;

export function Ajustes({ datos, cambiar, importarTexto, alCerrarSesion }: Props) {
  return (
    <section className="pantalla">
      <FormularioConfig
        config={datos.config}
        onGuardar={(nueva) =>
          cambiar((d) => ({
            ...d,
            // los festivos y las plantillas se editan en su propia sección: no se pisan aquí
            config: {
              ...nueva,
              festivosAgregados: d.config.festivosAgregados,
              festivosQuitados: d.config.festivosQuitados,
              plantillas: d.config.plantillas,
            },
          }))
        }
      />
      <Plantillas
        plantillas={datos.config.plantillas}
        onCambiar={(plantillas) => cambiar((d) => ({ ...d, config: { ...d.config, plantillas } }))}
      />
      <Festivos config={datos.config} onCambiar={(c) => cambiar((d) => ({ ...d, config: { ...d.config, ...c } }))} />
      <Respaldo
        datos={datos}
        importarTexto={importarTexto}
        alExportar={() => cambiar((d) => ({ ...d, ultimoRespaldo: hoy() }))}
      />
      {alCerrarSesion && (
        <section className="seccion">
          <h2 className="titulo-seccion">Sesión</h2>
          <div className="acciones">
            <Boton onClick={alCerrarSesion}>Cerrar sesión</Boton>
          </div>
        </section>
      )}
    </section>
  );
}

function FormularioConfig({ config, onGuardar }: { config: Config; onGuardar: (c: Config) => void }) {
  const [semana, setSemana] = useState(aTextoHoras(config.minutosSemana));
  const [desde, setDesde] = useState(config.nocturnoDesde);
  const [hasta, setHasta] = useState(config.nocturnoHasta);
  const [desfase, setDesfase] = useState(String(config.desfaseQuincenas));
  const [extras, setExtras] = useState(config.extrasDescuentanDeuda);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const minutosSemana = parsearDuracion(semana);
    if (minutosSemana === null) return setMensaje({ texto: "No entiendo las horas semanales. Ej: 42", error: true });
    try {
      const nueva = validarConfig({
        ...config,
        minutosSemana,
        nocturnoDesde: desde,
        nocturnoHasta: hasta,
        desfaseQuincenas: Number(desfase),
        extrasDescuentanDeuda: extras,
      });
      onGuardar(nueva);
      setMensaje({ texto: "Guardado.", error: false });
    } catch (err) {
      setMensaje({ texto: err instanceof Error ? err.message : "Configuración inválida", error: true });
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2 className="titulo-seccion">Configuración</h2>
      <Campo etiqueta="Horas por semana">
        <Entrada type="text" inputMode="decimal" value={semana} onChange={(e) => setSemana(e.target.value)} />
      </Campo>
      <div className="dos-campos">
        <Campo etiqueta="La noche empieza a las">
          <Entrada type="time" value={desde} onChange={(e) => setDesde(e.target.value)} required />
        </Campo>
        <Campo etiqueta="La noche termina a las">
          <Entrada type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
        </Campo>
      </div>
      <Campo etiqueta="Los recargos se cobran">
        <Seleccion value={desfase} onChange={(e) => setDesfase(e.target.value)}>
          <option value="1">En la quincena siguiente</option>
          <option value="0">En la misma quincena</option>
        </Seleccion>
      </Campo>
      <Interruptor etiqueta="Las horas extra descuentan deuda del banco" activo={extras} onCambiar={setExtras} />
      {mensaje && <Aviso tipo={mensaje.error ? "error" : "confirmacion"}>{mensaje.texto}</Aviso>}
      <div className="acciones">
        <Boton variante="relleno" type="submit">
          Guardar configuración
        </Boton>
      </div>
    </form>
  );
}

type EdicionPlantilla = { plantilla?: PlantillaTurno } | null;

export function Plantillas({
  plantillas,
  onCambiar,
}: {
  plantillas: PlantillaTurno[];
  onCambiar: (p: PlantillaTurno[]) => void;
}) {
  const [edicion, setEdicion] = useState<EdicionPlantilla>(null);
  const { dialogo, preguntar } = useConfirmacion();

  function borrar(p: PlantillaTurno) {
    preguntar(
      {
        titulo: `¿Borrar la plantilla "${p.nombre}"?`,
        mensaje: "Los turnos ya guardados no cambian.",
        textoConfirmar: "Borrar",
      },
      () => onCambiar(borrarPlantilla(plantillas, p.id)),
    );
  }

  return (
    <div className="seccion">
      <h2 className="titulo-seccion">Plantillas de turno</h2>
      <p className="texto-suave">
        Atajos para registrar turnos más rápido: llenan el horario, el descanso y las horas programadas. Cambiar una
        plantilla no modifica los turnos ya guardados.
      </p>
      {plantillas.length === 0 ? (
        <p className="vacio__texto">No hay plantillas.</p>
      ) : (
        <ListaFilas>
          {plantillas.map((p) => (
            <FilaLista
              key={p.id}
              titulo={p.nombre}
              detalle={[`${p.inicio} a ${p.fin} · descanso ${formatearDuracion(p.descansoMin)}`]}
              valor={`${formatearDuracion(duracionPlantilla(p) - p.descansoMin)} netas`}
              acciones={
                <>
                  <Boton onClick={() => setEdicion({ plantilla: p })}>Editar</Boton>
                  <Boton borra onClick={() => borrar(p)}>
                    Borrar
                  </Boton>
                </>
              }
            />
          ))}
        </ListaFilas>
      )}
      {edicion ? (
        <FormularioPlantilla
          key={edicion.plantilla?.id ?? "nueva"}
          inicial={edicion.plantilla}
          onGuardar={(entrada) => {
            const lista = edicion.plantilla
              ? plantillas.map((p) => (p.id === edicion.plantilla!.id ? editarPlantilla(p, entrada) : p))
              : [...plantillas, nuevaPlantilla(entrada, nuevoId())];
            onCambiar(lista);
            setEdicion(null);
          }}
          onCancelar={() => setEdicion(null)}
        />
      ) : (
        <div className="acciones acciones--fila">
          <Boton onClick={() => setEdicion({})}>Nueva plantilla</Boton>
        </div>
      )}
      {dialogo}
    </div>
  );
}

function FormularioPlantilla({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: PlantillaTurno;
  /** Puede lanzar un Error con el motivo; el formulario lo muestra. */
  onGuardar: (entrada: { nombre: string; inicio: string; fin: string; descansoMin: number }) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [inicio, setInicio] = useState(inicial?.inicio ?? "");
  const [fin, setFin] = useState(inicial?.fin ?? "");
  const [descanso, setDescanso] = useState(String(inicial?.descansoMin ?? 0));
  const [error, setError] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      onGuardar({ nombre, inicio, fin, descansoMin: Number(descanso.trim() === "" ? "0" : descanso) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los datos de la plantilla");
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h3 className="subtitulo">{inicial ? "Editar plantilla" : "Nueva plantilla"}</h3>
      <Campo etiqueta="Nombre">
        <Entrada type="text" placeholder="ej. Día 8 h" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </Campo>
      <div className="dos-campos">
        <Campo etiqueta="Hora de inicio">
          <Entrada type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Hora de fin">
          <Entrada type="time" value={fin} onChange={(e) => setFin(e.target.value)} required />
        </Campo>
      </div>
      <Campo etiqueta="Descanso (minutos)">
        <Entrada
          type="number"
          inputMode="numeric"
          min={0}
          step={5}
          value={descanso}
          onChange={(e) => setDescanso(e.target.value)}
        />
      </Campo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {/* El botón relleno de esta pantalla es "Guardar configuración": aquí, contorno y un enlace */}
      <div className="acciones">
        <Boton type="submit">Guardar plantilla</Boton>
        <Enlace onClick={onCancelar}>Cancelar</Enlace>
      </div>
    </form>
  );
}

function Festivos({
  config,
  onCambiar,
}: {
  config: Config;
  onCambiar: (c: Pick<Config, "festivosAgregados" | "festivosQuitados">) => void;
}) {
  const [anio, setAnio] = useState(Number(hoy().slice(0, 4)));
  const [nueva, setNueva] = useState("");
  const efectivos = festivosEfectivos(anio, config);
  const oficiales = new Set(festivosDelAnio(anio));
  const quitados = config.festivosQuitados.filter((f) => f.startsWith(`${anio}-`));

  const etiqueta = (f: string) => `${DIAS[diaSemana(f)]} ${f.slice(8)}/${f.slice(5, 7)}`;

  return (
    <div className="seccion">
      <h2 className="titulo-seccion">Festivos</h2>
      <Campo etiqueta="Año">
        <Entrada
          type="number"
          min={2000}
          max={2100}
          value={anio}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n >= 2000 && n <= 2100) setAnio(n);
          }}
        />
      </Campo>
      <ListaFilas>
        {efectivos.map((f) => (
          <FilaLista
            key={f}
            titulo={etiqueta(f)}
            detalle={oficiales.has(f) ? undefined : ["Agregado a mano"]}
            lado={<Enlace onClick={() => onCambiar(quitarFestivo(config, f))}>Quitar</Enlace>}
          />
        ))}
      </ListaFilas>
      {quitados.length > 0 && (
        <>
          <h3 className="subtitulo">Quitados</h3>
          <ListaFilas>
            {quitados.map((f) => (
              <FilaLista
                key={f}
                titulo={etiqueta(f)}
                lado={<Enlace onClick={() => onCambiar(agregarFestivo(config, f))}>Restaurar</Enlace>}
              />
            ))}
          </ListaFilas>
        </>
      )}
      <Campo etiqueta="Agregar un festivo">
        <Entrada type="date" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </Campo>
      <div className="acciones acciones--fila">
        <Boton
          disabled={!nueva}
          onClick={() => {
            onCambiar(agregarFestivo(config, nueva));
            setAnio(Number(nueva.slice(0, 4)));
            setNueva("");
          }}
        >
          Agregar
        </Boton>
      </div>
    </div>
  );
}

function Respaldo({
  datos,
  importarTexto,
  alExportar,
}: {
  datos: Datos;
  importarTexto: (t: string) => void;
  alExportar: () => void;
}) {
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const { dialogo, preguntar } = useConfirmacion();

  function exportar() {
    // la fecha del respaldo va dentro del archivo y también se recuerda en la app
    const url = URL.createObjectURL(
      new Blob([exportarJSON({ ...datos, ultimoRespaldo: hoy() })], { type: "application/json" }),
    );
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `banco-horas-${hoy()}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
    alExportar();
    setMensaje({ texto: "Respaldo descargado.", error: false });
  }

  async function importar(archivo: File) {
    try {
      importarTexto(await archivo.text());
      setMensaje({ texto: "Datos importados.", error: false });
    } catch (err) {
      const texto = err instanceof ErrorImportacion ? err.message : "No se pudo leer el archivo";
      setMensaje({ texto: `No se importó nada. ${texto}.`, error: true });
    }
  }

  return (
    <div className="seccion">
      <h2 className="titulo-seccion">Respaldo</h2>
      <p className="texto-suave">
        Los datos viven solo en este dispositivo. Descarga un respaldo de vez en cuando.{" "}
        {datos.ultimoRespaldo ? `Último respaldo: ${datos.ultimoRespaldo}.` : "Todavía no has descargado ninguno."}
      </p>
      <div className="acciones acciones--fila">
        <Boton onClick={exportar}>Exportar JSON</Boton>
        <BotonArchivo
          etiqueta="Importar un respaldo"
          accept="application/json,.json"
          onArchivo={(archivo) =>
            preguntar(
              {
                titulo: "¿Reemplazar los datos?",
                mensaje: "Esto reemplaza todos los datos actuales con los del archivo.",
                textoConfirmar: "Reemplazar",
              },
              () => void importar(archivo),
            )
          }
        />
      </div>
      {mensaje && <Aviso tipo={mensaje.error ? "error" : "confirmacion"}>{mensaje.texto}</Aviso>}
      {dialogo}
    </div>
  );
}
