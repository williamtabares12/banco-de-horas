export type ResultadoGuardado = "compartido" | "descargado" | "cancelado";

/**
 * Entrega un PDF a la persona.
 *
 * En el celular abre la hoja de compartir del sistema ("Guardar en Archivos", WhatsApp, correo, AirDrop…).
 * Es lo que funciona en el iPhone con la app instalada, donde `window.print()` y las descargas por
 * enlace no sirven. En el computador, o si el navegador no puede compartir archivos, lo descarga.
 */
export async function guardarPdf(bytes: Uint8Array<ArrayBuffer>, nombre: string): Promise<ResultadoGuardado> {
  const archivo = new File([bytes], nombre, { type: "application/pdf" });

  const esTactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (esTactil && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: "Extracto de horas" });
      return "compartido";
    } catch (error) {
      // cerrar la hoja de compartir no es un error; cualquier otro motivo cae a la descarga normal
      if (error instanceof DOMException && error.name === "AbortError") return "cancelado";
    }
  }

  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000); // revocarla enseguida cancela la descarga en algunos navegadores
  return "descargado";
}

/** Los dispositivos táctiles no pueden imprimir desde la página (en el iPhone, `window.print()` no hace nada). */
export function puedeImprimir(): boolean {
  return !(typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
}
