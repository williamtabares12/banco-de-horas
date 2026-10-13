import { esFestivo, type CambiosFestivos } from "./festivos";
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

/**
 * Parte un turno minuto a minuto. Cada minuto se clasifica por su fecha
 * calendario y su hora, y se asigna a la quincena de esa fecha.
 */
export function segmentar(inicio: string, fin: string, config: ConfigSegmentar): Segmentacion {
  const [fechaIni, horaIni] = inicio.split("T");
  const desde = horaAMinutos(horaIni);
  const duracion = duracionMinutos(inicio, fin);
  if (duracion <= 0) throw new Error("El fin del turno debe ser posterior al inicio");

  const nocheDesde = horaAMinutos(config.nocturnoDesde);
  const nocheHasta = horaAMinutos(config.nocturnoHasta);
  const esNoche = (m: number) =>
    nocheDesde > nocheHasta ? m >= nocheDesde || m < nocheHasta : m >= nocheDesde && m < nocheHasta;

  const total = vacio();
  const porQuincena = new Map<string, { quincena: Quincena; minutos: Categorias }>();
  const dias = new Map<number, { fecha: string; dominical: boolean; minutos: Categorias }>();

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
      dia = {
        fecha,
        dominical: diaSemana(fecha) === 0 || esFestivo(fecha, config),
        minutos: grupo.minutos,
      };
      dias.set(offset, dia);
    }
    const noche = esNoche(t % 1440);
    const categoria: keyof Categorias = dia.dominical
      ? noche ? "dominicalNocturno" : "dominicalDiurno"
      : noche ? "nocturno" : "diurno";
    total[categoria]++;
    dia.minutos[categoria]++;
  }

  return { total, porQuincena: [...porQuincena.values()] };
}
