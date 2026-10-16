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
import { Boton } from "../componentes/Boton";
import { FilaLista, ListaFilas } from "../componentes/FilaLista";
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
    <section className="pantalla">
      <div className="selector-quincena">
        <Boton onClick={() => setQ(quincenaAnterior(q))} aria-label="Quincena anterior">
          ‹
        </Boton>
        <h2 className="selector-quincena__nombre">{etiquetaQuincena(q)}</h2>
        <Boton onClick={() => setQ(quincenaSiguiente(q))} aria-label="Quincena siguiente">
          ›
        </Boton>
      </div>

      <ListaFilas>
        <FilaLista titulo="Diurnas" valor={formatearDuracion(horas.diurno)} />
        <FilaLista titulo="Nocturnas" valor={formatearDuracion(horas.nocturno)} />
        <FilaLista titulo="Dominicales o festivas diurnas" valor={formatearDuracion(horas.dominicalDiurno)} />
        <FilaLista titulo="Dominicales o festivas nocturnas" valor={formatearDuracion(horas.dominicalNocturno)} />
      </ListaFilas>

      <div className="seccion">
        <p>
          <strong>Colilla:</strong> estas horas deberían aparecer en la colilla de la {etiquetaQuincena(colilla)}.
        </p>
        <p className="texto-suave">
          Compáralas con la línea de recargos de esa colilla. Una hora nocturna en domingo o festivo se cuenta aparte,
          como dominical nocturna, y no suma a las nocturnas.
        </p>
      </div>
    </section>
  );
}
