import { useEffect, useState } from "react";
import { SeguimientoDeEspera, TIEMPOS_DE_CARGA, fasePorTiempo, type FaseDeCarga } from "../dominio/carga";
import { Boton } from "./componentes/Boton";
import { RelojArena } from "./componentes/RelojArena";

type VisibleProps = {
  /** Pasaron más de 6 s: se añade el aviso de que está tardando. */
  demora: boolean;
  /** Si hay copia local de los datos, deja seguir sin esperar al servidor. Sin copia, no se ofrece. */
  alSeguirSinConexion?: () => void;
};

/** Lo que se ve cuando la pantalla de carga ya aparece: el reloj de arena, "Arena" y, si tarda, el aviso. */
export function CargaVisible({ demora, alSeguirSinConexion }: VisibleProps) {
  return (
    <main className="carga" role="status">
      <span className="solo-lectores">Abriendo Arena</span>
      <RelojArena decorativo />
      <p className="carga__nombre" aria-hidden="true">
        Arena
      </p>
      {demora && <p className="carga__demora">Está tardando más de lo normal. Revisa tu conexión.</p>}
      {demora && alSeguirSinConexion && <Boton onClick={alSeguirSinConexion}>Seguir sin conexión</Boton>}
    </main>
  );
}

// Una sola cuenta para todas las pantallas de carga de la app
const espera = new SeguimientoDeEspera();

/**
 * Pantalla de carga (RF-C24). No aparece si la espera es corta (menos de 300 ms), para que no parpadee;
 * pasados 6 s avisa de la demora. Nunca es un letrero de "Cargando", ni lleva barra de progreso.
 */
export function PantallaDeCarga({ alSeguirSinConexion }: { alSeguirSinConexion?: () => void }) {
  const [fase, setFase] = useState<FaseDeCarga>("oculta");

  useEffect(() => {
    // La espera se cuenta completa aunque cambie la pieza de carga: así no vuelve a quedar en blanco entre una y otra.
    const llevaEsperando = espera.empezar(performance.now());
    setFase(fasePorTiempo(llevaEsperando));
    const aparece = setTimeout(() => setFase("visible"), Math.max(0, TIEMPOS_DE_CARGA.aparece - llevaEsperando));
    const demora = setTimeout(() => setFase("demora"), Math.max(0, TIEMPOS_DE_CARGA.demora - llevaEsperando));
    return () => {
      clearTimeout(aparece);
      clearTimeout(demora);
      espera.terminar(performance.now());
    };
  }, []);

  if (fase === "oculta") return null;
  return <CargaVisible demora={fase === "demora"} alSeguirSinConexion={alSeguirSinConexion} />;
}
