import { useState, type FormEvent } from "react";
import { fechasDeTurno, type EntradaTurno } from "../../dominio/turnos";
import { parsearDuracion } from "../../dominio/tiempo";
import { aTextoHoras, hoy } from "../utilidades";

type Props = {
  inicial?: EntradaTurno;
  /** Puede lanzar un Error con el motivo; el formulario lo muestra. */
  onContinuar: (entrada: EntradaTurno) => void;
  onCancelar: () => void;
};

export function FormularioTurno({ inicial, onContinuar, onCancelar }: Props) {
  const [fecha, setFecha] = useState(inicial?.inicio.slice(0, 10) ?? hoy());
  const [horaInicio, setHoraInicio] = useState(inicial?.inicio.slice(11) ?? "");
  const [horaFin, setHoraFin] = useState(inicial?.fin.slice(11) ?? "");
  const [tipo, setTipo] = useState<EntradaTurno["tipo"]>(inicial?.tipo ?? "ordinario");
  const [programadas, setProgramadas] = useState(
    inicial && inicial.tipo === "ordinario" ? aTextoHoras(inicial.minutosProgramados) : "",
  );
  const [destino, setDestino] = useState<string>(inicial?.destino ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const [error, setError] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      let minutosProgramados = 0;
      if (tipo === "ordinario") {
        const m = parsearDuracion(programadas);
        if (m === null) return setError("No entiendo las horas programadas. Escríbelas como 8 o 7:30.");
        minutosProgramados = m;
      }
      onContinuar({
        ...fechasDeTurno(fecha, horaInicio, horaFin),
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
      <h2>{inicial ? "Editar turno" : "Registrar turno"}</h2>
      <label>
        Fecha en que empieza
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>
      <div className="dos-columnas">
        <label>
          Hora de inicio
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
        </label>
        <label>
          Hora de fin
          <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
        </label>
      </div>
      <p className="nota">Si la hora de fin es menor o igual a la de inicio, el turno termina al día siguiente.</p>
      <label>
        Tipo de turno
        <select value={tipo} onChange={(e) => setTipo(e.target.value as EntradaTurno["tipo"])}>
          <option value="ordinario">Ordinario</option>
          <option value="alquiler">Quirófano de alquiler</option>
        </select>
      </label>
      {tipo === "ordinario" ? (
        <label>
          Horas programadas
          <input
            type="text"
            inputMode="decimal"
            placeholder="ej. 8 o 7:30"
            value={programadas}
            onChange={(e) => setProgramadas(e.target.value)}
            required
          />
        </label>
      ) : (
        <label>
          Destino de estas horas
          <select value={destino} onChange={(e) => setDestino(e.target.value)} required>
            <option value="" disabled>
              Elige uno…
            </option>
            <option value="deuda">Pagar deuda</option>
            <option value="semana">Completar la semana</option>
          </select>
        </label>
      )}
      <label>
        Nota (opcional)
        <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="botones">
        <button type="submit" className="primario">Revisar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
