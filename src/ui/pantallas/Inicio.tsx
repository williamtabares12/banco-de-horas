import type { Datos } from "../../almacenamiento/repositorio";
import { necesitaRespaldo } from "../../almacenamiento/respaldo";
import { cantidadProgramados, esProgramado, saldoActual, saldoCorto, saldoProyectado, textoDeSaldo, totales } from "../../dominio/banco";
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
  const dia = hoy();
  // Lo programado (con fecha futura) todavía no cuenta: ni en el saldo actual ni en lo prestado y pagado.
  const vigentes = datos.movimientos.filter((m) => !esProgramado(m, dia));
  const { prestado, pagado } = totales(vigentes);
  const saldo = textoDeSaldo(saldoActual(datos.movimientos, dia));
  const programados = cantidadProgramados(datos.movimientos, dia);
  const semana = minutosDeSemana(datos.turnos, dia);
  const meta = datos.config.minutosSemana;

  return (
    <section className="pantalla">
      <Boton variante="relleno" onClick={alRegistrar}>
        Registrar turno
      </Boton>

      {necesitaRespaldo(datos, dia) && (
        <Aviso tipo="aviso">
          Hace más de 14 días que no descargas un respaldo. Los datos viven solo en este dispositivo: si se borran los
          datos del navegador, se pierden. <Enlace onClick={alIrARespaldo}>Ir a Ajustes</Enlace>
        </Aviso>
      )}

      <div className="bloques">
        <div className="bloque bloque--realce">
          <span className="etiqueta">{saldo.etiqueta}</span>
          <span className="cifra">{saldo.duracion}</span>
        </div>

        {programados > 0 && (
          <div className="bloque">
            <div className="etiqueta-valor">
              <span className="etiqueta">Saldo proyectado</span>
              <span className="etiqueta-valor__valor">{saldoCorto(saldoProyectado(datos.movimientos))}</span>
            </div>
            <p className="texto-suave">
              Incluye {programados} programado{programados === 1 ? "" : "s"}, que todavía no cuenta{programados === 1 ? "" : "n"} en el
              saldo actual.
            </p>
          </div>
        )}

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
