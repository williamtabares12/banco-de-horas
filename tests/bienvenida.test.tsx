import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAviso } from "../src/dominio/aviso";
import { Bienvenida } from "../src/ui/nube/Bienvenida";
import { NuevoAviso } from "../src/ui/nube/NuevoAviso";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const aviso = leerAviso(readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8"));
const noop = () => {};

/** El elemento <button> cuyo texto es `texto`, como cadena de HTML. */
const boton = (html: string, texto: string) => new RegExp(`<button[^>]*>(?:(?!</button>).)*${texto}(?:(?!</button>).)*</button>`).exec(html)?.[0] ?? "";

describe("Bienvenida: primer paso (CC3)", () => {
  const html = renderToStaticMarkup(<Bienvenida aviso={aviso} hoy="2026-10-16" alTerminar={async () => {}} alImportar={async () => {}} />);

  it("muestra el aviso completo y la casilla con el texto de la autorización", () => {
    expect(html).toContain("1. Quién es el responsable");
    expect(html).toContain("11. Cambios");
    expect(html).toContain(aviso.textoAutorizacion);
  });
  it("la casilla empieza sin marcar", () => {
    expect(html).toMatch(/role="switch"[^>]*aria-checked="false"/);
  });
  it("sin aceptar, el botón de continuar está bloqueado", () => {
    expect(boton(html, "Continuar")).toMatch(/disabled/);
  });
  it("dice en qué paso va", () => {
    expect(html).toContain("Paso 1 de 4");
  });
  it("no hay botón de atrás en el primer paso", () => {
    expect(html).not.toContain(">Atrás<");
  });
});

describe("NuevoAviso: el aviso cambió de versión", () => {
  const html = renderToStaticMarkup(<NuevoAviso aviso={aviso} alAceptar={async () => {}} />);

  it("muestra el aviso y la casilla, sin marcar", () => {
    expect(html).toContain("11. Cambios");
    expect(html).toContain(aviso.textoAutorizacion);
    expect(html).toMatch(/aria-checked="false"/);
  });
  it("sin aceptar, no se puede continuar", () => {
    expect(boton(html, "Continuar")).toMatch(/disabled/);
  });
  it("no pide el saldo ni la jornada: solo la autorización", () => {
    expect(html).not.toContain("Saldo inicial");
    expect(html).not.toContain("Paso 1 de");
  });
});
