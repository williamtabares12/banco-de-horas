import { segmentar, type Categorias, type ConfigSegmentar } from "./segmentar";
import { quincenaDeCobro, type Quincena } from "./tiempo";
import type { Turno } from "./tipos";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Horas por categoría trabajadas en una quincena. Cada fracción cuenta en la
 * quincena de la fecha en que se trabajó, así que un turno que cruza del 15 al
 * 16 reparte sus horas entre las dos.
 */
export function horasDeQuincena(turnos: Turno[], q: Quincena, config: ConfigSegmentar): Categorias {
  const suma: Categorias = { diurno: 0, nocturno: 0, dominicalDiurno: 0, dominicalNocturno: 0 };
  for (const turno of turnos) {
    for (const parte of segmentar(turno.inicio, turno.fin, config).porQuincena) {
      if (parte.quincena.anio !== q.anio || parte.quincena.mes !== q.mes || parte.quincena.numero !== q.numero) continue;
      suma.diurno += parte.minutos.diurno;
      suma.nocturno += parte.minutos.nocturno;
      suma.dominicalDiurno += parte.minutos.dominicalDiurno;
      suma.dominicalNocturno += parte.minutos.dominicalNocturno;
    }
  }
  return suma;
}

/** Quincena de la colilla donde se cobra lo trabajado en la quincena `q`. */
export function colillaDeQuincena(q: Quincena, desfase: 0 | 1): Quincena {
  const primerDia = `${q.anio}-${String(q.mes).padStart(2, "0")}-${q.numero === 1 ? "01" : "16"}`;
  return quincenaDeCobro(primerDia, desfase);
}

export function quincenaSiguiente(q: Quincena): Quincena {
  if (q.numero === 1) return { ...q, numero: 2 };
  return q.mes === 12 ? { anio: q.anio + 1, mes: 1, numero: 1 } : { anio: q.anio, mes: q.mes + 1, numero: 1 };
}

export function quincenaAnterior(q: Quincena): Quincena {
  if (q.numero === 2) return { ...q, numero: 1 };
  return q.mes === 1 ? { anio: q.anio - 1, mes: 12, numero: 2 } : { anio: q.anio, mes: q.mes - 1, numero: 2 };
}

/** "2.ª quincena de septiembre de 2026" */
export function etiquetaQuincena(q: Quincena): string {
  return `${q.numero}.ª quincena de ${MESES[q.mes - 1]} de ${q.anio}`;
}
