// T40: datos al día entre pestañas y dispositivos (RF-C5, CC24). Hallazgo 1 de informe-qa-2026-10-27.md.
import { describe, it, expect } from "vitest";
import type { Datos, Repositorio } from "../src/almacenamiento/repositorio";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import type { MovimientoBanco } from "../src/dominio/tipos";
import { aplicarCambio, escucharDatos } from "../src/ui/datosVivos";

const mov = (id: string, minutos: number, nota?: string): MovimientoBanco => ({
  id,
  fecha: "2020-01-01",
  tipo: id === "inicial" ? "saldo_inicial" : "prestamo",
  minutos,
  automatico: false,
  ...(nota ? { nota } : {}),
  creadoEn: "2020-01-01T08:00:00",
  modificadoEn: "2020-01-01T08:00:00",
});

const datosCon = (movimientos: MovimientoBanco[]): Datos => ({ schemaVersion: 3, config: CONFIG_POR_DEFECTO, turnos: [], movimientos });

/**
 * Repositorio de prueba que se comporta como la nube: guarda lo último que tiene y avisa a quien
 * escuche. `cambioDesdeOtroDispositivo` simula lo que llega de otra pestaña o de otro celular.
 */
class RepositorioDePrueba implements Repositorio {
  guardado: Datos;
  private oyentes = new Set<(d: Datos) => void>();
  constructor(inicial: Datos) {
    this.guardado = inicial;
  }
  cargar(): Datos {
    return structuredClone(this.guardado);
  }
  guardar(datos: Datos): void {
    this.guardado = structuredClone(datos);
    this.oyentes.forEach((o) => o(this.cargar()));
  }
  suscribir(alCambiar: (d: Datos) => void): () => void {
    this.oyentes.add(alCambiar);
    return () => this.oyentes.delete(alCambiar);
  }
  cambioDesdeOtroDispositivo(fn: (d: Datos) => Datos) {
    this.guardar(fn(this.cargar()));
  }
}

const editarNota = (id: string, nota: string) => (d: Datos): Datos => ({
  ...d,
  movimientos: d.movimientos.map((m) => (m.id === id ? { ...m, nota } : m)),
});

describe("CC24: guardar no deshace lo que cambió otro dispositivo", () => {
  it("una pestaña que abrió antes del cambio de la otra no reescribe ese cambio al guardar otra cosa", () => {
    const repo = new RepositorioDePrueba(datosCon([mov("inicial", 600), mov("p1", 60, "nota vieja")]));
    // La pestaña B abrió aquí: lo que tiene en pantalla es esta copia
    const enPantallaB = repo.cargar();
    // La pestaña A edita el préstamo
    repo.cambioDesdeOtroDispositivo(editarNota("p1", "editado en A"));
    // B agrega un préstamo nuevo, sin haberse enterado del cambio de A
    aplicarCambio(repo, (d) => ({ ...d, movimientos: [...d.movimientos, mov("p2", 120, "nuevo en B")] }));

    const notas = repo.guardado.movimientos.map((m) => m.nota);
    expect(notas).toContain("editado en A");
    expect(notas).not.toContain("nota vieja");
    expect(notas).toContain("nuevo en B");
    // La copia vieja de B no fue la base de lo guardado
    expect(enPantallaB.movimientos.find((m) => m.id === "p1")?.nota).toBe("nota vieja");
  });

  it("devuelve lo que quedó guardado, para mostrarlo en pantalla", () => {
    const repo = new RepositorioDePrueba(datosCon([mov("inicial", 600)]));
    const resultado = aplicarCambio(repo, (d) => ({ ...d, movimientos: [...d.movimientos, mov("p1", 60)] }));
    expect(resultado.movimientos.map((m) => m.id)).toEqual(["inicial", "p1"]);
  });

  it("si guardar falla, el error llega a quien llamó (la pantalla muestra el aviso de no se pudo guardar)", () => {
    const repo = new RepositorioDePrueba(datosCon([]));
    repo.guardar = () => {
      throw new Error("sin espacio");
    };
    expect(() => aplicarCambio(repo, (d) => d)).toThrow("sin espacio");
  });
});

describe("CC24: la pantalla se entera de lo que llega de otro dispositivo", () => {
  it("avisa con los datos nuevos cuando el repositorio cambia", () => {
    const repo = new RepositorioDePrueba(datosCon([mov("inicial", 600), mov("p1", 60, "nota vieja")]));
    const vistos: Datos[] = [];
    escucharDatos(repo, (d) => vistos.push(d));
    repo.cambioDesdeOtroDispositivo(editarNota("p1", "editado en A"));
    expect(vistos.at(-1)?.movimientos.find((m) => m.id === "p1")?.nota).toBe("editado en A");
  });

  it("deja de avisar al soltar la suscripción (al cerrar la pantalla)", () => {
    const repo = new RepositorioDePrueba(datosCon([mov("inicial", 600)]));
    const vistos: Datos[] = [];
    const soltar = escucharDatos(repo, (d) => vistos.push(d));
    soltar();
    repo.cambioDesdeOtroDispositivo((d) => ({ ...d, movimientos: [] }));
    expect(vistos).toHaveLength(0);
  });

  it("con un repositorio que no avisa (el local) no hace nada y no falla", () => {
    const local: Repositorio = { cargar: () => datosCon([]), guardar: () => {} };
    const soltar = escucharDatos(local, () => {
      throw new Error("no debería avisar");
    });
    expect(() => soltar()).not.toThrow();
  });
});
