import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORREO_REPORTES, enlaceDeReporte } from "../src/dominio/acerca";
import { versionDeLaApp } from "../src/ui/version";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("enlaceDeReporte: el botón de reportar un problema (RF-C11)", () => {
  const enlace = enlaceDeReporte("0.1.0", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1");
  const url = new URL(enlace);

  it("abre el correo hacia la dirección de reportes", () => {
    expect(CORREO_REPORTES).toBe("wiliamtabares.12@gmail.com");
    expect(enlace.startsWith(`mailto:${CORREO_REPORTES}?`)).toBe(true);
  });
  it("trae el asunto, y en el cuerpo la versión y el navegador, para que el reporte se pueda reproducir", () => {
    const asunto = url.searchParams.get("subject")!;
    const cuerpo = url.searchParams.get("body")!;
    expect(asunto).toMatch(/Reporte/i);
    expect(cuerpo).toContain("Versión: 0.1.0");
    expect(cuerpo).toContain("Navegador: Mozilla/5.0 (iPhone");
  });
  it("recuerda no escribir datos de pacientes en el reporte", () => {
    expect(url.searchParams.get("body")).toContain("No escribas nombres ni documentos de pacientes");
  });
  it("no manda nada de la persona: ni su correo, ni su identificador", () => {
    expect(decodeURIComponent(enlace)).not.toMatch(/uid|@correo|undefined|null/i);
  });
  it("un navegador con caracteres raros no rompe el enlace", () => {
    const raro = new URL(enlaceDeReporte("1.2.3", 'Navegador & "raro"? ñ=1#x'));
    expect(raro.searchParams.get("body")).toContain('Navegador & "raro"? ñ=1#x');
    expect(raro.searchParams.get("subject")).toMatch(/Reporte/i);
  });
  it("un texto de navegador larguísimo se recorta (los enlaces mailto tienen un límite)", () => {
    const largo = enlaceDeReporte("0.1.0", "x".repeat(5000));
    expect(largo.length).toBeLessThan(1500);
  });
  it("sin información del navegador, lo dice en vez de escribir 'undefined'", () => {
    expect(new URL(enlaceDeReporte("0.1.0", "")).searchParams.get("body")).toContain("Navegador: desconocido");
  });
});

describe("versionDeLaApp: la versión sale de package.json", () => {
  it("coincide con la de package.json", () => {
    const paquete = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8"));
    expect(versionDeLaApp().version).toBe(paquete.version);
  });
  it("ya no es 0.0.0: es una versión real para el piloto", () => {
    expect(versionDeLaApp().version).not.toBe("0.0.0");
    expect(versionDeLaApp().version).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it("trae la fecha en que se compiló, como AAAA-MM-DD", () => {
    expect(versionDeLaApp().compilado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
