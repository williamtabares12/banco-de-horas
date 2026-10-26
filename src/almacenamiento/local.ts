import { CONFIG_POR_DEFECTO } from "../dominio/config";
import { esFormato1, VERSION_ESQUEMA } from "./migracion";
import type { Datos, Repositorio } from "./repositorio";
import { leerDatos } from "./respaldo";

const CLAVE = "banco-horas:datos";

/** Copia intacta de los datos del formato 1, que se guarda una vez al migrarlos. */
export const CLAVE_COPIA_FORMATO_1 = "banco-horas:datos:formato-1";

type Almacen = Pick<Storage, "getItem" | "setItem">;

export class RepositorioLocal implements Repositorio {
  private almacen: Almacen;

  constructor(almacen: Almacen) {
    this.almacen = almacen;
  }

  cargar(): Datos {
    const texto = this.almacen.getItem(CLAVE);
    if (texto === null) {
      return { schemaVersion: VERSION_ESQUEMA, config: CONFIG_POR_DEFECTO, turnos: [], movimientos: [] };
    }
    // Se valida igual que una importación: si está dañado, no se inventan datos vacíos.
    // Leer NO reescribe lo guardado: el original sigue igual hasta el primer guardar().
    const { datos, migrado } = leerDatos(texto);
    // Solo el formato 1 cambia datos; pasar del 2 al 3 apenas agrega un campo, sin riesgo de perder nada
    if (migrado && esFormato1(JSON.parse(texto)) && this.almacen.getItem(CLAVE_COPIA_FORMATO_1) === null) {
      try {
        this.almacen.setItem(CLAVE_COPIA_FORMATO_1, texto);
      } catch {
        // sin espacio para la copia: igual se puede seguir, el original no se ha tocado
      }
    }
    return datos;
  }

  guardar(datos: Datos): void {
    this.almacen.setItem(CLAVE, JSON.stringify(datos));
  }
}
