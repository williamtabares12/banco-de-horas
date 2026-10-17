import { esFestivo, type CambiosFestivos } from "./festivos";
import { reglasVigentes, type ReglasGlobales } from "./reglas";
import { diaSemana, duracionMinutos, horaAMinutos, quincenaDe, sumarDias, type Quincena } from "./tiempo";

export type Categorias = {
  diurno: number;
  nocturno: number;
  dominicalDiurno: number;
  dominicalNocturno: number;
};

export type ConfigSegmentar = CambiosFestivos & {
  nocturnoDesde: string; // "19:00"
  nocturnoHasta: string; // "06:00"
};

export type Segmentacion = {
  total: Categorias;
  porQuincena: { quincena: Quincena; minutos: Categorias }[];
};

const vacio = (): Categorias => ({ diurno: 0, nocturno: 0, dominicalDiurno: 0, dominicalNocturno: 0 });

/** Orden de desempate cuando dos categorías tienen los mismos minutos: gana la primera. */
const ORDEN_DESEMPATE: (keyof Categorias)[] = ["nocturno", "dominicalNocturno", "dominicalDiurno", "diurno"];

/**
 * Resta el descanso de la categoría con más minutos del turno (suposición del
 * spec, sección 13 punto 4: si la clínica lo descuenta de otra forma, solo cambia
 * esta función). Sin bajar de cero: lo que no quepa en esa categoría no se toma
 * de las demás.
 *
 * Si el turno cruza dos quincenas, se resta primero de la quincena que tenga más
 * minutos de esa categoría y, si no alcanza, de las otras (siempre de la misma
 * categoría). Modifica `total` y `porQuincena` (en orden cronológico).
 */
function restarDescanso(total: Categorias, porQuincena: Categorias[], descansoMin: number): void {
  if (descansoMin === 0) return;
  let mayor = ORDEN_DESEMPATE[0];
  for (const categoria of ORDEN_DESEMPATE) {
    if (total[categoria] > total[mayor]) mayor = categoria;
  }
  const orden = porQuincena
    .map((_, i) => i)
    .sort((a, b) => porQuincena[b][mayor] - porQuincena[a][mayor] || a - b);
  let resto = descansoMin;
  for (const i of orden) {
    const quita = Math.min(resto, porQuincena[i][mayor]);
    porQuincena[i][mayor] -= quita;
    total[mayor] -= quita;
    resto -= quita;
    if (resto === 0) break;
  }
}

/** ¿Este minuto del día (0 a 1439) es de noche? La ventana puede cruzar la medianoche (19:00 a 06:00). */
function ventanaNocturna(nocturnoDesde: string, nocturnoHasta: string): (m: number) => boolean {
  const desde = horaAMinutos(nocturnoDesde);
  const hasta = horaAMinutos(nocturnoHasta);
  return (m) => (desde > hasta ? m >= desde || m < hasta : m >= desde && m < hasta);
}

/**
 * Parte un turno minuto a minuto. Cada minuto se clasifica por su fecha
 * calendario y su hora, y se asigna a la quincena de esa fecha. Después se resta
 * el descanso (en minutos) de la categoría mayoritaria, así que el resultado son
 * minutos netos.
 *
 * La hora nocturna sale de `reglas` (versionadas: cada minuto usa la regla que rige en su fecha
 * calendario). Sin `reglas` se usa la de `config`, como en la versión personal. Los festivos salen
 * siempre de `config`.
 */
export function segmentar(
  inicio: string,
  fin: string,
  config: ConfigSegmentar,
  descansoMin = 0,
  reglas?: ReglasGlobales,
): Segmentacion {
  const [fechaIni, horaIni] = inicio.split("T");
  const desde = horaAMinutos(horaIni);
  const duracion = duracionMinutos(inicio, fin);
  if (duracion <= 0) throw new Error("El fin del turno debe ser posterior al inicio");
  if (!Number.isInteger(descansoMin) || descansoMin < 0) {
    throw new Error("El descanso debe ser un número entero de minutos, 0 o más");
  }

  const total = vacio();
  const porQuincena = new Map<string, { quincena: Quincena; minutos: Categorias }>();
  const dias = new Map<number, { fecha: string; dominical: boolean; esNoche: (m: number) => boolean; minutos: Categorias }>();

  for (let i = 0; i < duracion; i++) {
    const t = desde + i;
    const offset = Math.floor(t / 1440);
    let dia = dias.get(offset);
    if (!dia) {
      const fecha = sumarDias(fechaIni, offset);
      const q = quincenaDe(fecha);
      const clave = `${q.anio}-${q.mes}-${q.numero}`;
      let grupo = porQuincena.get(clave);
      if (!grupo) {
        grupo = { quincena: q, minutos: vacio() };
        porQuincena.set(clave, grupo);
      }
      const horaNocturna = reglas ? reglasVigentes(reglas, fecha) : config;
      dia = {
        fecha,
        dominical: diaSemana(fecha) === 0 || esFestivo(fecha, config),
        esNoche: ventanaNocturna(horaNocturna.nocturnoDesde, horaNocturna.nocturnoHasta),
        minutos: grupo.minutos,
      };
      dias.set(offset, dia);
    }
    const noche = dia.esNoche(t % 1440);
    const categoria: keyof Categorias = dia.dominical
      ? noche ? "dominicalNocturno" : "dominicalDiurno"
      : noche ? "nocturno" : "diurno";
    total[categoria]++;
    dia.minutos[categoria]++;
  }

  const grupos = [...porQuincena.values()];
  restarDescanso(total, grupos.map((g) => g.minutos), descansoMin);
  return { total, porQuincena: grupos };
}
