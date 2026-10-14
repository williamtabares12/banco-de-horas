import { useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { saldo } from "../../dominio/banco";
import { formatearDuracion } from "../../dominio/tiempo";
import { filasExtracto } from "../extractoFilas";
import { construirExtractoPdf } from "../extractoPdf";
import { guardarPdf, puedeImprimir } from "../guardarArchivo";
import { hoy } from "../utilidades";

type Props = {
  datos: Datos;
};

export function Extracto({ datos }: Props) {
  const filas = filasExtracto(datos);
  const total = saldo(datos.movimientos);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  async function guardar() {
    setMensaje(null);
    try {
      const fecha = hoy();
      const resultado = await guardarPdf(construirExtractoPdf(datos, fecha), `extracto-horas-${fecha}.pdf`);
      if (resultado === "descargado") setMensaje({ texto: "PDF descargado.", error: false });
    } catch {
      setMensaje({ texto: "No se pudo generar el PDF. Intenta de nuevo.", error: true });
    }
  }

  return (
    <section className="extracto">
      <div className="fila no-imprimir">
        <h2>Extracto de horas</h2>
        <div className="botones">
          <button className="primario" onClick={guardar}>
            Guardar / compartir PDF
          </button>
          {puedeImprimir() && <button onClick={() => window.print()}>Imprimir</button>}
        </div>
      </div>
      {mensaje && (
        <p className={`${mensaje.error ? "error" : "ok"} no-imprimir`} role="status">
          {mensaje.texto}
        </p>
      )}
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
            {filas.map((fila) => (
              <tr key={fila.id}>
                <td>{fila.fecha}</td>
                <td>
                  <strong>{fila.tipo}</strong>
                  {fila.detalle.map((linea) => (
                    <div key={linea} className="nota">{linea}</div>
                  ))}
                </td>
                <td className="num">{fila.horas}</td>
                <td className="num">{fila.saldo}</td>
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
