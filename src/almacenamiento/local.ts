import { CONFIG_POR_DEFECTO } from "../dominio/config";
import type { Datos, Repositorio } from "./repositorio";
import { importarJSON } from "./respaldo";

const CLAVE = "banco-horas:datos";

type Almacen = Pick<Storage, "getItem" | "setItem">;

export class RepositorioLocal implements Repositorio {
  private almacen: Almacen;

  constructor(almacen: Almacen) {
    this.almacen = almacen;
  }

  cargar(): Datos {
    const texto = this.almacen.getItem(CLAVE);
    if (texto === null) {
      return { version: 1, config: CONFIG_POR_DEFECTO, turnos: [], movimientos: [] };
    }
    // Se valida igual que una importación: si está dañado, no se inventan datos vacíos.
    return importarJSON(texto);
  }

  guardar(datos: Datos): void {
    this.almacen.setItem(CLAVE, JSON.stringify(datos));
  }
}
