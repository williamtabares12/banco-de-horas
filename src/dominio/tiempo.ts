// Fechas como texto local "YYYY-MM-DD". Se usa Date.UTC solo como calendario
// (suma de días, día de la semana), sin zonas horarias ni horario de verano.

import { reglasVigentes, type ReglasGlobales } from "./reglas";

export type Quincena = { anio: number; mes: number; numero: 1 | 2 };

const MS_DIA = 24 * 60 * 60 * 1000;

function aUtc(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function aTexto(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  return aTexto(aUtc(fecha) + dias * MS_DIA);
}

/** 0 = domingo ... 6 = sábado */
export function diaSemana(fecha: string): number {
  return new Date(aUtc(fecha)).getUTCDay();
}

/**
 * Primer día de la semana que contiene la fecha. `primerDia` es 0 (domingo, por defecto: la semana va de
 * domingo a sábado) o 1 (lunes, de lunes a domingo).
 */
export function inicioSemana(fecha: string, primerDia: 0 | 1 = 0): string {
  const atras = (diaSemana(fecha) - primerDia + 7) % 7;
  return sumarDias(fecha, -atras);
}

export function quincenaDe(fecha: string): Quincena {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return { anio, mes, numero: dia <= 15 ? 1 : 2 };
}

/**
 * Quincena de la colilla donde se cobra lo trabajado en `fecha`. El desfase puede ser un valor suelto
 * (0 o 1) o las reglas versionadas, y entonces se usa el que rige el primer día de esa quincena.
 */
export function quincenaDeCobro(fecha: string, desfase: 0 | 1 | ReglasGlobales): Quincena {
  const q = quincenaDe(fecha);
  if (typeof desfase === "object") {
    const primerDia = `${q.anio}-${String(q.mes).padStart(2, "0")}-${q.numero === 1 ? "01" : "16"}`;
    desfase = reglasVigentes(desfase, primerDia).desfaseQuincenas;
  }
  if (desfase === 0) return q;
  if (q.numero === 1) return { ...q, numero: 2 };
  return q.mes === 12
    ? { anio: q.anio + 1, mes: 1, numero: 1 }
    : { anio: q.anio, mes: q.mes + 1, numero: 1 };
}

/** Días calendario entre dos fechas (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((aUtc(b) - aUtc(a)) / MS_DIA);
}

/** "19:00" -> minutos desde la medianoche. */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Minutos entre dos fecha-hora locales "YYYY-MM-DDTHH:mm" (fin - inicio). */
export function duracionMinutos(inicio: string, fin: string): number {
  const [fechaIni, horaIni] = inicio.split("T");
  const [fechaFin, horaFin] = fin.split("T");
  return diasEntre(fechaIni, fechaFin) * 1440 + horaAMinutos(horaFin) - horaAMinutos(horaIni);
}

/**
 * Lee una duración escrita por la persona: "8", "8:30", "2,5" o "2.5" horas.
 * Devuelve minutos enteros, o null si el texto no se entiende.
 */
export function parsearDuracion(texto: string): number | null {
  const t = texto.trim();
  const hm = /^(\d+):(\d{2})$/.exec(t);
  if (hm) {
    const minutos = Number(hm[2]);
    return minutos < 60 ? Number(hm[1]) * 60 + minutos : null;
  }
  // Un solo dígito después de la coma o el punto (7,5). Con dos o más no se sabe si son minutos o decimales (RF15).
  if (/^\d+([.,]\d)?$/.test(t)) return Math.round(Number(t.replace(",", ".")) * 60);
  return null;
}

/**
 * Por qué no se entiende una duración, o null si se entiende. "7.30" y "7,30" pueden ser minutos
 * escritos con punto, así que se sugiere la forma con dos puntos (RF15, CA24).
 */
export function errorDeDuracion(texto: string): string | null {
  if (parsearDuracion(texto) !== null) return null;
  const parecidoAMinutos = /^(\d+)[.,](\d{2})$/.exec(texto.trim());
  if (parecidoAMinutos && Number(parecidoAMinutos[2]) < 60) {
    return `¿Quisiste decir ${parecidoAMinutos[1]}:${parecidoAMinutos[2]}? Escribe las horas como 7:30 o 7,5.`;
  }
  return "No entiendo esas horas. Escríbelas como 8, 7:30 o 7,5.";
}

/** 150 -> "2 h 30 min". */
export function formatearDuracion(minutos: number): string {
  const signo = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0 && m > 0) return `${signo}${m} min`;
  return m === 0 ? `${signo}${h} h` : `${signo}${h} h ${m} min`;
}
