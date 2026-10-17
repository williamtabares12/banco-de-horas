// RF-C20: Google no deja iniciar sesión desde el navegador interno de otras apps (WhatsApp, Instagram, Facebook...).
// No existe una forma oficial de detectarlo: esto es una heurística sobre el identificador del navegador (userAgent).

/** Marcas de apps que abren los enlaces en su propio navegador. */
const MARCAS_DE_APPS = [
  /FBAN|FBAV|FB_IAB/, // Facebook y Messenger
  /Instagram/,
  /WhatsApp/,
  /Line\//,
  /Snapchat/,
  /musical_ly|BytedanceWebview|TikTok/, // TikTok
  /MicroMessenger/, // WeChat
  /LinkedInApp/,
  /; wv\)/, // Android WebView: el navegador interno de cualquier app
];

/**
 * ¿Esta página se abrió dentro de otra app y no en Safari, Chrome o similares? `instalada` es verdadero cuando es la
 * app instalada en la pantalla de inicio: ahí iOS tampoco pone la marca de Safari, y no debe confundirse con un
 * navegador interno.
 */
export function esNavegadorEmbebido(userAgent: string, opciones: { instalada?: boolean } = {}): boolean {
  if (opciones.instalada) return false;
  if (MARCAS_DE_APPS.some((m) => m.test(userAgent))) return true;
  // En iPhone, el navegador interno de una app es WebKit sin la marca de Safari (Safari, Chrome, Firefox y Edge sí la llevan)
  return /iPhone|iPad|iPod/.test(userAgent) && /AppleWebKit/.test(userAgent) && !/Safari\//.test(userAgent);
}
