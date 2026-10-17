import { useState, type FormEvent } from "react";
import { motivoDe } from "../../dominio/banco";
import { parsearDuracion } from "../../dominio/tiempo";
import type { MotivoPago, MovimientoBanco } from "../../dominio/tipos";
import { aTextoHoras, ETIQUETAS_MOTIVO, ETIQUETAS_MOVIMIENTO, hoy } from "../utilidades";
import { Aviso } from "./Aviso";
import { Boton } from "./Boton";
import { Campo, Entrada, Seleccion } from "./Campo";

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
      <h3 className="subtitulo">
        {inicial ? "Editar" : "Nuevo"}: {ETIQUETAS_MOVIMIENTO[tipo].toLowerCase()}
      </h3>
      {pideMotivo && (
        <Campo etiqueta="Motivo del pago">
          <Seleccion value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
            <option value="" disabled>
              Elige el motivo…
            </option>
            <option value="capacitacion_reunion">{ETIQUETAS_MOTIVO.capacitacion_reunion}</option>
            <option value="otro">{ETIQUETAS_MOTIVO.otro}</option>
          </Seleccion>
        </Campo>
      )}
      <Campo etiqueta="Fecha">
        <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </Campo>
      <Campo etiqueta={esCapacitacion ? "Duración (horas)" : "Horas"}>
        <Entrada
          type="text"
          inputMode="decimal"
          placeholder="ej. 4 o 4:30"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          required
        />
      </Campo>
      {tipo === "ajuste" && (
        <Campo etiqueta="El ajuste">
          <Seleccion value={bajaDeuda ? "baja" : "sube"} onChange={(e) => setBajaDeuda(e.target.value === "baja")}>
            <option value="sube">Sube la deuda</option>
            <option value="baja">Baja la deuda</option>
          </Seleccion>
        </Campo>
      )}
      <Campo etiqueta="Nota (opcional)" ayuda="No escribas nombres ni documentos de pacientes.">
        <Entrada
          type="text"
          placeholder={esCapacitacion ? "ej. nombre del evento o quién lo convocó" : "ej. quién lo autorizó"}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="acciones">
        <Boton variante="relleno" type="submit">
          Guardar
        </Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </div>
    </form>
  );
}
