import type { ReactNode } from "react";

/** Contenedor de filas: una lista sin viñetas, con líneas finas entre filas. */
export function ListaFilas({ children }: { children: ReactNode }) {
  return <ul className="lista-filas">{children}</ul>;
}

type Props = {
  /** Caption en gris, arriba. */
  fecha?: string;
  titulo: string;
  /** Líneas pequeñas debajo del título (nota, turno de origen). */
  detalle?: string[];
  /** Las horas, a la derecha. */
  valor?: string;
  /** Si se pasa, toda la fila es un botón. */
  onClick?: () => void;
  /** Acciones (editar, borrar) debajo de la fila, fuera del área tocable. */
  acciones?: ReactNode;
  /** Una acción corta a la derecha de la fila (por ejemplo "Quitar"). Solo en filas que no se tocan. */
  lado?: ReactNode;
};

export function FilaLista({ fecha, titulo, detalle, valor, onClick, acciones, lado }: Props) {
  const contenido = (
    <>
      <span className="fila-lista__texto">
        {fecha && <span className="fila-lista__fecha">{fecha}</span>}
        <span className="fila-lista__titulo">{titulo}</span>
        {detalle?.map((linea) => (
          <span className="fila-lista__detalle" key={linea}>
            {linea}
          </span>
        ))}
      </span>
      {valor && <span className="fila-lista__valor">{valor}</span>}
    </>
  );
  return (
    <li className="fila-lista">
      {onClick ? (
        <button type="button" className="fila-lista__tocable" onClick={onClick}>
          {contenido}
        </button>
      ) : (
        <div className="fila-lista__contenido">
          {contenido}
          {lado && <div className="fila-lista__lado">{lado}</div>}
        </div>
      )}
      {acciones && <div className="fila-lista__acciones">{acciones}</div>}
    </li>
  );
}
