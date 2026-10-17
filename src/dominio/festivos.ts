import { diaSemana, sumarDias } from "./tiempo";

export type CambiosFestivos = {
  festivosAgregados: string[];
  festivosQuitados: string[];
};

const dos = (n: number) => String(n).padStart(2, "0");
const fecha = (a: number, m: number, d: number) => `${a}-${dos(m)}-${dos(d)}`;

/** Domingo de Pascua (algoritmo gregoriano anónimo / computus). */
function pascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(anio, mes, dia);
}

/** Ley Emiliani: si no cae en lunes, pasa al lunes siguiente. */
function alLunes(f: string): string {
  const dias = (8 - diaSemana(f)) % 7; // lunes = 1 -> 0 días
  return sumarDias(f, dias);
}

/** Festivos de Colombia del año, ordenados, sin cambios manuales. */
export function festivosDelAnio(anio: number): string[] {
  const p = pascua(anio);
  const lista = [
    // Fijos
    fecha(anio, 1, 1),
    fecha(anio, 5, 1),
    fecha(anio, 7, 20),
    fecha(anio, 8, 7),
    fecha(anio, 12, 8),
    fecha(anio, 12, 25),
    // Se mueven al lunes
    alLunes(fecha(anio, 1, 6)),
    alLunes(fecha(anio, 3, 19)),
    alLunes(fecha(anio, 6, 29)),
    alLunes(fecha(anio, 8, 15)),
    alLunes(fecha(anio, 10, 12)),
    alLunes(fecha(anio, 11, 1)),
    alLunes(fecha(anio, 11, 11)),
    // Según Pascua
    sumarDias(p, -3), // Jueves Santo
    sumarDias(p, -2), // Viernes Santo
    alLunes(sumarDias(p, 39)), // Ascensión
    alLunes(sumarDias(p, 60)), // Corpus Christi
    alLunes(sumarDias(p, 68)), // Sagrado Corazón
  ];
  return lista.sort();
}

export function esFestivo(f: string, cambios: CambiosFestivos): boolean {
  if (cambios.festivosQuitados.includes(f)) return false;
  if (cambios.festivosAgregados.includes(f)) return true;
  return festivosDelAnio(Number(f.slice(0, 4))).includes(f);
}

/** Junta los cambios de festivos de dos fuentes (por ejemplo, los de la clínica y los propios), sin repetir. */
export function unirFestivos(a: CambiosFestivos, b: CambiosFestivos): CambiosFestivos {
  return {
    festivosAgregados: [...new Set([...a.festivosAgregados, ...b.festivosAgregados])],
    festivosQuitados: [...new Set([...a.festivosQuitados, ...b.festivosQuitados])],
  };
}

/** Festivos del año con los cambios manuales aplicados, ordenados. */
export function festivosEfectivos(anio: number, cambios: CambiosFestivos): string[] {
  const delAnio = (f: string) => f.startsWith(`${anio}-`);
  const lista = festivosDelAnio(anio).filter((f) => !cambios.festivosQuitados.includes(f));
  for (const f of cambios.festivosAgregados) {
    if (delAnio(f) && !lista.includes(f)) lista.push(f);
  }
  return lista.sort();
}

/** Agrega un festivo a mano. Si era uno oficial que se había quitado, lo restaura. */
export function agregarFestivo(cambios: CambiosFestivos, f: string): CambiosFestivos {
  const oficial = festivosDelAnio(Number(f.slice(0, 4))).includes(f);
  return {
    festivosQuitados: cambios.festivosQuitados.filter((x) => x !== f),
    festivosAgregados:
      oficial || cambios.festivosAgregados.includes(f) ? cambios.festivosAgregados : [...cambios.festivosAgregados, f],
  };
}

/** Quita un festivo: si era agregado a mano se borra, si era oficial pasa a "quitados". */
export function quitarFestivo(cambios: CambiosFestivos, f: string): CambiosFestivos {
  const oficial = festivosDelAnio(Number(f.slice(0, 4))).includes(f);
  return {
    festivosAgregados: cambios.festivosAgregados.filter((x) => x !== f),
    festivosQuitados:
      oficial && !cambios.festivosQuitados.includes(f) ? [...cambios.festivosQuitados, f] : cambios.festivosQuitados,
  };
}
