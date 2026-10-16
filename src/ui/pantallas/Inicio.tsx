import type { Datos } from "../../almacenamiento/repositorio";
import { necesitaRespaldo } from "../../almacenamiento/respaldo";
import { saldo, saldoNegativo, totales } from "../../dominio/banco";
import { minutosDeSemana } from "../../dominio/semana";
import { formatearDuracion } from "../../dominio/tiempo";
import { Aviso } from "../componentes/Aviso";
import { BarraAvance } from "../componentes/BarraAvance";
import { Boton } from "../componentes/Boton";
import { Enlace } from "../componentes/Enlace";
import { hoy } from "../utilidades";

type Props = {
  datos: Datos;
  alRegistrar: () => void;
  alIrARespaldo: () => void;
};

export function Inicio({ datos, alRegistrar, alIrARespaldo }: Props) {
  const { prestado, pagado } = totales(datos.movimientos);
  const semana = minutosDeSemana(datos.turnos, hoy());
  const meta = datos.config.minutosSemana;

  return (
    <section className="pantalla">
      <Boton variante="relleno" onClick={alRegistrar}>
        Registrar turno
      </Boton>

      {necesitaRespaldo(datos, hoy()) && (
        <Aviso tipo="aviso">
          Hace más de 14 días que no descargas un respaldo. Los datos viven solo en este dispositivo: si se borran los
          datos del navegador, se pierden. <Enlace onClick={alIrARespaldo}>Ir a Ajustes</Enlace>
        </Aviso>
      )}

      <div className="bloques">
        <div className="bloque bloque--realce">
          <span className="etiqueta">Debo a la clínica</span>
          <span className="cifra">{formatearDuracion(saldo(datos.movimientos))}</span>
        </div>

        {saldoNegativo(datos.movimientos) && <Aviso tipo="aviso">El saldo está en negativo. Revisa los pagos en Banco.</Aviso>}

        <div className="bloque dos-columnas">
          <div className="par">
            <span className="etiqueta">Prestado</span>
            <span className="cifra cifra--media">{formatearDuracion(prestado)}</span>
          </div>
          <div className="par">
            <span className="etiqueta">Pagado</span>
            <span className="cifra cifra--media">{formatearDuracion(pagado)}</span>
          </div>
        </div>

        <div className="bloque">
          <div className="etiqueta-valor">
            <span className="etiqueta">Esta semana</span>
            <span className="etiqueta-valor__valor">
              {formatearDuracion(semana)} / {formatearDuracion(meta)}
            </span>
          </div>
          <BarraAvance valor={semana} max={meta} etiqueta="Avance de la semana" />
        </div>
      </div>
    </section>
  );
}
