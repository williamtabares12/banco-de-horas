import { Aviso } from "../componentes/Aviso";
import { Boton } from "../componentes/Boton";

type Props = {
  alEntrar: () => void;
  entrando: boolean;
  error: string | null;
};

/** Pantalla de entrada: solo Google, sin contraseñas. */
export function Ingreso({ alEntrar, entrando, error }: Props) {
  return (
    <main className="aplicacion">
      <header className="encabezado">
        <h1 className="titulo-app">Banco de horas</h1>
      </header>
      <section className="pantalla">
        <div className="seccion">
          <h2 className="titulo-seccion">Entra con tu cuenta</h2>
          <p>
            Lleva tu banco de horas y tus horas nocturnas y dominicales. Tus datos son solo tuyos: nadie más los ve, y los
            puedes exportar o borrar cuando quieras.
          </p>
        </div>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div className="acciones">
          <Boton variante="relleno" onClick={alEntrar} disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar con Google"}
          </Boton>
        </div>
        <p className="texto-suave">
          Registro personal. No es una herramienta oficial de la clínica ni reemplaza sus registros.
        </p>
      </section>
    </main>
  );
}
