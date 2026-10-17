import { Component, type ErrorInfo, type ReactNode } from "react";
import { Aviso } from "./componentes/Aviso";
import { Boton } from "./componentes/Boton";

/** Lo que se ve si algo falla al dibujar la app: un mensaje y una salida, nunca una pantalla en blanco. */
export function PantallaDeError({ alReintentar }: { alReintentar: () => void }) {
  return (
    <main className="aplicacion">
      <section className="pantalla">
        <Aviso tipo="error">Algo salió mal al abrir Arena. No se perdió nada: tus datos siguen guardados en tu cuenta.</Aviso>
        <div className="acciones">
          <Boton variante="relleno" onClick={alReintentar}>
            Volver a intentar
          </Boton>
        </div>
      </section>
    </main>
  );
}

type Estado = { fallo: boolean };

/** Atrapa los errores de dibujo de lo que envuelve y muestra `PantallaDeError` en vez de dejar todo en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // queda en la consola para poder diagnosticarlo
    console.error("Arena: error al dibujar la app", error, info.componentStack);
  }

  render() {
    return this.state.fallo ? <PantallaDeError alReintentar={() => location.reload()} /> : this.props.children;
  }
}
