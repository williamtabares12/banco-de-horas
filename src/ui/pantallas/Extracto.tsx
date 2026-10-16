import { useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { saldo } from "../../dominio/banco";
import { formatearDuracion } from "../../dominio/tiempo";
import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";
import { filasExtracto } from "../extractoFilas";
import { construirExtractoPdf } from "../extractoPdf";
import { guardarPdf, puedeImprimir } from "../guardarArchivo";
import { hoy } from "../utilidades";

type Props = {
  datos: Datos;
  /** Lleva a la pantalla donde se cargan los movimientos. */
  alIrABanco: () => void;
};

export function Extracto({ datos, alIrABanco }: Props) {
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

  if (filas.length === 0) {
    return (
      <section className="pantalla">
        <div className="vacio">
          <h2 className="titulo-seccion">Extracto de horas</h2>
          <p className="vacio__texto">Todavía no hay movimientos para mostrar. Empieza cargando el saldo inicial.</p>
          <Boton variante="relleno" onClick={alIrABanco}>
            Ir a Banco
          </Boton>
        </div>
      </section>
    );
  }

  return (
    <section className="pantalla">
      <div className="seccion no-imprimir">
        <h2 className="titulo-seccion">Extracto de horas</h2>
        <div className="acciones">
          <Boton variante="relleno" onClick={guardar}>
            Guardar / compartir PDF
          </Boton>
          {puedeImprimir() && <Boton onClick={() => window.print()}>Imprimir</Boton>}
        </div>
        {mensaje && <Aviso tipo={mensaje.error ? "error" : "confirmacion"}>{mensaje.texto}</Aviso>}
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion solo-imprimir">Extracto de horas</h2>
        <p className="texto-suave">
          Generado el {hoy()}. Horas que se deben a la clínica, con el saldo después de cada movimiento.
        </p>

        <table className="tabla-extracto">
          <thead>
            <tr>
              <th>Movimiento</th>
              <th className="num">Horas</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id}>
                <td>
                  <span className="tabla-extracto__fecha">{fila.fecha}</span>
                  <span className="tabla-extracto__tipo">{fila.tipo}</span>
                  {fila.detalle.map((linea) => (
                    <span key={linea} className="tabla-extracto__detalle">
                      {linea}
                    </span>
                  ))}
                </td>
                <td className="num">{fila.horas}</td>
                <td className="num">{fila.saldo}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Saldo actual</td>
              <td className="num">{formatearDuracion(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
