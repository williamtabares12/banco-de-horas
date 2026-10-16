/** Proporción entre 0 y 100. Con una meta de 0 o datos que no son números da 0, nunca NaN. */
export function porcentaje(valor: number, max: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (valor / max) * 100));
}

type Props = {
  valor: number;
  max: number;
  /** Para lectores de pantalla (por ejemplo "Avance de la semana"). */
  etiqueta: string;
};

export function BarraAvance({ valor, max, etiqueta }: Props) {
  const maxSeguro = Number.isFinite(max) && max > 0 ? max : 0;
  const ahora = Math.min(maxSeguro, Math.max(0, Number.isFinite(valor) ? valor : 0));
  return (
    <div
      className="barra-avance"
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={maxSeguro}
      aria-valuenow={ahora}
    >
      <div className="barra-avance__relleno" style={{ width: `${porcentaje(valor, max)}%` }} />
    </div>
  );
}
