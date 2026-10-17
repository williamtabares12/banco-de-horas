// RF-C19: instalar la app. En Android, un botón cuando el navegador lo permite; en iPhone, una guía de tres pasos.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PASOS_IPHONE, opcionDeInstalacion } from "../src/dominio/instalacion";
import { InstalarApp } from "../src/ui/InstalarApp";

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1";
const IPHONE_WHATSAPP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const ESCRITORIO = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("opcionDeInstalacion: qué se le ofrece a cada persona", () => {
  it("si la app ya está instalada, no se ofrece nada", () => {
    expect(opcionDeInstalacion({ instalada: true, hayEventoDeInstalacion: true, userAgent: ANDROID_CHROME })).toBe("ninguna");
    expect(opcionDeInstalacion({ instalada: true, hayEventoDeInstalacion: false, userAgent: IPHONE_SAFARI })).toBe("ninguna");
  });
  it("en Android (Chrome y otros) con el aviso del navegador: un botón 'Instalar app'", () => {
    expect(opcionDeInstalacion({ instalada: false, hayEventoDeInstalacion: true, userAgent: ANDROID_CHROME })).toBe("boton");
  });
  it("en iPhone con Safari: la guía de tres pasos", () => {
    expect(opcionDeInstalacion({ instalada: false, hayEventoDeInstalacion: false, userAgent: IPHONE_SAFARI })).toBe("guia-iphone");
  });
  it("en iPhone con Chrome también (desde iOS 16.4 se puede añadir a la pantalla de inicio): la guía", () => {
    expect(opcionDeInstalacion({ instalada: false, hayEventoDeInstalacion: false, userAgent: IPHONE_CHROME })).toBe("guia-iphone");
  });
  it("dentro del navegador de otra app en iPhone no se ofrece instalar (primero hay que abrirla en Safari)", () => {
    expect(opcionDeInstalacion({ instalada: false, hayEventoDeInstalacion: false, userAgent: IPHONE_WHATSAPP })).toBe("ninguna");
  });
  it("en Android sin el aviso del navegador (todavía no, o no se puede) o en un computador: nada que ofrecer", () => {
    expect(opcionDeInstalacion({ instalada: false, hayEventoDeInstalacion: false, userAgent: ANDROID_CHROME })).toBe("ninguna");
    expect(opcionDeInstalacion({ instalada: false, hayEventoDeInstalacion: false, userAgent: ESCRITORIO })).toBe("ninguna");
  });
});

describe("la guía del iPhone", () => {
  it("son tres pasos, en este orden: Compartir, Añadir a pantalla de inicio, Añadir", () => {
    expect(PASOS_IPHONE).toHaveLength(3);
    expect(PASOS_IPHONE[0]).toMatch(/Compartir/);
    expect(PASOS_IPHONE[1]).toMatch(/Añadir a pantalla de inicio/);
    expect(PASOS_IPHONE[2]).toMatch(/Añadir/);
  });
});

describe("InstalarApp (lo que se ve)", () => {
  const html = renderToStaticMarkup;
  const noop = () => {};

  it("en Android, un botón 'Instalar app'", () => {
    const m = html(<InstalarApp opcion="boton" alInstalar={noop} />);
    expect(m).toMatch(/<button[^>]*>Instalar app<\/button>/);
    expect(m).not.toContain("<ol");
  });
  it("en iPhone, la guía numerada de tres pasos y ningún botón de instalar", () => {
    const m = html(<InstalarApp opcion="guia-iphone" alInstalar={noop} />);
    expect(m).toContain("<ol");
    expect(m.match(/<li>/g)).toHaveLength(3);
    expect(m).toContain("Compartir");
    expect(m).toContain("Añadir a pantalla de inicio");
    expect(m).not.toMatch(/<button[^>]*>Instalar app<\/button>/);
  });
  it("si la app ya está instalada (o no se puede ofrecer), no se dibuja nada: queda oculto", () => {
    expect(html(<InstalarApp opcion="ninguna" alInstalar={noop} />)).toBe("");
  });
  it("puede llevar 'Ahora no' para descartarlo", () => {
    expect(html(<InstalarApp opcion="boton" alInstalar={noop} alDescartar={noop} />)).toMatch(/<button[^>]*>Ahora no<\/button>/);
    expect(html(<InstalarApp opcion="boton" alInstalar={noop} />)).not.toContain("Ahora no");
  });
});
