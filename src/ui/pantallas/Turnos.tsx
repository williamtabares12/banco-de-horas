import { useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import { aplicarTurno, movimientoDeTurno } from "../../dominio/banco";
import type { Calculo } from "../../dominio/parametros";
import { segmentar } from "../../dominio/segmentar";
import { duracionMinutos, formatearDuracion } from "../../dominio/tiempo";
import type { Turno } from "../../dominio/tipos";
import { borrarTurno, editarTurno, minutosNetos, nuevoTurno, type EntradaTurno } from "../../dominio/turnos";
import { Boton } from "../componentes/Boton";
import { FilaLista, ListaFilas } from "../componentes/FilaLista";
import { FormularioTurno } from "../componentes/FormularioTurno";
import { useConfirmacion } from "../componentes/useConfirmacion";
import { useCapa } from "../navegacion";
import { ahora, nuevoId } from "../utilidades";

type Vista =
  | { paso: "lista" }
  | { paso: "formulario"; editando?: Turno; entrada?: EntradaTurno }
  | { paso: "revisar"; editando?: Turno; entrada: EntradaTurno };

type Props = {
  datos: Datos;
  /** Con qué se calcula (la configuración y, en la versión con cuenta, las reglas de la clínica). */
  calculo: Calculo;
  cambiar: (fn: (d: Datos) => Datos) => void;
  /** Abre el formulario de turno nuevo apenas se muestra la pantalla. */
  abrirNuevo?: boolean;
};

const hora = (fechaHora: string) => fechaHora.slice(11);

export function Turnos({ datos, calculo, cambiar, abrirNuevo }: Props) {
  const [vista, setVista] = useState<Vista>(abrirNuevo ? { paso: "formulario" } : { paso: "lista" });
  // Atrás: de la revisión vuelve al formulario, y del formulario a la lista (RF-C21)
  useCapa(vista.paso !== "lista", () => setVista({ paso: "lista" }));
  useCapa(vista.paso === "revisar", () =>
    setVista((v) => (v.paso === "revisar" ? { paso: "formulario", editando: v.editando, entrada: v.entrada } : v)),
  );
  const { dialogo, preguntar } = useConfirmacion();

  function confirmar(editando: Turno | undefined, entrada: EntradaTurno) {
    const momento = ahora();
    const turno = editando ? editarTurno(editando, entrada, momento) : nuevoTurno(entrada, momento, nuevoId());
    cambiar((d) => ({
      ...d,
      turnos: editando ? d.turnos.map((t) => (t.id === turno.id ? turno : t)) : [...d.turnos, turno],
      movimientos: aplicarTurno(d.movimientos, turno, d.config, momento, nuevoId, calculo.reglas),
    }));
    setVista({ paso: "lista" });
  }

  function borrar(t: Turno) {
    const tieneMovimiento = datos.movimientos.some((m) => m.turnoId === t.id);
    preguntar(
      {
        titulo: "¿Borrar este turno?",
        mensaje:
          `Turno del ${t.inicio.slice(0, 10)}, de ${hora(t.inicio)} a ${hora(t.fin)}.` +
          (tieneMovimiento ? " También se borra su movimiento de banco, salvo que lo hayas editado a mano." : ""),
        textoConfirmar: "Borrar",
      },
      () => {
        const momento = ahora();
        cambiar((d) => ({ ...d, ...borrarTurno(d.turnos, d.movimientos, t.id, momento) }));
      },
    );
  }

  if (vista.paso === "formulario") {
    return (
      <section className="pantalla">
        <FormularioTurno
          inicial={vista.entrada ?? vista.editando}
          plantillas={datos.config.plantillas}
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
        calculo={calculo}
        editando={vista.editando}
        entrada={vista.entrada}
        onVolver={() => setVista({ paso: "formulario", editando: vista.editando, entrada: vista.entrada })}
        onConfirmar={() => confirmar(vista.editando, vista.entrada)}
      />
    );
  }

  const ordenados = [...datos.turnos].sort((a, b) => b.inicio.localeCompare(a.inicio));

  if (ordenados.length === 0) {
    return (
      <section className="pantalla">
        <div className="vacio">
          <h2 className="titulo-seccion">Turnos</h2>
          <p className="vacio__texto">Todavía no hay turnos registrados.</p>
          <Boton variante="relleno" onClick={() => setVista({ paso: "formulario" })}>
            Registrar turno
          </Boton>
        </div>
      </section>
    );
  }

  return (
    <section className="pantalla">
      <Boton variante="relleno" onClick={() => setVista({ paso: "formulario" })}>
        Registrar turno
      </Boton>
      <div className="seccion">
        <h2 className="titulo-seccion">Turnos</h2>
        <ListaFilas>
          {ordenados.map((t) => (
            <FilaLista
              key={t.id}
              fecha={`${t.inicio.slice(0, 10)} · ${hora(t.inicio)} a ${hora(t.fin)}`}
              titulo={
                t.tipo === "ordinario"
                  ? "Ordinario"
                  : `Quirófano de alquiler · ${t.destino === "deuda" ? "paga deuda" : "completa la semana"}`
              }
              detalle={[
                ...(t.descansoMin > 0
                  ? [`De reloj: ${formatearDuracion(duracionMinutos(t.inicio, t.fin))} · descanso: ${formatearDuracion(t.descansoMin)}`]
                  : []),
                ...(t.tipo === "ordinario" ? [`Programadas: ${formatearDuracion(t.minutosProgramados)}`] : []),
                ...(t.nota ? [t.nota] : []),
              ]}
              valor={formatearDuracion(minutosNetos(t))}
              acciones={
                <>
                  <Boton onClick={() => setVista({ paso: "formulario", editando: t })}>Editar</Boton>
                  <Boton borra onClick={() => borrar(t)}>
                    Borrar
                  </Boton>
                </>
              }
            />
          ))}
        </ListaFilas>
      </div>
      {dialogo}
    </section>
  );
}

function Revision(props: {
  datos: Datos;
  calculo: Calculo;
  editando?: Turno;
  entrada: EntradaTurno;
  onVolver: () => void;
  onConfirmar: () => void;
}) {
  const { datos, calculo, editando, entrada } = props;
  const turno = editando ? editarTurno(editando, entrada, "") : nuevoTurno(entrada, "", "previo");
  const { total } = segmentar(turno.inicio, turno.fin, calculo.config, turno.descansoMin, calculo.reglas);
  const reloj = duracionMinutos(turno.inicio, turno.fin);
  const netos = minutosNetos(turno);
  const movimiento = movimientoDeTurno(turno, calculo.config, calculo.reglas);
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
  } else if (turno.tipo === "ordinario" && netos > turno.minutosProgramados) {
    textoMovimiento = `Sin movimiento: las horas extra no descuentan deuda (${calculo.reglas ? "así lo definen las reglas de la clínica" : "así está en Ajustes"}).`;
  } else {
    textoMovimiento = "Sin movimiento de banco.";
  }

  return (
    <section className="pantalla">
      <div className="seccion">
        <h2 className="titulo-seccion">Revisa el turno</h2>
        <ListaFilas>
          <FilaLista
            fecha={`${turno.inicio.slice(0, 10)} · ${hora(turno.inicio)} a ${hora(turno.fin)}`}
            titulo="Horas netas"
            detalle={[
              ...(turno.descansoMin > 0
                ? [`De reloj: ${formatearDuracion(reloj)} · descanso: ${formatearDuracion(turno.descansoMin)}`]
                : []),
              ...(turno.tipo === "ordinario" ? [`Programadas: ${formatearDuracion(turno.minutosProgramados)}`] : []),
            ]}
            valor={formatearDuracion(netos)}
          />
          <FilaLista titulo="Diurnas" valor={formatearDuracion(total.diurno)} />
          <FilaLista titulo="Nocturnas" valor={formatearDuracion(total.nocturno)} />
          <FilaLista titulo="Dominicales o festivas diurnas" valor={formatearDuracion(total.dominicalDiurno)} />
          <FilaLista titulo="Dominicales o festivas nocturnas" valor={formatearDuracion(total.dominicalNocturno)} />
          <FilaLista titulo="Banco" detalle={[textoMovimiento]} />
        </ListaFilas>
      </div>
      <div className="acciones">
        <Boton variante="relleno" onClick={props.onConfirmar}>
          Confirmar
        </Boton>
        <Boton onClick={props.onVolver}>Volver</Boton>
      </div>
    </section>
  );
}
