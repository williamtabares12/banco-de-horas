// RF-C20: detectar el navegador interno de otras apps (WhatsApp, Instagram...), donde Google no deja iniciar sesión.
import { describe, it, expect } from "vitest";
import { esNavegadorEmbebido } from "../src/dominio/navegadores";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8)";

describe("navegadores normales: no se avisa", () => {
  const normales: [string, string][] = [
    ["Safari en iPhone", `${IPHONE} Version/18.0 Mobile/15E148 Safari/604.1`],
    ["Chrome en iPhone", `${IPHONE} CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1`],
    ["Firefox en iPhone", `${IPHONE} FxiOS/131.0 Mobile/15E148 Safari/605.1.15`],
    ["Edge en iPhone", `${IPHONE} EdgiOS/130.0.2849.80 Version/18.0 Mobile/15E148 Safari/605.1.15`],
    ["Chrome en Android", `${ANDROID} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36`],
    ["Samsung Internet", `${ANDROID} AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36`],
    ["Firefox en Android", "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0"],
    ["Chrome de escritorio", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"],
    ["Safari de escritorio", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"],
    ["Firefox de escritorio", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"],
  ];
  for (const [nombre, ua] of normales) it(nombre, () => expect(esNavegadorEmbebido(ua)).toBe(false));

  it("un texto vacío no es un navegador interno", () => {
    expect(esNavegadorEmbebido("")).toBe(false);
  });
});

describe("navegadores dentro de otras apps: se avisa", () => {
  const embebidos: [string, string][] = [
    ["WhatsApp en iPhone (WebKit sin la marca de Safari)", `${IPHONE} Mobile/15E148`],
    ["WhatsApp con su marca", `${ANDROID} AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.20.85`],
    ["Facebook en iPhone", `${IPHONE} Mobile/21F90 [FBAN/FBIOS;FBAV/470.0.0.40.108;FBBV/600000;FBDV/iPhone15,2]`],
    ["Facebook en Android", `${ANDROID} AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.40.108;]`],
    ["Messenger", `${ANDROID} AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/460.0.0.0;]`],
    ["Instagram en iPhone", `${IPHONE} Mobile/15E148 Instagram 330.0.0.20.113 (iPhone15,2; iOS 18_0)`],
    ["Instagram en Android", `${ANDROID} AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.36.89 Android`],
    ["Android WebView (cualquier app)", "Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36"],
    ["Line", `${ANDROID} AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36 Line/14.0.0`],
    ["Snapchat", `${IPHONE} Mobile/15E148 Snapchat/12.80.0.34`],
    ["TikTok", `${ANDROID} AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6 musical_ly_2024`],
    ["WeChat", `${ANDROID} AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.50`],
    ["LinkedIn", `${IPHONE} Mobile/15E148 LinkedInApp`],
  ];
  for (const [nombre, ua] of embebidos) it(nombre, () => expect(esNavegadorEmbebido(ua)).toBe(true));
});

describe("la app instalada en la pantalla de inicio de un iPhone NO es un navegador interno", () => {
  // En modo "app instalada", iOS no pone la marca de Safari en el identificador. Sin esta salvedad se confundiría.
  const ua = `${IPHONE} Mobile/15E148`;
  it("sin ser app instalada, ese identificador se avisa", () => {
    expect(esNavegadorEmbebido(ua, { instalada: false })).toBe(true);
  });
  it("instalada, no se avisa", () => {
    expect(esNavegadorEmbebido(ua, { instalada: true })).toBe(false);
  });
  it("tampoco con las marcas de otras apps: si es la app instalada, manda eso", () => {
    expect(esNavegadorEmbebido(`${ANDROID} wv)`, { instalada: true })).toBe(false);
  });
});
