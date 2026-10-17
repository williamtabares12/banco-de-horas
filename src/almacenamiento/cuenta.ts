import type { RepositorioFirestore } from "./firestore";
import { borrarUsuario, reautenticarConClave, reautenticarConGoogle, type Nube } from "./sesion";

/** Los tres pasos de borrar una cuenta (plan-nube.md §8), separados para poder probar el orden. */
export type PasosBorrado = {
  /** Volver a confirmar quién es. Si falla, no se borra nada. */
  reautenticar: () => Promise<void>;
  /** Todos los datos de la persona, en lotes. Se puede repetir. */
  borrarDatos: () => Promise<void>;
  /** El usuario de Authentication. Va al final: sin él ya no se podrían borrar los datos. */
  borrarUsuario: () => Promise<void>;
};

/**
 * Borra la cuenta en este orden: confirmar identidad, borrar los datos y, al final, el usuario. Si algo
 * falla, se detiene ahí: antes de borrar datos no se pierde nada, y después se puede repetir completa.
 */
export async function borrarCuenta(pasos: PasosBorrado): Promise<void> {
  await pasos.reautenticar();
  await pasos.borrarDatos();
  await pasos.borrarUsuario();
}

/** Cómo entró la persona decide cómo se le pide confirmar. Con contraseña se prefiere: no abre ventanas. */
export function proveedorDe(proveedores: string[]): "password" | "google.com" | "otro" {
  if (proveedores.includes("password")) return "password";
  if (proveedores.includes("google.com")) return "google.com";
  return "otro";
}

export function borrarCuentaConClave(nube: Nube, repo: RepositorioFirestore, clave: string): Promise<void> {
  return borrarCuenta({
    reautenticar: () => reautenticarConClave(nube, clave),
    borrarDatos: () => repo.borrarTodo(),
    borrarUsuario: () => borrarUsuario(nube),
  });
}

export function borrarCuentaConGoogle(nube: Nube, repo: RepositorioFirestore): Promise<void> {
  return borrarCuenta({
    reautenticar: () => reautenticarConGoogle(nube),
    borrarDatos: () => repo.borrarTodo(),
    borrarUsuario: () => borrarUsuario(nube),
  });
}
