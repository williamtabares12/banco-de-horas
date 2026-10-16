type Props = {
  etiqueta: string;
  /** Por ejemplo "application/json,.json". */
  accept?: string;
  onArchivo: (archivo: File) => void;
};

/**
 * Elegir un archivo. El campo nativo no se puede estilizar bien, así que se esconde (sigue siendo
 * accesible) y su etiqueta se ve como un botón de contorno.
 */
export function BotonArchivo({ etiqueta, accept, onArchivo }: Props) {
  return (
    <label className="boton boton--contorno archivo">
      {etiqueta}
      <input
        className="archivo__entrada"
        type="file"
        accept={accept}
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = ""; // para poder elegir otra vez el mismo archivo
          if (archivo) onArchivo(archivo);
        }}
      />
    </label>
  );
}
