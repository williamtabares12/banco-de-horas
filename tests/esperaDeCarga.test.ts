import { describe, it, expect } from "vitest";
import { SeguimientoDeEspera, TIEMPOS_DE_CARGA, fasePorTiempo } from "../src/dominio/carga";

describe("SeguimientoDeEspera: la espera es una sola aunque la pantalla de carga cambie de pieza", () => {
  it("la primera pantalla de carga empieza a contar desde cero", () => {
    const s = new SeguimientoDeEspera();
    expect(s.empezar(1000)).toBe(0);
  });

  it("si otra pantalla de carga entra enseguida (sesión resuelta, ahora los datos), sigue contando la misma espera", () => {
    const s = new SeguimientoDeEspera();
    s.empezar(1000); // resolviendo la sesión
    s.terminar(3300);
    // 50 ms después aparece la siguiente (en el mismo cambio de pantalla): ya llevaba 2,35 s esperando
    expect(s.empezar(3350)).toBe(2350);
  });

  it("así la segunda pantalla ya aparece visible, sin volver a esperar 300 ms en blanco (no hay parpadeo)", () => {
    const s = new SeguimientoDeEspera();
    s.empezar(0);
    s.terminar(2300);
    expect(fasePorTiempo(s.empezar(2330))).toBe("visible");
  });

  it("y el aviso de demora cuenta la espera completa, no cada pieza por separado", () => {
    const s = new SeguimientoDeEspera();
    s.empezar(0);
    s.terminar(4000);
    expect(fasePorTiempo(s.empezar(4020))).toBe("visible");
    s.terminar(6500);
    expect(fasePorTiempo(s.empezar(6520))).toBe("demora");
  });

  it("si pasa un buen rato sin pantalla de carga (la app ya abrió), la siguiente es una espera nueva", () => {
    const s = new SeguimientoDeEspera();
    s.empezar(0);
    s.terminar(1500);
    // 1 minuto después, por ejemplo al iniciar sesión: no debe salir "Está tardando…" de golpe
    expect(s.empezar(61_500)).toBe(0);
    expect(fasePorTiempo(0)).toBe("oculta");
  });

  it("dos pantallas de carga a la vez (React en desarrollo monta dos veces) no reinician la cuenta", () => {
    const s = new SeguimientoDeEspera();
    s.empezar(100);
    s.terminar(101);
    expect(s.empezar(102)).toBe(2);
  });

  it("el margen para considerarla la misma espera es corto", () => {
    expect(TIEMPOS_DE_CARGA.continuidad).toBeLessThanOrEqual(500);
    expect(TIEMPOS_DE_CARGA.continuidad).toBeGreaterThan(0);
  });
});
