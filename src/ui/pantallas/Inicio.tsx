import type { Datos } from "../../almacenamiento/repositorio";
import { necesitaRespaldo } from "../../almacenamiento/respaldo";
import { cantidadProgramados, esProgramado, saldoActual, saldoCorto, saldoProyectado, textoDeSaldo, totales } from "../../dominio/banco";
import { reglasDeConfig, reglasVigentes, type ReglasGlobales } from "../../dominio/reglas";
import { minutosDeSemana } from "../../dominio/semana";
import { formatearDuracion } from "../../dominio/tiempo";
import type { ReactNode } from "react";
import { Aviso } from "../componentes/Aviso";
import { BarraAvance } from "../componentes/BarraAvance";
import { Boton } from "../componentes/Boton";
import { Enlace } from "../componentes/Enlace";
import { hoy } from "../utilidades";

type Props = {
  datos: Datos;
  alRegistrar: () => void;
  alIrARespaldo: () => void;
  /** Reglas de la clínica (nube): de ahí sale el primer día de la semana. Sin ellas, el de la configuración personal. */
  reglas?: ReglasGlobales;
  /** Aviso para instalar la app (si corresponde y no se descartó). */
  instalar?: ReactNode;
};

export function Inicio({ datos, reglas, alRegistrar, alIrARespaldo, instalar }: Props) {
  const dia = hoy();
  // Lo programado (con fecha futura) todavía no cuenta: ni en el saldo actual ni en lo prestado y pagado.
  const vigentes = datos.movimientos.filter((m) => !esProgramado(m, dia));
  const { prestado, pagado } = totales(vigentes);
  const saldo = textoDeSaldo(saldoActual(datos.movimientos, dia));
  const programados = cantidadProgramados(datos.movimientos, dia);
  const primerDia = reglasVigentes(reglas ?? reglasDeConfig(datos.config), dia).inicioSemana;
  const semana = minutosDeSemana(datos.turnos, dia, primerDia);
  const meta = datos.config.minutosSemana;

  return (
    <section className="pantalla">
      <Boton variante="relleno" onClick={alRegistrar}>
        Registrar turno
      </Boton>

      {instalar}

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

        <div className="dos-columnas">
          <div className="par">
            <span className="icono-kpi icono-kpi--prestado" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </span>
            <span className="etiqueta">Prestado</span>
            <span className="cifra cifra--media">{formatearDuracion(prestado)}</span>
          </div>
          <div className="par">
            <span className="icono-kpi icono-kpi--pagado" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </span>
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
