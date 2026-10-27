import { lineaEn24Horas } from "../../dominio/hora24";
import { useState, type FormEvent } from "react";
import { valoresDePlantilla } from "../../dominio/plantillas";
import { errorDeDuracion, parsearDuracion } from "../../dominio/tiempo";
import type { PlantillaTurno } from "../../dominio/tipos";
import { fechasDeTurno, type EntradaTurno } from "../../dominio/turnos";
import { aTextoHoras, hoy } from "../utilidades";
import { Aviso } from "./Aviso";
import { Boton } from "./Boton";
import { Campo, Entrada, Seleccion } from "./Campo";

type Props = {
  inicial?: EntradaTurno;
  plantillas: PlantillaTurno[];
  /** Puede lanzar un Error con el motivo; el formulario lo muestra. */
  onContinuar: (entrada: EntradaTurno) => void;
  onCancelar: () => void;
};

export function FormularioTurno({ inicial, plantillas, onContinuar, onCancelar }: Props) {
  const [fecha, setFecha] = useState(inicial?.inicio.slice(0, 10) ?? hoy());
  const [horaInicio, setHoraInicio] = useState(inicial?.inicio.slice(11) ?? "");
  const [horaFin, setHoraFin] = useState(inicial?.fin.slice(11) ?? "");
  const [tipo, setTipo] = useState<EntradaTurno["tipo"]>(inicial?.tipo ?? "ordinario");
  const [plantillaId, setPlantillaId] = useState("");
  const [descanso, setDescanso] = useState(String(inicial?.descansoMin ?? 0));
  const [programadas, setProgramadas] = useState(
    inicial && inicial.tipo === "ordinario" ? aTextoHoras(inicial.minutosProgramados) : "",
  );
  const [destino, setDestino] = useState<string>(inicial?.destino ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const [error, setError] = useState("");

  /** Elegir una plantilla rellena inicio, fin, descanso y programadas. Después todo se puede cambiar. */
  function elegirPlantilla(id: string) {
    setPlantillaId(id);
    const plantilla = plantillas.find((p) => p.id === id);
    if (!plantilla) return;
    const v = valoresDePlantilla(plantilla);
    setHoraInicio(v.horaInicio);
    setHoraFin(v.horaFin);
    setDescanso(String(v.descansoMin));
    setProgramadas(aTextoHoras(v.minutosProgramados));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      let minutosProgramados = 0;
      let descansoMin = 0;
      if (tipo === "ordinario") {
        const m = parsearDuracion(programadas);
        if (m === null) return setError(`Horas programadas: ${errorDeDuracion(programadas)}`);
        minutosProgramados = m;
        descansoMin = Number(descanso.trim() === "" ? "0" : descanso);
      }
      onContinuar({
        ...fechasDeTurno(fecha, horaInicio, horaFin),
        descansoMin,
        minutosProgramados,
        tipo,
        destino: tipo === "alquiler" ? (destino as EntradaTurno["destino"]) : undefined,
        nota,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los datos del turno");
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2 className="titulo-seccion">{inicial ? "Editar turno" : "Registrar turno"}</h2>
      {tipo === "ordinario" && plantillas.length > 0 && (
        <Campo etiqueta="Plantilla (opcional)">
          <Seleccion value={plantillaId} onChange={(e) => elegirPlantilla(e.target.value)}>
            <option value="">Sin plantilla</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Seleccion>
        </Campo>
      )}
      <Campo etiqueta="Tipo de turno">
        <Seleccion value={tipo} onChange={(e) => setTipo(e.target.value as EntradaTurno["tipo"])}>
          <option value="ordinario">Ordinario</option>
          <option value="alquiler">Quirófano de alquiler</option>
        </Seleccion>
      </Campo>
      <Campo etiqueta="Fecha en que empieza">
        <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </Campo>
      <div className="dos-campos">
        <Campo etiqueta="Hora de inicio">
          <Entrada type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Hora de fin">
          <Entrada type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
        </Campo>
      </div>
      {lineaEn24Horas(horaInicio, horaFin) && (
        <p className="texto-suave" aria-live="polite">
          {lineaEn24Horas(horaInicio, horaFin)}
        </p>
      )}
      <p className="texto-suave">Si la hora de fin es menor o igual a la de inicio, el turno termina al día siguiente.</p>
      {tipo === "ordinario" ? (
        <>
          <div className="dos-campos">
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
            <Campo etiqueta="Horas programadas">
              <Entrada
                type="text"
                inputMode="decimal"
                placeholder="ej. 8 o 7:30"
                value={programadas}
                onChange={(e) => setProgramadas(e.target.value)}
                required
              />
            </Campo>
          </div>
          <p className="texto-suave">
            El descanso es el almuerzo y los demás descansos que la clínica descuenta. Las horas programadas son netas,
            ya sin descanso.
          </p>
        </>
      ) : (
        <Campo etiqueta="Destino de estas horas">
          <Seleccion value={destino} onChange={(e) => setDestino(e.target.value)} required>
            <option value="" disabled>
              Elige uno…
            </option>
            <option value="deuda">Pagar deuda</option>
            <option value="semana">Completar la semana</option>
          </Seleccion>
        </Campo>
      )}
      <Campo etiqueta="Nota (opcional)" ayuda="No escribas nombres ni documentos de pacientes.">
        <Entrada type="text" value={nota} onChange={(e) => setNota(e.target.value)} />
      </Campo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="acciones">
        <Boton variante="relleno" type="submit">
          Revisar
        </Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </div>
    </form>
  );
}
