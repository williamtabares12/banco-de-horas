import type { Config, PlantillaTurno } from "./tipos";

/** Plantillas de ejemplo (las horas exactas se ajustan en Ajustes). Cada llamada devuelve copias nuevas. */
export function copiarPlantillas(): PlantillaTurno[] {
  return [
    { id: "plantilla-dia-8", nombre: "Día 8 h", inicio: "07:00", fin: "16:00", descansoMin: 60 },
    { id: "plantilla-dia-12", nombre: "Día 12 h", inicio: "07:00", fin: "19:00", descansoMin: 120 },
    { id: "plantilla-noche-12", nombre: "Noche 12 h", inicio: "19:00", fin: "07:00", descansoMin: 120 },
  ];
}

export const PLANTILLAS_POR_DEFECTO: readonly PlantillaTurno[] = copiarPlantillas();

/** Valores iniciales. Alejandro los puede cambiar en Ajustes. */
export const CONFIG_POR_DEFECTO: Config = {
  minutosSemana: 42 * 60,
  inicioSemana: 0,
  nocturnoDesde: "19:00",
  nocturnoHasta: "06:00",
  desfaseQuincenas: 1,
  extrasDescuentanDeuda: true,
  festivosAgregados: [],
  festivosQuitados: [],
  plantillas: copiarPlantillas(),
};
