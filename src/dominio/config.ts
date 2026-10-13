import type { Config } from "./tipos";

/** Valores iniciales. Alejandro los puede cambiar en Ajustes. */
export const CONFIG_POR_DEFECTO: Config = {
  minutosSemana: 42 * 60,
  nocturnoDesde: "19:00",
  nocturnoHasta: "06:00",
  desfaseQuincenas: 1,
  extrasDescuentanDeuda: true,
  festivosAgregados: [],
  festivosQuitados: [],
};
