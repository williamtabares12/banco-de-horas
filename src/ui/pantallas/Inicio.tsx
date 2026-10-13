import type { Datos } from "../../almacenamiento/repositorio";
import { saldo, saldoNegativo, totales } from "../../dominio/banco";
import { minutosDeSemana } from "../../dominio/semana";
import { formatearDuracion } from "../../dominio/tiempo";
import { hoy } from "../utilidades";

type Props = {
  datos: Datos;
  alRegistrar: () => void;
};

export function Inicio({ datos, alRegistrar }: Props) {
  const { prestado, pagado } = totales(datos.movimientos);
  const semana = minutosDeSemana(datos.turnos, hoy());
  const meta = datos.config.minutosSemana;

  return (
    <section>
      <button className="primario grande" onClick={alRegistrar}>
        Registrar turno
      </button>

      <div className="tarjeta saldo">
        <span className="etiqueta">Debo a la clínica</span>
        <strong>{formatearDuracion(saldo(datos.movimientos))}</strong>
      </div>
      {saldoNegativo(datos.movimientos) && (
        <p className="aviso" role="status">
          El saldo está en negativo. Revisa los pagos en Banco.
        </p>
      )}

      <div className="dos-columnas">
        <div className="tarjeta">
          <span className="etiqueta">Prestado</span>
          <strong>{formatearDuracion(prestado)}</strong>
        </div>
        <div className="tarjeta">
          <span className="etiqueta">Pagado</span>
          <strong>{formatearDuracion(pagado)}</strong>
        </div>
      </div>

      <div className="tarjeta">
        <div className="fila">
          <span className="etiqueta">Esta semana</span>
          <strong>
            {formatearDuracion(semana)} / {formatearDuracion(meta)}
          </strong>
        </div>
        <progress value={Math.min(semana, meta)} max={meta} aria-label="Avance de la semana" />
      </div>
    </section>
  );
}
