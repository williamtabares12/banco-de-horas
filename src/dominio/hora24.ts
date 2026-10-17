const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Repite las horas de un turno en formato de 24 horas (RF-C22). El campo de hora del teléfono puede mostrarse
 * con a. m. y p. m., pero su valor siempre es HH:mm; esta línea evita que alguien guarde un turno de 7 de la
 * tarde creyendo que es de la mañana. Si falta una hora o no es válida, no escribe nada.
 */
export function lineaEn24Horas(inicio: string, fin: string): string {
  if (!HORA.test(inicio) || !HORA.test(fin)) return "";
  return `En 24 horas: ${inicio} a ${fin}`;
}
