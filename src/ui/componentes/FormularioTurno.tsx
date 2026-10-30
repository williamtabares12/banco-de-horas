import { lineaEn24Horas } from "../../dominio/hora24";
import { useState, type FormEvent } from "react";
import { OTRO_HORARIO, plantillaElegida, validarHorarioDeTurno, valoresDePlantilla } from "../../dominio/plantillas";
import { formatearDuracion, parsearDuracion } from "../../dominio/tiempo";
import type { PlantillaTurno } from "../../dominio/tipos";
import { fechasDeTurno, type EntradaTurno } from "../../dominio/turnos";
import { aTextoHoras, hoy } from "../utilidades";
import { Aviso } from "./Aviso";
import { Boton } from "./Boton";
import { Campo, Entrada, Seleccion } from "./Campo";
import { Opciones } from "./Opciones";

type Props = {
  inicial?: EntradaTurno;
  plantillas: PlantillaTurno[];
  /** Puede lanzar un Error con el motivo; el formulario lo muestra. */
  onContinuar: (entrada: EntradaTurno) => void;
  onCancelar: () => void;
};

/**
 * Formulario de turno. En pantalla la plantilla se llama "horario" (RF16): un turno ordinario empieza con
 * "¿Qué horario hiciste?", con un botón por plantilla y "Otro horario". Elegir una plantilla rellena inicio, fin,
 * descanso y horas programadas, y esos campos quedan ocultos detrás de "Cambiar horas". Con "Otro horario" se ven
 * y hay que escribirlos, sin valores por defecto: el descanso en blanco no se toma como 0.
 */
export function FormularioTurno({ inicial, plantillas, onContinuar, onCancelar }: Props) {
  const [fecha, setFecha] = useState(inicial?.inicio.slice(0, 10) ?? hoy());
  const [horaInicio, setHoraInicio] = useState(inicial?.inicio.slice(11) ?? "");
  const [horaFin, setHoraFin] = useState(inicial?.fin.slice(11) ?? "");
  const [tipo, setTipo] = useState<EntradaTurno["tipo"]>(inicial?.tipo ?? "ordinario");
  // Sin elegir hasta que la persona toca uno. Al editar, el horario que coincide con las horas del turno.
  const [horario, setHorario] = useState<string>(inicial && inicial.tipo === "ordinario" ? plantillaElegida(inicial, plantillas) : "");
  const [verHoras, setVerHoras] = useState(false); // "Cambiar horas"
  const [descanso, setDescanso] = useState(inicial ? String(inicial.descansoMin ?? 0) : "");
  const [programadas, setProgramadas] = useState(
    inicial && inicial.tipo === "ordinario" ? aTextoHoras(inicial.minutosProgramados) : "",
  );
  const [destino, setDestino] = useState<string>(inicial?.destino ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const [error, setError] = useState("");

  const ordinario = tipo === "ordinario";
  const hayPlantilla = horario !== "" && horario !== OTRO_HORARIO;
  // Con una plantilla elegida los campos esperan detrás de "Cambiar horas"; sin horario elegido no hay nada que mostrar
  const horasVisibles = !ordinario || horario === OTRO_HORARIO || (hayPlantilla && verHoras);

  /** Elegir un horario rellena inicio, fin, descanso y programadas. Después todo se puede cambiar con "Cambiar horas". */
  function elegirHorario(id: string) {
    setHorario(id);
    setVerHoras(false);
    setError("");
    const plantilla = plantillas.find((p) => p.id === id);
    if (!plantilla) return; // "Otro horario": los campos se ven y se escriben a mano
    const v = valoresDePlantilla(plantilla);
    setHoraInicio(v.horaInicio);
    setHoraFin(v.horaFin);
    setDescanso(String(v.descansoMin));
    setProgramadas(aTextoHoras(v.minutosProgramados));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const resultado = validarHorarioDeTurno({ tipo, horario, descanso, programadas });
    if (!resultado.ok) {
      setError(resultado.mensaje);
      if (resultado.campo !== "horario") setVerHoras(true); // que se vea el campo que falla
      return;
    }
    try {
      onContinuar({
        ...fechasDeTurno(fecha, horaInicio, horaFin),
        descansoMin: resultado.descansoMin,
        minutosProgramados: resultado.minutosProgramados,
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
      {ordinario && (
        <>
          <Opciones
            etiqueta="¿Qué horario hiciste?"
            opciones={[...plantillas.map((p) => ({ id: p.id, nombre: p.nombre })), { id: OTRO_HORARIO, nombre: "Otro horario" }]}
            valor={horario}
            onCambiar={elegirHorario}
          />
          {hayPlantilla && !verHoras && (
            <div className="resumen-horario">
              <p className="texto-suave">
                {horaInicio} a {horaFin} · descanso {formatearDuracion(Number(descanso) || 0)} ·{" "}
                {formatearDuracion(parsearDuracion(programadas) ?? 0)} programadas
              </p>
              <Boton onClick={() => setVerHoras(true)}>Cambiar horas</Boton>
            </div>
          )}
        </>
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
      {horasVisibles && (
        <>
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
        </>
      )}
      {ordinario && horasVisibles && (
        <>
          <div className="dos-campos">
            <Campo etiqueta="Descanso (minutos)">
              <Entrada
                type="number"
                inputMode="numeric"
                min={0}
                step={5}
                placeholder="0 si no hubo"
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
              />
            </Campo>
          </div>
          <p className="texto-suave">
            El descanso es el almuerzo y los demás descansos que la clínica descuenta. Las horas programadas son netas,
            ya sin descanso.
          </p>
        </>
      )}
      {!ordinario && (
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
