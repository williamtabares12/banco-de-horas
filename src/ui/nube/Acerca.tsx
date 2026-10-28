import { DATOS_AVISO } from "../../dominio/aviso";
import { enlaceDeReporte, CORREO_REPORTES } from "../../dominio/acerca";
import { Enlace } from "../componentes/Enlace";
import { Firma } from "../componentes/Firma";

type Props = {
  version: string;
  /** Día en que se compiló la app, AAAA-MM-DD. */
  compilado: string;
  alVerAviso: () => void;
};

/** Acerca de (RF-C11): versión, aviso de privacidad, contacto, que es un registro personal y cómo reportar un problema. */
export function Acerca({ version, compilado, alVerAviso }: Props) {
  const navegador = typeof navigator === "undefined" ? "" : navigator.userAgent;

  return (
    <section className="pantalla">
      <div className="seccion">
        <h2 className="titulo-seccion">Acerca de</h2>
        <p>
          <strong>{DATOS_AVISO.nombreApp}</strong>, versión {version} ({compilado}).
        </p>
        <p>Registro personal. No es una herramienta oficial de la clínica ni reemplaza sus registros.</p>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">Tus datos</h2>
        <p>Solo tú ves tus datos desde la app. Los puedes exportar o borrar cuando quieras desde Ajustes.</p>
        <div className="acciones acciones--fila">
          <Enlace onClick={alVerAviso}>Ver el aviso de privacidad</Enlace>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">Contacto</h2>
        <p>Para ejercer tus derechos sobre tus datos o resolver una duda, escribe a:</p>
        <div className="acciones acciones--fila">
          <Enlace href={`mailto:${DATOS_AVISO.correoContacto}`}>{DATOS_AVISO.correoContacto}</Enlace>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">¿Algo no funciona?</h2>
        <p>Cuéntanos qué pasó. El correo ya lleva la versión y el navegador, para que lo podamos reproducir.</p>
        <div className="acciones">
          <a className="boton boton--contorno" href={enlaceDeReporte(version, navegador)}>
            Reportar un problema
          </a>
        </div>
        <p className="texto-suave">
          Si el celular no abre el correo, escribe a {CORREO_REPORTES}. No escribas nombres ni documentos de pacientes.
        </p>
      </div>

      <Firma version={version} />
    </section>
  );
}
