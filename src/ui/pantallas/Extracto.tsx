import type { Datos } from "../../almacenamiento/repositorio";
import { extracto, saldo } from "../../dominio/banco";
import { formatearDuracion } from "../../dominio/tiempo";
import type { MovimientoBanco, Turno } from "../../dominio/tipos";
import { ETIQUETAS_MOVIMIENTO, hoy } from "../utilidades";

type Props = {
  datos: Datos;
};

const conSigno = (minutos: number) => (minutos > 0 ? "+" : "") + formatearDuracion(minutos);

/** Texto de apoyo de un movimiento: el turno que lo originó, si todavía existe, y la nota. */
function detalle(m: MovimientoBanco, turnos: Turno[]): string[] {
  const lineas: string[] = [];
  const turno = m.turnoId ? turnos.find((t) => t.id === m.turnoId) : undefined;
  if (turno) {
    const tipo = turno.tipo === "alquiler" ? "quirófano de alquiler" : "turno";
    lineas.push(`${tipo} del ${turno.inicio.slice(0, 10)}, ${turno.inicio.slice(11)} a ${turno.fin.slice(11)}`);
  }
  if (m.nota) lineas.push(m.nota);
  return lineas;
}

export function Extracto({ datos }: Props) {
  const filas = extracto(datos.movimientos);
  const total = saldo(datos.movimientos);

  return (
    <section className="extracto">
      <div className="fila no-imprimir">
        <h2>Extracto de horas</h2>
        <button className="primario" onClick={() => window.print()}>
          Imprimir / guardar PDF
        </button>
      </div>
      <h2 className="solo-imprimir">Extracto de horas</h2>
      <p className="nota">Generado el {hoy()}. Horas que se deben a la clínica, con el saldo después de cada movimiento.</p>

      {filas.length === 0 ? (
        <p className="vacio">Todavía no hay movimientos para mostrar.</p>
      ) : (
        <table className="tabla-extracto">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Horas</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ movimiento: m, saldoDespues }) => (
              <tr key={m.id}>
                <td>{m.fecha}</td>
                <td>
                  <strong>{ETIQUETAS_MOVIMIENTO[m.tipo]}</strong>
                  {detalle(m, datos.turnos).map((linea) => (
                    <div key={linea} className="nota">{linea}</div>
                  ))}
                </td>
                <td className="num">{conSigno(m.minutos)}</td>
                <td className="num">{formatearDuracion(saldoDespues)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Saldo actual</td>
              <td className="num">{formatearDuracion(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}
