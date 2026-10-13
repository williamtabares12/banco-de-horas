export type Turno = {
  id: string;
  inicio: string; // "2026-09-12T19:00"
  fin: string; // "2026-09-13T03:00" (siempre posterior a inicio)
  minutosProgramados: number;
  tipo: "ordinario" | "alquiler";
  destino?: "deuda" | "semana"; // solo si tipo = alquiler
  nota?: string;
  creadoEn: string;
  modificadoEn: string;
};

export type MovimientoBanco = {
  id: string;
  fecha: string; // "2026-09-12"
  tipo: "saldo_inicial" | "prestamo" | "pago" | "ajuste";
  minutos: number; // + sube la deuda, - la baja
  turnoId?: string; // si lo generó un turno
  automatico: boolean; // false si Alejandro lo editó a mano
  nota?: string;
  creadoEn: string;
  modificadoEn: string;
};

export type Config = {
  minutosSemana: number; // 42 * 60
  nocturnoDesde: string; // "19:00"
  nocturnoHasta: string; // "06:00"
  desfaseQuincenas: 0 | 1;
  extrasDescuentanDeuda: boolean;
  festivosAgregados: string[];
  festivosQuitados: string[];
};
