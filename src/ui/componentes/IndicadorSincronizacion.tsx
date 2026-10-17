/**
 * Dice, en pequeño, si lo último que se hizo está guardado solo en este dispositivo (sin señal o esperando
 * al servidor) o ya sincronizado (RF-C4). Solo existe en la versión con cuenta.
 */
export function IndicadorSincronizacion({ pendiente }: { pendiente: boolean }) {
  return (
    <p className="texto-suave" role="status">
      {pendiente ? "Guardado solo en este dispositivo" : "Sincronizado"}
    </p>
  );
}
