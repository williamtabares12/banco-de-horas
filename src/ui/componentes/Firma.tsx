/**
 * Firma de autor (RF-C25): el monograma AT y "Hecho por Alejandro Tabares · v" con la versión de la app. Va al pie de
 * "Acerca de" y del inicio de sesión; nunca en el extracto ni en la pantalla de carga.
 *
 * El monograma es decorativo (`alt=""`): el texto, que es texto real y se puede seleccionar, dice todo. Se muestra
 * con <img> y no en línea porque el SVG usa ids de degradado (`g`, `ga`) que chocan si la imagen se repite en una página.
 * Se usa la variante clara; la que no lleva "-claro" es para fondos oscuros.
 */
export function Firma({ version }: { version: string }) {
  return (
    <p className="firma">
      <img className="firma__monograma" src={`${import.meta.env.BASE_URL}marca/at-monograma-claro.svg`} alt="" />
      <span>
        Hecho por <strong>Alejandro Tabares</strong> · v{version}
      </span>
    </p>
  );
}
