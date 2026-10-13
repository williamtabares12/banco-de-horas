import { useState, type FormEvent } from "react";
import { parsearDuracion } from "../../dominio/tiempo";
import type { MovimientoBanco } from "../../dominio/tipos";
import { aTextoHoras, ETIQUETAS_MOVIMIENTO, hoy } from "../utilidades";

export type ValoresMovimiento = {
  fecha: string;
  /** Con signo: solo el ajuste puede ser negativo (baja la deuda). */
  minutos: number;
  nota: string;
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
  const [error, setError] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    const minutos = parsearDuracion(horas);
    if (!fecha) return setError("Falta la fecha.");
    if (minutos === null) return setError("No entiendo esas horas. Escríbelas como 4, 4:30 o 4,5.");
    if (minutos === 0) return setError("Las horas deben ser más de 0.");
    onGuardar({ fecha, minutos: tipo === "ajuste" && bajaDeuda ? -minutos : minutos, nota });
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h3>
        {inicial ? "Editar" : "Nuevo"}: {ETIQUETAS_MOVIMIENTO[tipo].toLowerCase()}
      </h3>
      <label>
        Fecha
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>
      <label>
        Horas
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
          placeholder="ej. quién lo autorizó"
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
