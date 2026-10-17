// RF-C21 / CC19: el botón atrás de verdad, contra un historial falso que imita al del navegador:
// `back()` es asíncrono y avisa con `popstate` un momento después.
import { describe, it, expect, beforeEach } from "vitest";
import { Navegacion } from "../src/ui/navegacion";

class NavegadorFalso {
  entradas: { state: unknown }[] = [{ state: null }];
  indice = 0;
  salio = false;
  private escuchas = new Set<(e: { state: unknown }) => void>();

  historial = {
    get state() {
      return undefined as unknown;
    },
    pushState: (estado: unknown) => {
      this.entradas.splice(this.indice + 1);
      this.entradas.push({ state: estado });
      this.indice++;
    },
    back: () => this.mover(-1),
  };
  ventana = {
    addEventListener: (_t: "popstate", f: (e: { state: unknown }) => void) => void this.escuchas.add(f),
    removeEventListener: (_t: "popstate", f: (e: { state: unknown }) => void) => void this.escuchas.delete(f),
  };

  constructor() {
    const yo = this;
    Object.defineProperty(this.historial, "state", { get: () => yo.entradas[yo.indice].state });
  }

  private mover(delta: number) {
    setTimeout(() => {
      const nuevo = this.indice + delta;
      if (nuevo < 0) {
        this.salio = true; // el usuario salió de la app: el navegador se va de la página
        return;
      }
      this.indice = nuevo;
      this.escuchas.forEach((f) => f({ state: this.entradas[nuevo].state }));
    }, 0);
  }

  /** El usuario toca el botón atrás o hace el gesto. */
  atras() {
    this.mover(-1);
  }
  get oyentes() {
    return this.escuchas.size;
  }
}

const asentar = () => new Promise((r) => setTimeout(r, 25));

