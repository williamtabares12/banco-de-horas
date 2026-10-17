import { describe, it, expect } from "vitest";
import { borrarCuenta, proveedorDe, type PasosBorrado } from "../src/almacenamiento/cuenta";

function pasosFalsos(fallaEn?: "reautenticar" | "borrarDatos" | "borrarUsuario") {
  const llamadas: string[] = [];
  const paso = (nombre: keyof PasosBorrado) => async () => {
    llamadas.push(nombre);
    if (fallaEn === nombre) throw new Error(`falla ${nombre}`);
  };
  const pasos: PasosBorrado = { reautenticar: paso("reautenticar"), borrarDatos: paso("borrarDatos"), borrarUsuario: paso("borrarUsuario") };
  return { pasos, llamadas };
}

describe("borrarCuenta (RF-C9): el orden importa", () => {
  it("primero reautentica, luego borra los datos y al final borra el usuario", async () => {
    const { pasos, llamadas } = pasosFalsos();
    await borrarCuenta(pasos);
    expect(llamadas).toEqual(["reautenticar", "borrarDatos", "borrarUsuario"]);
  });

  it("si la reautenticación falla (contraseña equivocada), NO se borra nada", async () => {
    const { pasos, llamadas } = pasosFalsos("reautenticar");
    await expect(borrarCuenta(pasos)).rejects.toThrow("falla reautenticar");
    expect(llamadas).toEqual(["reautenticar"]);
  });

  it("si falla el borrado de datos, no se borra el usuario: así se puede repetir sin dejar datos huérfanos", async () => {
    const { pasos, llamadas } = pasosFalsos("borrarDatos");
    await expect(borrarCuenta(pasos)).rejects.toThrow("falla borrarDatos");
    expect(llamadas).toEqual(["reautenticar", "borrarDatos"]);
  });

  it("si falla el borrado del usuario, los datos ya no están y se puede reintentar", async () => {
    const { pasos, llamadas } = pasosFalsos("borrarUsuario");
    await expect(borrarCuenta(pasos)).rejects.toThrow("falla borrarUsuario");
    expect(llamadas).toEqual(["reautenticar", "borrarDatos", "borrarUsuario"]);
  });

  it("se puede repetir completa después de un fallo", async () => {
    const llamadas: string[] = [];
    let intentos = 0;
    const pasos: PasosBorrado = {
      reautenticar: async () => void llamadas.push("r"),
      borrarDatos: async () => void llamadas.push("d"),
      borrarUsuario: async () => {
        llamadas.push("u");
        if (++intentos === 1) throw new Error("sin conexión");
      },
    };
    await expect(borrarCuenta(pasos)).rejects.toThrow();
    await borrarCuenta(pasos);
    expect(llamadas).toEqual(["r", "d", "u", "r", "d", "u"]);
  });
});

describe("proveedorDe: cómo entró la persona (decide cómo se le pide confirmar)", () => {
  it("con correo y contraseña", () => expect(proveedorDe(["password"])).toBe("password"));
  it("con Google", () => expect(proveedorDe(["google.com"])).toBe("google.com"));
  it("si tiene las dos, se prefiere la contraseña (no abre ventanas)", () => {
    expect(proveedorDe(["google.com", "password"])).toBe("password");
  });
  it("cualquier otro proveedor no está soportado", () => {
    expect(proveedorDe(["facebook.com"])).toBe("otro");
    expect(proveedorDe([])).toBe("otro");
  });
});
