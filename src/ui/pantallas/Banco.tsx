import { useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import {
  cantidadProgramados,
  editarMovimiento,
  esProgramado,
  extracto,
  minutosConSigno,
  nuevoMovimiento,
  saldoActual,
  saldoCorto,
  saldoProyectado,
  textoDeSaldo,
} from "../../dominio/banco";
import { formatearDuracion } from "../../dominio/tiempo";
import type { MovimientoBanco } from "../../dominio/tipos";
import { Boton } from "../componentes/Boton";
import { FilaLista, ListaFilas } from "../componentes/FilaLista";
import { FormularioMovimiento, type ValoresMovimiento } from "../componentes/FormularioMovimiento";
import { useConfirmacion } from "../componentes/useConfirmacion";
import { ahora, etiquetaMovimiento, hoy, nuevoId } from "../utilidades";

type Tipo = MovimientoBanco["tipo"];
type Abierto = { tipo: Tipo; editando?: MovimientoBanco } | null;

type Props = {
  datos: Datos;
  cambiar: (fn: (d: Datos) => Datos) => void;
};

const conSigno = (minutos: number) => (minutos > 0 ? "+" : "") + formatearDuracion(minutos);

export function Banco({ datos, cambiar }: Props) {
  const [abierto, setAbierto] = useState<Abierto>(null);
  const { dialogo, preguntar } = useConfirmacion();
  const movimientos = datos.movimientos;
  const hayInicial = movimientos.some((m) => m.tipo === "saldo_inicial");
  const filas = extracto(movimientos).reverse(); // lo más reciente primero
  const dia = hoy();
  const saldo = textoDeSaldo(saldoActual(movimientos, dia));
  const programados = cantidadProgramados(movimientos, dia);

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
                {
                  fecha: valores.fecha,
                  minutos: minutosConSigno(tipo, valores.minutos),
                  nota: valores.nota.trim() || undefined,
                  ...(valores.motivo ? { motivo: valores.motivo } : {}),
                },
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
    preguntar(
      {
        titulo: "¿Borrar este movimiento?",
        mensaje: `${etiquetaMovimiento(m)} del ${m.fecha}, ${conSigno(m.minutos)}.${aviso}`,
        textoConfirmar: "Borrar",
      },
      () => cambiar((d) => ({ ...d, movimientos: d.movimientos.filter((x) => x.id !== m.id) })),
    );
  }

  const vacio = filas.length === 0 && !abierto;

  return (
    <section className="pantalla">
      <div className="bloques">
        <div className="bloque bloque--realce">
          <span className="etiqueta">{saldo.etiqueta}</span>
          <span className="cifra">{saldo.duracion}</span>
        </div>
        {programados > 0 && (
          <div className="bloque">
            <div className="etiqueta-valor">
              <span className="etiqueta">Saldo proyectado</span>
              <span className="etiqueta-valor__valor">{saldoCorto(saldoProyectado(movimientos))}</span>
            </div>
            <p className="texto-suave">
              Incluye {programados} programado{programados === 1 ? "" : "s"}, que todavía no cuenta{programados === 1 ? "" : "n"} en el
              saldo actual.
            </p>
          </div>
        )}
      </div>

      {abierto && (
        <FormularioMovimiento
          key={abierto.editando?.id ?? abierto.tipo}
          tipo={abierto.tipo}
          inicial={abierto.editando}
          onGuardar={guardar}
          onCancelar={() => setAbierto(null)}
        />
      )}

      {vacio && (
        <div className="vacio">
          <p className="vacio__texto">Todavía no hay movimientos. Empieza con el saldo inicial.</p>
          <Boton variante="relleno" onClick={() => setAbierto({ tipo: "saldo_inicial" })}>
            Cargar saldo inicial
          </Boton>
        </div>
      )}

      {!abierto && !vacio && (
        <div className="acciones acciones--fila">
          {hayInicial ? null : <Boton onClick={() => setAbierto({ tipo: "saldo_inicial" })}>Saldo inicial</Boton>}
          <Boton onClick={() => setAbierto({ tipo: "prestamo" })}>Préstamo</Boton>
          <Boton onClick={() => setAbierto({ tipo: "pago" })}>Pago</Boton>
          <Boton onClick={() => setAbierto({ tipo: "ajuste" })}>Ajuste</Boton>
        </div>
      )}

      {filas.length > 0 && (
        <div className="seccion">
          <h2 className="titulo-seccion">Movimientos</h2>
          <ListaFilas>
            {filas.map(({ movimiento: m, saldoDespues }) => (
              <FilaLista
                key={m.id}
                fecha={m.fecha}
                titulo={etiquetaMovimiento(m)}
                detalle={[
                  ...(esProgramado(m, dia) ? ["Programado: todavía no cuenta en el saldo actual"] : []),
                  ...(m.automatico ? ["Automático, a partir de un turno"] : []),
                  ...(m.nota ? [m.nota] : []),
                  `Saldo después: ${saldoCorto(saldoDespues)}`,
                ]}
                valor={conSigno(m.minutos)}
                acciones={
                  <>
                    <Boton onClick={() => setAbierto({ tipo: m.tipo, editando: m })}>Editar</Boton>
                    <Boton borra onClick={() => borrar(m)}>
                      Borrar
                    </Boton>
                  </>
                }
              />
            ))}
          </ListaFilas>
        </div>
      )}

      {dialogo}
    </section>
  );
}