describe("Navegacion: el botón atrás", () => {
  let nav: NavegadorFalso;
  let app: Navegacion;
  let pestanas: string[];
  let cierres: string[];

  beforeEach(() => {
    nav = new NavegadorFalso();
    pestanas = [];
    cierres = [];
    app = new Navegacion(nav.historial, nav.ventana);
    app.iniciar("inicio", (id) => pestanas.push(id));
  });

  const abrir = (id: string) => app.abrirCapa(id, () => cierres.push(id));

  it("desde Inicio, sin nada abierto, atrás sale de la app", async () => {
    nav.atras();
    await asentar();
    expect(nav.salio).toBe(true);
    expect(pestanas).toEqual([]);
    expect(cierres).toEqual([]);
  });

  describe("capas (diálogos, hojas, formularios)", () => {
    it("abrir una capa agrega una entrada al historial", () => {
      abrir("aviso");
      expect(nav.indice).toBe(1);
    });
    it("atrás cierra primero la capa, y no sale de la app", async () => {
      abrir("aviso");
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["aviso"]);
      expect(nav.salio).toBe(false);
      expect(nav.indice).toBe(0);
    });
    it("con dos capas, atrás cierra primero la de arriba y después la de abajo", async () => {
      abrir("formulario");
      abrir("revision");
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["revision"]);
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["revision", "formulario"]);
      expect(nav.indice).toBe(0);
    });
    it("si la capa se cierra con la interfaz (Cancelar), se quita su entrada y no se vuelve a cerrar", async () => {
      abrir("aviso");
      app.cerrarCapa("aviso");
      await asentar();
      expect(nav.indice).toBe(0);
      expect(cierres).toEqual([]); // la interfaz ya la cerró: no se cierra dos veces
      nav.atras();
      await asentar();
      expect(nav.salio).toBe(true); // el siguiente atrás sí sale
    });
  });

  describe("pestañas", () => {
    it("atrás vuelve a la pestaña anterior, de a una", async () => {
      app.irAPestana("turnos");
      app.irAPestana("banco");
      nav.atras();
      await asentar();
      expect(pestanas).toEqual(["turnos"]);
      nav.atras();
      await asentar();
      expect(pestanas).toEqual(["turnos", "inicio"]);
      nav.atras();
      await asentar();
      expect(nav.salio).toBe(true);
    });
    it("tocar la pestaña en la que ya estás no agrega entradas", () => {
      app.irAPestana("inicio");
      expect(nav.indice).toBe(0);
    });
    it("con un formulario abierto en una pestaña, atrás cierra el formulario y se queda en la pestaña", async () => {
      app.irAPestana("turnos");
      abrir("formulario");
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["formulario"]);
      expect(pestanas).toEqual([]); // no cambió de pestaña
      nav.atras();
      await asentar();
      expect(pestanas).toEqual(["inicio"]);
    });
  });

  describe("situaciones que se enredan fácil", () => {
    it("abrir, cerrar y volver a abrir en el mismo instante (React en desarrollo monta dos veces): queda una sola entrada abierta", async () => {
      abrir("aviso");
      app.cerrarCapa("aviso");
      abrir("aviso");
      await asentar();
      expect(nav.indice).toBe(1);
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["aviso"]);
      expect(nav.indice).toBe(0);
    });
    it("cerrar con la interfaz una capa de abajo mientras otra está encima: un solo atrás cierra la de arriba y salta la muerta", async () => {
      abrir("a");
      abrir("b");
      app.cerrarCapa("a"); // la interfaz cierra "a" (queda debajo de "b")
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["b"]);
      expect(nav.indice).toBe(0); // la entrada muerta de "a" se saltó sola
      expect(nav.salio).toBe(false);
    });
    it("cambiar de pestaña con un formulario abierto (el formulario desaparece): un solo atrás vuelve a la pestaña anterior", async () => {
      app.irAPestana("turnos");
      abrir("formulario");
      app.irAPestana("banco"); // la pestaña cambia...
      app.cerrarCapa("formulario"); // ...y el formulario se desmonta
      await asentar();
      nav.atras();
      await asentar();
      expect(pestanas).toEqual(["turnos"]);
      expect(cierres).toEqual([]);
      expect(nav.indice).toBe(1); // la entrada muerta del formulario también se saltó
    });
    it("un estado desconocido en el historial (por ejemplo, la entrada inicial) se trata como la raíz", async () => {
      abrir("aviso");
      nav.entradas[0].state = null;
      nav.atras();
      await asentar();
      expect(cierres).toEqual(["aviso"]);
    });
  });

  describe("después de recargar la página (el historial del navegador conserva su estado)", () => {
    let recargado: NavegadorFalso;
    let nueva: Navegacion;

    beforeEach(() => {
      recargado = new NavegadorFalso();
      // la persona ya había navegado dentro de la app y recargó: el historial sigue en la entrada 2
      recargado.entradas = [{ state: null }, { state: { arena: 1 } }, { state: { arena: 2 } }];
      recargado.indice = 2;
      nueva = new Navegacion(recargado.historial, recargado.ventana);
      nueva.iniciar("inicio", (id) => pestanas.push(id));
    });

    it("atrás cierra la capa abierta (no se cuenta de más)", async () => {
      nueva.abrirCapa("aviso", () => cierres.push("aviso"));
      expect(recargado.indice).toBe(3);
      recargado.atras();
      await asentar();
      expect(cierres).toEqual(["aviso"]);
      expect(recargado.indice).toBe(2);
    });
    it("cerrar la capa con la interfaz deja el historial donde estaba", async () => {
      nueva.abrirCapa("aviso", () => cierres.push("aviso"));
      nueva.cerrarCapa("aviso");
      await asentar();
      expect(recargado.indice).toBe(2);
      expect(cierres).toEqual([]);
    });
  });

  it("al destruirla, deja de escuchar el historial", () => {
    expect(nav.oyentes).toBe(1);
    app.destruir();
    expect(nav.oyentes).toBe(0);
  });
});
