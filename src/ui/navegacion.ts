import { useEffect, useId, useRef } from "react";
import { abrirCapa, debeSaltar, irAPestana, marcarCerrada, pestanaActual, pilaInicial, recortar, type Pila } from "../dominio/navegacion";

// El pegamento entre la pila de navegación (src/dominio/navegacion.ts) y el historial del navegador (RF-C21).

export interface HistorialLike {
  readonly state: unknown;
  pushState(estado: unknown, titulo: string): void;
  back(): void;
}
export interface VentanaLike {
  addEventListener(tipo: "popstate", f: (e: { state: unknown }) => void): void;
  removeEventListener(tipo: "popstate", f: (e: { state: unknown }) => void): void;
}

/**
 * Hace que el botón atrás de Android y el gesto de atrás de iPhone cierren primero lo que está encima (diálogo,
 * hoja, formulario), luego vuelvan a la pestaña anterior, y desde Inicio salgan de la app. Cada cosa que se
 * abre agrega una entrada al historial; "atrás" la quita.
 *
 * `back()` del navegador es asíncrono (avisa con `popstate` un momento después), así que las operaciones sobre
 * el historial van en una cola: las que nosotros provocamos se esperan y se ignoran, y solo las del usuario cierran cosas.
 */
export class Navegacion {
  private pila: Pila = pilaInicial("inicio");
  private cerradores = new Map<string, () => void>();
  private alCambiarPestana: (id: string) => void = () => {};
  private cola: ("empujar" | "volver")[] = [];
  private pausada = false; // esperando el popstate de un back() nuestro
  private ignorar = 0; // popstates que provocamos nosotros y no son del usuario
  private profundidad = 0; // entradas reales del historial por encima de la primera
  private base = 0; // profundidad real en la que empezó esta pila
  private readonly escucha = (e: { state: unknown }) => this.alVolver(e);

  private readonly historial: HistorialLike;
  private readonly ventana: VentanaLike;

  constructor(historial: HistorialLike, ventana: VentanaLike) {
    this.historial = historial;
    this.ventana = ventana;
    // Al recargar, el navegador conserva el historial (y su estado): se parte de donde ya estaba, no de cero
    this.profundidad = (historial.state as { arena?: number } | null)?.arena ?? 0;
    this.base = this.profundidad;
    ventana.addEventListener("popstate", this.escucha);
  }

  /** La app empieza (o vuelve a empezar, por ejemplo tras iniciar sesión) en esta pestaña. */
  iniciar(pestana: string, alCambiarPestana: (id: string) => void) {
    this.pila = pilaInicial(pestana);
    this.cerradores.clear();
    this.alCambiarPestana = alCambiarPestana;
    this.base = this.profundidad;
  }

  /** La persona tocó otra pestaña. */
  irAPestana(id: string) {
    const nueva = irAPestana(this.pila, id);
    if (nueva === this.pila) return;
    this.pila = nueva;
    this.encolar("empujar");
  }

  /** Se abrió algo encima (un diálogo, una hoja, un formulario). `cerrar` se llama si el usuario toca atrás. */
  abrirCapa(id: string, cerrar: () => void) {
    this.pila = abrirCapa(this.pila, id);
    this.cerradores.set(id, cerrar);
    this.encolar("empujar");
  }

  /** La interfaz cerró esa capa por su cuenta (Cancelar, Guardar...): se quita su entrada del historial. */
  cerrarCapa(id: string) {
    this.cerradores.delete(id);
    const nueva = marcarCerrada(this.pila, id);
    if (nueva === this.pila) return;
    this.pila = nueva;
    this.saltarMuertas();
    this.procesar();
  }

  destruir() {
    this.ventana.removeEventListener("popstate", this.escucha);
  }

  private encolar(op: "empujar" | "volver") {
    this.cola.push(op);
    this.procesar();
  }

  /** Quita de la cima las capas que ya se cerraron: su entrada del historial ya no sirve para nada. */
  private saltarMuertas() {
    while (debeSaltar(this.pila)) {
      this.pila = this.pila.slice(0, -1);
      this.cola.push("volver");
    }
  }

  private procesar() {
    while (!this.pausada && this.cola.length > 0) {
      const op = this.cola.shift()!;
      if (op === "empujar") {
        this.profundidad++;
        this.historial.pushState({ arena: this.profundidad }, "");
      } else {
        this.ignorar++;
        this.pausada = true; // sigue cuando llegue su popstate
        this.historial.back();
      }
    }
  }

  private alVolver(e: { state: unknown }) {
    const real = (e.state as { arena?: number } | null)?.arena ?? 0;
    this.profundidad = real;
    if (this.ignorar > 0) {
      // el aviso de un back() que provocamos nosotros: seguir con lo pendiente
      this.ignorar--;
      this.pausada = false;
      this.procesar();
      return;
    }
    // el usuario tocó atrás
    const profundidadDeLaPila = real - this.base;
    if (profundidadDeLaPila < 0) return;
    const { pila, quitadas } = recortar(this.pila, profundidadDeLaPila);
    this.pila = pila;
    for (const q of quitadas) {
      if (q.tipo === "capa" && q.abierta) {
        const cerrar = this.cerradores.get(q.id);
        this.cerradores.delete(q.id);
        cerrar?.();
      }
    }
    if (quitadas.some((q) => q.tipo === "pestana")) this.alCambiarPestana(pestanaActual(this.pila));
    this.saltarMuertas();
    this.procesar();
  }
}

/** La navegación de la app (no existe fuera del navegador, por ejemplo en las pruebas). */
export const navegacion: Navegacion | null = typeof window === "undefined" ? null : new Navegacion(window.history, window);

/**
 * Mientras `abierta` sea verdadera, el botón atrás cierra esto (llamando a `alCerrar`) antes de salir de la pantalla.
 * Úsalo en diálogos, hojas y formularios.
 */
export function useCapa(abierta: boolean, alCerrar: () => void) {
  const id = useId();
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;
  useEffect(() => {
    if (!abierta || !navegacion) return;
    navegacion.abrirCapa(id, () => cerrar.current());
    return () => navegacion?.cerrarCapa(id);
  }, [abierta, id]);
}
