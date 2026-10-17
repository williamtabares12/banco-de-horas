import type { AvisoPrivacidad } from "../../dominio/aviso";

/** El texto del aviso de privacidad tal como está en aviso-privacidad.md. */
export function TextoAviso({ aviso }: { aviso: AvisoPrivacidad }) {
  return (
    <>
      <h2 className="titulo-seccion">{aviso.titulo}</h2>
      {aviso.secciones.map((s) => (
        <div key={s.titulo} className="seccion">
          <h3 className="subtitulo">{s.titulo}</h3>
          {s.bloques.map((b, i) =>
            b.tipo === "parrafo" ? (
              <p key={i}>{b.texto}</p>
            ) : (
              <ul key={i}>
                {b.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </div>
      ))}
    </>
  );
}
