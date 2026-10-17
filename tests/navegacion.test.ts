// RF-C21 / CC19: botón atrás. Primero la pila pura (qué hay abierto y qué cierra "atrás").
import { describe, it, expect } from "vitest";
import { abrirCapa, debeSaltar, irAPestana, marcarCerrada, pestanaActual, pilaInicial, recortar } from "../src/dominio/navegacion";

describe("la pila de navegación", () => {
  it("empieza en una sola pantalla: no hay nada a dónde volver", () => {
    const p = pilaInicial("inicio");
    expect(p).toHaveLength(1);
    expect(pestanaActual(p)).toBe("inicio");
  });

  describe("pestañas", () => {
    it("cambiar de pestaña agrega una entrada, para poder volver a la anterior", () => {
      const p = irAPestana(irAPestana(pilaInicial("inicio"), "turnos"), "banco");
      expect(p).toHaveLength(3);
      expect(pestanaActual(p)).toBe("banco");
    });
    it("tocar la pestaña en la que ya estás no agrega nada", () => {
      const p = irAPestana(pilaInicial("inicio"), "inicio");
      expect(p).toHaveLength(1);
    });
    it("la pestaña actual sigue siendo la última aunque haya capas encima", () => {
      const p = abrirCapa(irAPestana(pilaInicial("inicio"), "turnos"), "formulario");
      expect(pestanaActual(p)).toBe("turnos");
    });
  });

  describe("capas (diálogos, hojas, formularios)", () => {
    it("abrir una capa la pone encima de todo", () => {
      const p = abrirCapa(pilaInicial("inicio"), "aviso");
      expect(p).toHaveLength(2);
      expect(p[1]).toEqual({ tipo: "capa", id: "aviso", abierta: true });
    });
    it("se puede marcar una capa como cerrada", () => {
      const p = marcarCerrada(abrirCapa(pilaInicial("inicio"), "aviso"), "aviso");
      expect(p[1]).toMatchObject({ tipo: "capa", id: "aviso", abierta: false });
    });
    it("si hay dos capas con el mismo nombre, se cierra la de más arriba", () => {
      let p = abrirCapa(abrirCapa(pilaInicial("inicio"), "dialogo"), "dialogo");
      p = marcarCerrada(p, "dialogo");
      expect(p[1]).toMatchObject({ abierta: true });
      expect(p[2]).toMatchObject({ abierta: false });
    });
    it("cerrar una capa que no existe no cambia nada", () => {
      const p = abrirCapa(pilaInicial("inicio"), "aviso");
      expect(marcarCerrada(p, "otra")).toEqual(p);
    });
  });

  describe("recortar: lo que pasa cuando el navegador vuelve atrás hasta cierta profundidad", () => {
    it("quita lo de más arriba y devuelve lo quitado, de arriba hacia abajo", () => {
      const p = abrirCapa(irAPestana(abrirCapa(pilaInicial("inicio"), "a"), "banco"), "b");
      const { pila, quitadas } = recortar(p, 1);
      expect(pila).toHaveLength(2);
      expect(quitadas.map((e) => (e.tipo === "capa" ? `capa:${e.id}` : `pestana:${e.id}`))).toEqual(["capa:b", "pestana:banco"]);
    });
    it("volver a la misma profundidad no quita nada", () => {
      const p = abrirCapa(pilaInicial("inicio"), "a");
      expect(recortar(p, 1)).toEqual({ pila: p, quitadas: [] });
    });
    it("nunca quita la raíz", () => {
      const p = abrirCapa(pilaInicial("inicio"), "a");
      expect(recortar(p, 0).pila).toHaveLength(1);
      expect(recortar(p, -5).pila).toHaveLength(1);
    });
    it("tras quitar la pestaña de arriba, la pestaña actual es la anterior", () => {
      const p = irAPestana(irAPestana(pilaInicial("inicio"), "turnos"), "banco");
      expect(pestanaActual(recortar(p, 1).pila)).toBe("turnos");
    });
  });

  describe("debeSaltar: entradas muertas", () => {
    it("si la cima es una capa ya cerrada, hay que seguir retrocediendo (no se debe notar un 'atrás' sin efecto)", () => {
      const p = marcarCerrada(abrirCapa(pilaInicial("inicio"), "a"), "a");
      expect(debeSaltar(p)).toBe(true);
    });
    it("una capa abierta o una pestaña no se saltan", () => {
      expect(debeSaltar(abrirCapa(pilaInicial("inicio"), "a"))).toBe(false);
      expect(debeSaltar(irAPestana(pilaInicial("inicio"), "banco"))).toBe(false);
    });
    it("la raíz nunca se salta", () => {
      expect(debeSaltar(pilaInicial("inicio"))).toBe(false);
    });
  });

  it("no modifica la pila original (es una función pura)", () => {
    const original = pilaInicial("inicio");
    abrirCapa(original, "a");
    irAPestana(original, "banco");
    expect(original).toHaveLength(1);
  });
});
