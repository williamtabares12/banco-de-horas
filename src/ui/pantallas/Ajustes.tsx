import { useState, type FormEvent } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { ErrorImportacion, exportarJSON, validarConfig } from "../../almacenamiento/respaldo";
import { agregarFestivo, festivosEfectivos, quitarFestivo, festivosDelAnio } from "../../dominio/festivos";
import { borrarPlantilla, duracionPlantilla, editarPlantilla, nuevaPlantilla } from "../../dominio/plantillas";
import { diaSemana, formatearDuracion, parsearDuracion } from "../../dominio/tiempo";
import type { Config, PlantillaTurno } from "../../dominio/tipos";
import { aTextoHoras, hoy, nuevoId } from "../utilidades";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

type Props = {
  datos: Datos;
  cambiar: (fn: (d: Datos) => Datos) => void;
  /** Valida y reemplaza todos los datos con el texto de un respaldo; lanza ErrorImportacion si es inválido. */
  importarTexto: (texto: string) => void;
};

export function Ajustes({ datos, cambiar, importarTexto }: Props) {
  return (
    <section>
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
    </section>
  );
}

function FormularioConfig({ config, onGuardar }: { config: Config; onGuardar: (c: Config) => void }) {
  const [semana, setSemana] = useState(aTextoHoras(config.minutosSemana));
  const [desde, setDesde] = useState(config.nocturnoDesde);
  const [hasta, setHasta] = useState(config.nocturnoHasta);
  const [desfase, setDesfase] = useState(String(config.desfaseQuincenas));
  const [extras, setExtras] = useState(config.extrasDescuentanDeuda);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

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
      <h2>Configuración</h2>
      <label>
        Horas por semana
        <input type="text" inputMode="decimal" value={semana} onChange={(e) => setSemana(e.target.value)} />
      </label>
      <label>
        La jornada nocturna empieza a las
        <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} required />
      </label>
      <label>
        La jornada nocturna termina a las
        <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
      </label>
      <label>
        Los recargos se cobran
        <select value={desfase} onChange={(e) => setDesfase(e.target.value)}>
          <option value="1">En la quincena siguiente</option>
          <option value="0">En la misma quincena</option>
        </select>
      </label>
      <label className="casilla">
        <input type="checkbox" checked={extras} onChange={(e) => setExtras(e.target.checked)} />
        Las horas extra descuentan deuda del banco
      </label>
      {mensaje && (
        <p className={mensaje.error ? "error" : "ok"} role="status">
          {mensaje.texto}
        </p>
      )}
      <button type="submit" className="primario">Guardar configuración</button>
    </form>
  );
}

type EdicionPlantilla = { plantilla?: PlantillaTurno } | null;

function Plantillas({
  plantillas,
  onCambiar,
}: {
  plantillas: PlantillaTurno[];
  onCambiar: (p: PlantillaTurno[]) => void;
}) {
  const [edicion, setEdicion] = useState<EdicionPlantilla>(null);

  function borrar(p: PlantillaTurno) {
    if (window.confirm(`¿Borrar la plantilla "${p.nombre}"? Los turnos ya guardados no cambian.`)) {
      onCambiar(borrarPlantilla(plantillas, p.id));
    }
  }

  return (
    <div className="formulario">
      <h2>Plantillas de turno</h2>
      <p className="nota">
        Atajos para registrar turnos más rápido: llenan el horario, el descanso y las horas programadas. Cambiar una
        plantilla no modifica los turnos ya guardados.
      </p>
      {plantillas.length === 0 ? (
        <p className="vacio">No hay plantillas.</p>
      ) : (
        <ul className="lista">
          {plantillas.map((p) => (
            <li key={p.id} className="tarjeta">
              <div className="fila">
                <strong>{p.nombre}</strong>
                <span>{formatearDuracion(duracionPlantilla(p) - p.descansoMin)} netas</span>
              </div>
              <p className="nota">
                {p.inicio} a {p.fin} · descanso {formatearDuracion(p.descansoMin)}
              </p>
              <div className="botones pequeno">
                <button type="button" onClick={() => setEdicion({ plantilla: p })}>Editar</button>
                <button type="button" onClick={() => borrar(p)}>Borrar</button>
              </div>
            </li>
          ))}
        </ul>
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
        <button type="button" onClick={() => setEdicion({})}>Nueva plantilla</button>
      )}
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
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h3>{inicial ? "Editar plantilla" : "Nueva plantilla"}</h3>
      <label>
        Nombre
        <input type="text" placeholder="ej. Día 8 h" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <div className="dos-columnas">
        <label>
          Hora de inicio
          <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <label>
          Hora de fin
          <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} required />
        </label>
      </div>
      <label>
        Descanso (minutos)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={5}
          value={descanso}
          onChange={(e) => setDescanso(e.target.value)}
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="botones">
        <button type="submit" className="primario">Guardar plantilla</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
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
    <div className="formulario">
      <h2>Festivos</h2>
      <label>
        Año
        <input
          type="number"
          min={2000}
          max={2100}
          value={anio}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n >= 2000 && n <= 2100) setAnio(n);
          }}
        />
      </label>
      <ul className="lista compacta">
        {efectivos.map((f) => (
          <li key={f} className="fila">
            <span>
              {etiqueta(f)}
              {!oficiales.has(f) && <span className="chip">agregado</span>}
            </span>
            <button type="button" onClick={() => onCambiar(quitarFestivo(config, f))}>Quitar</button>
          </li>
        ))}
      </ul>
      {quitados.length > 0 && (
        <>
          <h3>Quitados</h3>
          <ul className="lista compacta">
            {quitados.map((f) => (
              <li key={f} className="fila">
                <span>{etiqueta(f)}</span>
                <button type="button" onClick={() => onCambiar(agregarFestivo(config, f))}>Restaurar</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <label>
        Agregar un festivo
        <input type="date" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </label>
      <button
        type="button"
        disabled={!nueva}
        onClick={() => {
          onCambiar(agregarFestivo(config, nueva));
          setAnio(Number(nueva.slice(0, 4)));
          setNueva("");
        }}
      >
        Agregar
      </button>
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
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

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

  async function importar(archivo: File | undefined) {
    if (!archivo) return;
    if (!window.confirm("Esto reemplaza todos los datos actuales con los del archivo. ¿Seguir?")) return;
    try {
      importarTexto(await archivo.text());
      setMensaje({ texto: "Datos importados.", error: false });
    } catch (err) {
      const texto = err instanceof ErrorImportacion ? err.message : "No se pudo leer el archivo";
      setMensaje({ texto: `No se importó nada. ${texto}.`, error: true });
    }
  }

  return (
    <div className="formulario">
      <h2>Respaldo</h2>
      <p className="nota">
        Los datos viven solo en este dispositivo. Descarga un respaldo de vez en cuando.{" "}
        {datos.ultimoRespaldo ? `Último respaldo: ${datos.ultimoRespaldo}.` : "Todavía no has descargado ninguno."}
      </p>
      <button type="button" onClick={exportar}>Exportar JSON</button>
      <label>
        Importar un respaldo
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            void importar(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {mensaje && (
        <p className={mensaje.error ? "error" : "ok"} role="status">
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
