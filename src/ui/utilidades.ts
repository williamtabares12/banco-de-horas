import type { MovimientoBanco } from "../dominio/tipos";

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha de hoy "AAAA-MM-DD" en hora local. */
export function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Fecha y hora actual "AAAA-MM-DDTHH:mm:ss" en hora local. */
export function ahora(): string {
  const d = new Date();
  return `${hoy()}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

/** crypto.randomUUID solo existe en contextos seguros (https o localhost), no por http en la red wifi. */
export function nuevoId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** 150 -> "2:30", para rellenar un campo de horas. */
export function aTextoHoras(minutos: number): string {
  const abs = Math.abs(minutos);
  return `${Math.floor(abs / 60)}:${dos(abs % 60)}`;
}

export const ETIQUETAS_MOVIMIENTO: Record<MovimientoBanco["tipo"], string> = {
  saldo_inicial: "Saldo inicial",
  prestamo: "Préstamo",
  pago: "Pago",
  ajuste: "Ajuste",
};
