import { PASOS_IPHONE, type OpcionDeInstalacion } from "../dominio/instalacion";
import { Boton } from "./componentes/Boton";
import { Enlace } from "./componentes/Enlace";

type Props = {
  opcion: OpcionDeInstalacion;
  alInstalar: () => void;
  /** Si se da, aparece "Ahora no" para descartar el aviso. */
  alDescartar?: () => void;
};

/** Instalar la app (RF-C19): un botón en Android, la guía de tres pasos en iPhone, y nada si ya está instalada. */
export function InstalarApp({ opcion, alInstalar, alDescartar }: Props) {
  if (opcion === "ninguna") return null;
  return (
    <div className="seccion">
      <h2 className="titulo-seccion">{opcion === "guia-iphone" ? "Instálala en tu iPhone" : "Instala la app"}</h2>
      <p>
        {opcion === "guia-iphone"
          ? "Así queda en tu pantalla de inicio y abre más rápido, incluso sin internet."
          : "Queda en tu pantalla de inicio y abre más rápido, incluso sin internet."}
      </p>
      {opcion === "guia-iphone" ? (
        <ol>
          {PASOS_IPHONE.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      ) : (
        <div className="acciones">
          <Boton onClick={alInstalar}>Instalar app</Boton>
        </div>
      )}
      {alDescartar && (
        <div className="acciones acciones--fila">
          <Enlace onClick={alDescartar}>Ahora no</Enlace>
        </div>
      )}
    </div>
  );
}
