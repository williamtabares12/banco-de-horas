import { useMemo, useState } from "react";
import type { Datos } from "../../almacenamiento/repositorio";
import {
  colillaDeQuincena,
  etiquetaQuincena,
  horasDeQuincena,
  quincenaAnterior,
  quincenaSiguiente,
} from "../../dominio/quincena";
import { formatearDuracion, quincenaDe } from "../../dominio/tiempo";
import { hoy } from "../utilidades";

type Props = {
  datos: Datos;
};

export function Quincena({ datos }: Props) {
  const [q, setQ] = useState(() => quincenaDe(hoy()));
  const { config, turnos } = datos;
  const horas = useMemo(() => horasDeQuincena(turnos, q, config), [turnos, q, config]);
  const colilla = colillaDeQuincena(q, config.desfaseQuincenas);

  return (
    <section>
      <div className="selector">
        <button onClick={() => setQ(quincenaAnterior(q))} aria-label="Quincena anterior">
          ‹
        </button>
        <strong>{etiquetaQuincena(q)}</strong>
        <button onClick={() => setQ(quincenaSiguiente(q))} aria-label="Quincena siguiente">
          ›
        </button>
      </div>

      <div className="tarjeta">
        <table className="desglose">
          <tbody>
            <tr><td>Diurnas</td><td>{formatearDuracion(horas.diurno)}</td></tr>
            <tr><td>Nocturnas</td><td>{formatearDuracion(horas.nocturno)}</td></tr>
            <tr><td>Dominicales o festivas diurnas</td><td>{formatearDuracion(horas.dominicalDiurno)}</td></tr>
            <tr><td>Dominicales o festivas nocturnas</td><td>{formatearDuracion(horas.dominicalNocturno)}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="tarjeta">
        <strong>Colilla:</strong> estas horas deberían aparecer en la colilla de la {etiquetaQuincena(colilla)}.
      </p>
      <p className="nota">
        Compáralas con la línea de recargos de esa colilla. Una hora nocturna en domingo o festivo se cuenta aparte,
        como dominical nocturna, y no suma a las nocturnas.
      </p>
    </section>
  );
}
