import { useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { editarMovimiento, extracto, minutosConSigno, nuevoMovimiento, saldo, saldoNegativo } from "../../dominio/banco";
import { formatearDuracion } from "../../dominio/tiempo";
import type { MovimientoBanco } from "../../dominio/tipos";
import { FormularioMovimiento, type ValoresMovimiento } from "../componentes/FormularioMovimiento";
import { ahora, ETIQUETAS_MOVIMIENTO, nuevoId } from "../utilidades";

type Tipo = MovimientoBanco["tipo"];
type Abierto = { tipo: Tipo; editando?: MovimientoBanco } | null;

type Props = {
  datos: Datos;
  cambiar: (fn: (d: Datos) => Datos) => void;
};

const conSigno = (minutos: number) => (minutos > 0 ? "+" : "") + formatearDuracion(minutos);

export function Banco({ datos, cambiar }: Props) {
  const [abierto, setAbierto] = useState<Abierto>(null);
  const movimientos = datos.movimientos;
  const hayInicial = movimientos.some((m) => m.tipo === "saldo_inicial");
  const filas = extracto(movimientos).reverse(); // lo más reciente primero

  function guardar(valores: ValoresMovimiento) {
    if (!abierto) return;
    const { tipo, editando } = abierto;
    if (editando) {
      cambiar((d) => ({
        ...d,
        movimientos: d.movimientos.map((m) =>
          m.id === editando.id
            ? editarMovimiento(
                m,
                { fecha: valores.fecha, minutos: minutosConSigno(tipo, valores.minutos), nota: valores.nota.trim() || undefined },
                ahora(),
              )
            : m,
        ),
      }));
    } else {
      const nuevo = nuevoMovimiento({ tipo, ...valores }, ahora(), nuevoId());
      cambiar((d) => ({ ...d, movimientos: [...d.movimientos, nuevo] }));
    }
    setAbierto(null);
  }

  function borrar(m: MovimientoBanco) {
    const aviso = m.automatico && m.turnoId ? " Si luego editas el turno, se vuelve a generar." : "";
    const texto = `¿Borrar este movimiento (${ETIQUETAS_MOVIMIENTO[m.tipo].toLowerCase()} del ${m.fecha}, ${conSigno(m.minutos)})?${aviso}`;
    if (window.confirm(texto)) cambiar((d) => ({ ...d, movimientos: d.movimientos.filter((x) => x.id !== m.id) }));
  }

  return (
    <section>
      <div className="tarjeta saldo">
        <span className="etiqueta">Debo a la clínica</span>
        <strong>{formatearDuracion(saldo(movimientos))}</strong>
      </div>

      {saldoNegativo(movimientos) && (
        <p className="aviso" role="status">
          El saldo quedó en negativo: has pagado {formatearDuracion(-saldo(movimientos))} más de lo que debías. Revisa
          los pagos o agrega un saldo inicial o préstamo que falte.
        </p>
      )}

      {abierto ? (
        <FormularioMovimiento
          key={abierto.editando?.id ?? abierto.tipo}
          tipo={abierto.tipo}
          inicial={abierto.editando}
          onGuardar={guardar}
          onCancelar={() => setAbierto(null)}
        />
      ) : (
        <div className="botones">
          {hayInicial ? null : <button onClick={() => setAbierto({ tipo: "saldo_inicial" })}>Saldo inicial</button>}
          <button onClick={() => setAbierto({ tipo: "prestamo" })}>Préstamo</button>
          <button onClick={() => setAbierto({ tipo: "pago" })}>Pago</button>
          <button onClick={() => setAbierto({ tipo: "ajuste" })}>Ajuste</button>
        </div>
      )}

      <h2>Movimientos</h2>
      {filas.length === 0 ? (
        <p className="vacio">Todavía no hay movimientos. Empieza con el saldo inicial.</p>
      ) : (
        <ul className="lista">
          {filas.map(({ movimiento: m, saldoDespues }) => (
            <li key={m.id} className="tarjeta">
              <div className="fila">
                <span>
                  <strong>{ETIQUETAS_MOVIMIENTO[m.tipo]}</strong> · {m.fecha}
                  {m.automatico && <span className="chip">automático</span>}
                </span>
                <strong className={m.minutos < 0 ? "baja" : "sube"}>{conSigno(m.minutos)}</strong>
              </div>
              {m.nota && <p className="nota">{m.nota}</p>}
              <div className="fila pequeno">
                <span>Saldo después: {formatearDuracion(saldoDespues)}</span>
                <span className="botones">
                  <button onClick={() => setAbierto({ tipo: m.tipo, editando: m })}>Editar</button>
                  <button onClick={() => borrar(m)}>Borrar</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
