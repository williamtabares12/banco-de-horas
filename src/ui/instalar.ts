import { useSyncExternalStore } from "react";
import { opcionDeInstalacion, type OpcionDeInstalacion } from "../dominio/instalacion";

// Android y otros navegadores Chromium avisan (beforeinstallprompt) cuando la app se puede instalar. El aviso llega
// pronto, quizá antes de que la pantalla se dibuje, así que se escucha desde que se carga este archivo.

type EventoDeInstalacion = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let evento: EventoDeInstalacion | null = null;
let instaladaAhora = false;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // se guarda para lanzarlo cuando la persona toque el botón
    evento = e as EventoDeInstalacion;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    instaladaAhora = true;
    avisar();
  });
}

/** ¿La app se abrió desde la pantalla de inicio (instalada)? */
function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    instaladaAhora ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => void oyentes.delete(f);
};

/** Qué ofrecer para instalar la app y cómo lanzar la instalación (cuando hay botón). */
export function useInstalacion(): { opcion: OpcionDeInstalacion; instalar: () => Promise<void> } {
  const hayEvento = useSyncExternalStore(suscribir, () => evento !== null, () => false);
  const instalada = useSyncExternalStore(suscribir, estaInstalada, () => false);
  const opcion = opcionDeInstalacion({
    instalada,
    hayEventoDeInstalacion: hayEvento,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
  });
  async function instalar() {
    if (!evento) return;
    const e = evento;
    evento = null; // el navegador solo deja usarlo una vez
    avisar();
    // Es el método del aviso de instalación del navegador, no la ventana window.prompt; se llama así para no confundirlo
    // con la prueba que prohíbe las ventanas del navegador (src/ui/pantallas, tests/pantallas.test.ts)
    const { prompt: lanzar } = e;
    await lanzar.call(e);
    await e.userChoice;
  }
  return { opcion, instalar };
}
