export type Turno = {
  id: string;
  inicio: string; // "2026-09-12T19:00"
  fin: string; // "2026-09-13T03:00" (siempre posterior a inicio)
  descansoMin: number; // minutos descontados (almuerzo, desayuno, tarde); 0 en turnos viejos y de alquiler
  minutosProgramados: number; // netos, ya sin descanso
  tipo: "ordinario" | "alquiler";
  destino?: "deuda" | "semana"; // solo si tipo = alquiler
  nota?: string;
  creadoEn: string;
  modificadoEn: string;
};

/** Para qué fue un pago manual. Los pagos viejos no lo tienen y se tratan como "otro". */
export type MotivoPago = "capacitacion_reunion" | "otro";

export type MovimientoBanco = {
  id: string;
  fecha: string; // "2026-09-12"
  tipo: "saldo_inicial" | "prestamo" | "pago" | "ajuste";
  minutos: number; // + sube la deuda, - la baja
  turnoId?: string; // si lo generó un turno
  motivo?: MotivoPago; // solo en pagos manuales (sin turno); vacío en el resto
  automatico: boolean; // false si Alejandro lo editó a mano
  nota?: string;
  creadoEn: string;
  modificadoEn: string;
};

/** Atajo para registrar turnos: nombre, horario y descanso. */
export type PlantillaTurno = {
  id: string;
  nombre: string; // "Día 8 h"
  inicio: string; // "07:00"
  fin: string; // "16:00" (si es menor que inicio, cruza medianoche)
  descansoMin: number; // 60
};

export type Config = {
  minutosSemana: number; // 42 * 60
  inicioSemana: 0 | 1; // 0 = domingo (por defecto), 1 = lunes
  nocturnoDesde: string; // "19:00"
  nocturnoHasta: string; // "06:00"
  desfaseQuincenas: 0 | 1;
  extrasDescuentanDeuda: boolean;
  festivosAgregados: string[];
  festivosQuitados: string[];
  plantillas: PlantillaTurno[];
};
