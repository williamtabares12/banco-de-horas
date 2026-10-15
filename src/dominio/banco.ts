import { minutosNetos } from "./turnos";
import type { Config, MotivoPago, MovimientoBanco, Turno } from "./tipos";

export type ConfigBanco = Pick<Config, "extrasDescuentanDeuda">;

export type MovimientoAutomatico = {
  fecha: string;
  tipo: "prestamo" | "pago";
  minutos: number; // + sube la deuda, - la baja
};

export type FilaExtracto = { movimiento: MovimientoBanco; saldoDespues: number };

/**
 * Movimiento de banco que genera un turno (sección 7 del spec), o null si no
 * genera ninguno. La fecha es la del inicio del turno.
 */
export function movimientoDeTurno(turno: Turno, config: ConfigBanco): MovimientoAutomatico | null {
  const fecha = turno.inicio.slice(0, 10);
  const reales = minutosNetos(turno);

  if (turno.tipo === "alquiler") {
    if (turno.destino === "deuda") return { fecha, tipo: "pago", minutos: -reales };
    if (turno.destino === "semana") return null;
    throw new Error("Un turno de alquiler necesita destino");
  }

  const delta = reales - turno.minutosProgramados;
  if (delta < 0) return { fecha, tipo: "prestamo", minutos: -delta };
  if (delta > 0 && config.extrasDescuentanDeuda) return { fecha, tipo: "pago", minutos: -delta };
  return null;
}

/** Deuda en minutos: suma de todos los movimientos. */
export function saldo(movimientos: MovimientoBanco[]): number {
  return movimientos.reduce((suma, m) => suma + m.minutos, 0);
}

/** Aviso (no bloqueo) de que se pagó más de lo que se debía. */
export function saldoNegativo(movimientos: MovimientoBanco[]): boolean {
  return saldo(movimientos) < 0;
}

/** Movimientos por fecha (luego creadoEn), con el saldo acumulado después de cada uno. */
export function extracto(movimientos: MovimientoBanco[]): FilaExtracto[] {
  const ordenados = [...movimientos].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn.localeCompare(b.creadoEn),
  );
  let acumulado = 0;
  return ordenados.map((movimiento) => {
    acumulado += movimiento.minutos;
    return { movimiento, saldoDespues: acumulado };
  });
}

/** Corrige un movimiento a mano: queda marcado como manual y ya no se recalcula. */
export function editarMovimiento(
  movimiento: MovimientoBanco,
  cambios: Partial<Pick<MovimientoBanco, "fecha" | "minutos" | "nota" | "motivo">>,
  ahora: string,
): MovimientoBanco {
  return { ...movimiento, ...cambios, automatico: false, modificadoEn: ahora };
}

/**
 * Sincroniza el movimiento automático de un turno al crearlo o editarlo.
 * Si el movimiento ya fue editado a mano, no se toca. Devuelve una lista nueva.
 */
export function aplicarTurno(
  movimientos: MovimientoBanco[],
  turno: Turno,
  config: ConfigBanco,
  ahora: string,
  nuevoId: () => string,
): MovimientoBanco[] {
  const existente = movimientos.find((m) => m.turnoId === turno.id);
  if (existente && !existente.automatico) return movimientos;

  const calculado = movimientoDeTurno(turno, config);
  const resto = movimientos.filter((m) => m !== existente);
  if (!calculado) return resto;

  const nuevo: MovimientoBanco = existente
    ? { ...existente, ...calculado, modificadoEn: ahora }
    : { id: nuevoId(), ...calculado, turnoId: turno.id, automatico: true, creadoEn: ahora, modificadoEn: ahora };
  return existente ? movimientos.map((m) => (m === existente ? nuevo : m)) : [...resto, nuevo];
}

/** Signo que corresponde a cada tipo: la deuda sube con saldo inicial y préstamo, baja con pago. */
export function minutosConSigno(tipo: MovimientoBanco["tipo"], minutos: number): number {
  if (tipo === "pago") return -Math.abs(minutos);
  if (tipo === "ajuste") return minutos;
  return Math.abs(minutos);
}

export type EntradaMovimiento = {
  tipo: MovimientoBanco["tipo"];
  fecha: string;
  minutos: number;
  nota?: string;
  /** Solo para pagos: capacitación o reunión, u otro. */
  motivo?: MotivoPago;
};

const MOTIVOS: readonly MotivoPago[] = ["capacitacion_reunion", "otro"];

/**
 * Motivo de un pago manual. Los pagos de antes no lo tienen y cuentan como "otro".
 * Un pago que salió de un turno, y cualquier otro tipo de movimiento, no tiene motivo.
 */
export function motivoDe(movimiento: MovimientoBanco): MotivoPago | undefined {
  if (movimiento.tipo !== "pago" || movimiento.turnoId) return undefined;
  return movimiento.motivo ?? "otro";
}

/** Movimiento cargado a mano (saldo inicial, préstamo, pago o ajuste). */
export function nuevoMovimiento(entrada: EntradaMovimiento, ahora: string, id: string): MovimientoBanco {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada.fecha)) throw new Error("La fecha debe ser AAAA-MM-DD");
  if (!Number.isInteger(entrada.minutos) || entrada.minutos === 0) {
    throw new Error("Los minutos deben ser un entero distinto de 0");
  }
  if (entrada.motivo !== undefined) {
    if (!MOTIVOS.includes(entrada.motivo)) throw new Error("El motivo debe ser capacitación o reunión, u otro");
    if (entrada.tipo !== "pago") throw new Error("El motivo solo aplica a los pagos");
  }
  const movimiento: MovimientoBanco = {
    id,
    fecha: entrada.fecha,
    tipo: entrada.tipo,
    minutos: minutosConSigno(entrada.tipo, entrada.minutos),
    automatico: false,
    creadoEn: ahora,
    modificadoEn: ahora,
  };
  const nota = entrada.nota?.trim();
  if (nota) movimiento.nota = nota;
  if (entrada.motivo !== undefined) movimiento.motivo = entrada.motivo;
  return movimiento;
}

/** Total prestado y total pagado, en minutos positivos. */
export function totales(movimientos: MovimientoBanco[]): { prestado: number; pagado: number } {
  let prestado = 0;
  let pagado = 0;
  for (const m of movimientos) {
    if (m.tipo === "prestamo") prestado += m.minutos;
    if (m.tipo === "pago") pagado -= m.minutos;
  }
  return { prestado, pagado };
}
