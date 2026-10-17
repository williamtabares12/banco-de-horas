/** Copia un texto al portapapeles. Devuelve false (sin lanzar error) si el navegador no deja. */
export async function copiarTexto(texto: string, portapapeles: { writeText: (t: string) => Promise<void> } | undefined): Promise<boolean> {
  if (!portapapeles) return false;
  try {
    await portapapeles.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
