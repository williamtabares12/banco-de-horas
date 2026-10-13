import { useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { aplicarTurno, movimientoDeTurno } from "../../dominio/banco";
import { segmentar } from "../../dominio/segmentar";
import { duracionMinutos, formatearDuracion } from "../../dominio/tiempo";
import type { Turno } from "../../dominio/tipos";
import { borrarTurno, editarTurno, nuevoTurno, type EntradaTurno } from "../../dominio/turnos";
import { FormularioTurno } from "../componentes/FormularioTurno";
import { ahora, nuevoId } from "../utilidades";

type Vista =
  | { paso: "lista" }
  | { paso: "formulario"; editando?: Turno; entrada?: EntradaTurno }
  | { paso: "revisar"; editando?: Turno; entrada: EntradaTurno };

type Props = {
  datos: Datos;
  cambiar: (fn: (d: Datos) => Datos) => void;
  /** Abre el formulario de turno nuevo apenas se muestra la pantalla. */
  abrirNuevo?: boolean;
};

const hora = (fechaHora: string) => fechaHora.slice(11);

export function Turnos({ datos, cambiar, abrirNuevo }: Props) {
  const [vista, setVista] = useState<Vista>(abrirNuevo ? { paso: "formulario" } : { paso: "lista" });

  function confirmar(editando: Turno | undefined, entrada: EntradaTurno) {
    const momento = ahora();
    const turno = editando ? editarTurno(editando, entrada, momento) : nuevoTurno(entrada, momento, nuevoId());
    cambiar((d) => ({
      ...d,
      turnos: editando ? d.turnos.map((t) => (t.id === turno.id ? turno : t)) : [...d.turnos, turno],
      movimientos: aplicarTurno(d.movimientos, turno, d.config, momento, nuevoId),
    }));
    setVista({ paso: "lista" });
  }

  function borrar(t: Turno) {
    const tieneMovimiento = datos.movimientos.some((m) => m.turnoId === t.id);
    const texto =
      `¿Borrar el turno del ${t.inicio.slice(0, 10)} (${hora(t.inicio)} a ${hora(t.fin)})?` +
      (tieneMovimiento ? " También se borra su movimiento de banco, salvo que lo hayas editado a mano." : "");
    if (!window.confirm(texto)) return;
    const momento = ahora();
    cambiar((d) => ({ ...d, ...borrarTurno(d.turnos, d.movimientos, t.id, momento) }));
  }

  if (vista.paso === "formulario") {
    return (
      <section>
        <FormularioTurno
          inicial={vista.entrada ?? vista.editando}
          onContinuar={(entrada) => {
            // nuevoTurno valida; si algo está mal lanza y el formulario muestra el motivo
            nuevoTurno(entrada, "", "");
            setVista({ paso: "revisar", editando: vista.editando, entrada });
          }}
          onCancelar={() => setVista({ paso: "lista" })}
        />
      </section>
    );
  }

  if (vista.paso === "revisar") {
    return (
      <Revision
        datos={datos}
        editando={vista.editando}
        entrada={vista.entrada}
        onVolver={() => setVista({ paso: "formulario", editando: vista.editando, entrada: vista.entrada })}
        onConfirmar={() => confirmar(vista.editando, vista.entrada)}
      />
    );
  }

  const ordenados = [...datos.turnos].sort((a, b) => b.inicio.localeCompare(a.inicio));
  return (
    <section>
      <button className="primario grande" onClick={() => setVista({ paso: "formulario" })}>
        Registrar turno
      </button>
      <h2>Turnos</h2>
      {ordenados.length === 0 ? (
        <p className="vacio">Todavía no hay turnos registrados.</p>
      ) : (
        <ul className="lista">
          {ordenados.map((t) => (
            <li key={t.id} className="tarjeta">
              <div className="fila">
                <span>
                  <strong>{t.inicio.slice(0, 10)}</strong> · {hora(t.inicio)} a {hora(t.fin)}
                  <span className="chip">
                    {t.tipo === "ordinario" ? "ordinario" : `alquiler · ${t.destino === "deuda" ? "paga deuda" : "completa semana"}`}
                  </span>
                </span>
                <strong>{formatearDuracion(duracionMinutos(t.inicio, t.fin))}</strong>
              </div>
              {t.tipo === "ordinario" && (
                <p className="nota">Programadas: {formatearDuracion(t.minutosProgramados)}</p>
              )}
              {t.nota && <p className="nota">{t.nota}</p>}
              <div className="botones pequeno">
                <button onClick={() => setVista({ paso: "formulario", editando: t })}>Editar</button>
                <button onClick={() => borrar(t)}>Borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Revision(props: {
  datos: Datos;
  editando?: Turno;
  entrada: EntradaTurno;
  onVolver: () => void;
  onConfirmar: () => void;
}) {
  const { datos, editando, entrada } = props;
  const turno = editando ? editarTurno(editando, entrada, "") : nuevoTurno(entrada, "", "previo");
  const { total } = segmentar(turno.inicio, turno.fin, datos.config);
  const reales = duracionMinutos(turno.inicio, turno.fin);
  const movimiento = movimientoDeTurno(turno, datos.config);
  const editadoAMano = editando
    ? datos.movimientos.some((m) => m.turnoId === editando.id && !m.automatico)
    : false;

  let textoMovimiento: string;
  if (editadoAMano) {
    textoMovimiento = "Este turno tiene un movimiento de banco que editaste a mano. No se cambia.";
  } else if (movimiento) {
    textoMovimiento =
      movimiento.tipo === "prestamo"
        ? `Préstamo de ${formatearDuracion(movimiento.minutos)}: la deuda sube.`
        : `Pago de ${formatearDuracion(-movimiento.minutos)}: la deuda baja.`;
  } else if (turno.tipo === "ordinario" && reales > turno.minutosProgramados) {
    textoMovimiento = "Sin movimiento: las horas extra no descuentan deuda (así está en Ajustes).";
  } else {
    textoMovimiento = "Sin movimiento de banco.";
  }

  return (
    <section>
      <h2>Revisa el turno</h2>
      <div className="tarjeta">
        <p className="fila">
          <span>
            {turno.inicio.slice(0, 10)} · {hora(turno.inicio)} a {hora(turno.fin)}
          </span>
          <strong>{formatearDuracion(reales)}</strong>
        </p>
        {turno.tipo === "ordinario" && (
          <p className="nota">Programadas: {formatearDuracion(turno.minutosProgramados)}</p>
        )}
        <table className="desglose">
          <tbody>
            <tr><td>Diurnas</td><td>{formatearDuracion(total.diurno)}</td></tr>
            <tr><td>Nocturnas</td><td>{formatearDuracion(total.nocturno)}</td></tr>
            <tr><td>Dominicales o festivas diurnas</td><td>{formatearDuracion(total.dominicalDiurno)}</td></tr>
            <tr><td>Dominicales o festivas nocturnas</td><td>{formatearDuracion(total.dominicalNocturno)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="tarjeta">
        <strong>Banco:</strong> {textoMovimiento}
      </p>
      <div className="botones">
        <button className="primario" onClick={props.onConfirmar}>Confirmar</button>
        <button onClick={props.onVolver}>Volver</button>
      </div>
    </section>
  );
}
