import { useState, type FormEvent } from "react";
import { motivoDe } from "../../dominio/banco";
import { parsearDuracion } from "../../dominio/tiempo";
import type { MotivoPago, MovimientoBanco } from "../../dominio/tipos";
import { aTextoHoras, ETIQUETAS_MOTIVO, ETIQUETAS_MOVIMIENTO, hoy } from "../utilidades";

export type ValoresMovimiento = {
  fecha: string;
  /** Con signo: solo el ajuste puede ser negativo (baja la deuda). */
  minutos: number;
  nota: string;
  /** Solo en pagos manuales: capacitación o reunión, u otro. */
  motivo?: MotivoPago;
};

type Props = {
  tipo: MovimientoBanco["tipo"];
  inicial?: MovimientoBanco;
  onGuardar: (valores: ValoresMovimiento) => void;
  onCancelar: () => void;
};

export function FormularioMovimiento({ tipo, inicial, onGuardar, onCancelar }: Props) {
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoy());
  const [horas, setHoras] = useState(inicial ? aTextoHoras(inicial.minutos) : "");
  const [bajaDeuda, setBajaDeuda] = useState(inicial ? inicial.minutos < 0 : false);
  const [nota, setNota] = useState(inicial?.nota ?? "");
  // Los pagos manuales llevan motivo. Al crear uno hay que elegirlo; uno viejo, sin motivo, arranca en "Otro".
  const pideMotivo = tipo === "pago" && !inicial?.turnoId;
  const [motivo, setMotivo] = useState<string>(inicial ? (motivoDe(inicial) ?? "") : "");
  const [error, setError] = useState("");
  const esCapacitacion = pideMotivo && motivo === "capacitacion_reunion";

  function enviar(e: FormEvent) {
    e.preventDefault();
    const minutos = parsearDuracion(horas);
    if (pideMotivo && motivo === "") return setError("Elige el motivo del pago.");
    if (!fecha) return setError("Falta la fecha.");
    if (minutos === null) return setError("No entiendo esas horas. Escríbelas como 4, 4:30 o 4,5.");
    if (minutos === 0) return setError("Las horas deben ser más de 0.");
    onGuardar({
      fecha,
      minutos: tipo === "ajuste" && bajaDeuda ? -minutos : minutos,
      nota,
      ...(pideMotivo ? { motivo: motivo as MotivoPago } : {}),
    });
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h3>
        {inicial ? "Editar" : "Nuevo"}: {ETIQUETAS_MOVIMIENTO[tipo].toLowerCase()}
      </h3>
      {pideMotivo && (
        <label>
          Motivo del pago
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
            <option value="" disabled>
              Elige el motivo…
            </option>
            <option value="capacitacion_reunion">{ETIQUETAS_MOTIVO.capacitacion_reunion}</option>
            <option value="otro">{ETIQUETAS_MOTIVO.otro}</option>
          </select>
        </label>
      )}
      <label>
        Fecha
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>
      <label>
        {esCapacitacion ? "Duración (horas)" : "Horas"}
        <input
          type="text"
          inputMode="decimal"
          placeholder="ej. 4 o 4:30"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          required
        />
      </label>
      {tipo === "ajuste" && (
        <label>
          El ajuste
          <select value={bajaDeuda ? "baja" : "sube"} onChange={(e) => setBajaDeuda(e.target.value === "baja")}>
            <option value="sube">Sube la deuda</option>
            <option value="baja">Baja la deuda</option>
          </select>
        </label>
      )}
      <label>
        Nota (opcional)
        <input
          type="text"
          placeholder={esCapacitacion ? "ej. nombre del evento o quién lo convocó" : "ej. quién lo autorizó"}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="botones">
        <button type="submit" className="primario">Guardar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
