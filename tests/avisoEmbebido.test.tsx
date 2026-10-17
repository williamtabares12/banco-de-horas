// RF-C20: el aviso en la pantalla de acceso y el botón para copiar el enlace.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAviso } from "../src/dominio/aviso";
import { copiarTexto } from "../src/ui/copiar";
import { Acceso } from "../src/ui/nube/Acceso";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const aviso = leerAviso(readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8"));
const ok = async () => ({ ok: true as const });

const pantalla = (extra: { navegadorEmbebido?: boolean } = {}) =>
  renderToStaticMarkup(
    <Acceso aviso={aviso} alIniciarConCorreo={ok} alRegistrar={ok} alEntrarConGoogle={ok} alRecuperar={ok} {...extra} />,
  );

describe("Acceso en un navegador normal", () => {
  it("no muestra ningún aviso de navegador", () => {
    const m = pantalla();
    expect(m).not.toContain("Ábrela en Chrome o Safari");
    expect(m).not.toContain("Copiar enlace");
  });
});

describe("Acceso dentro del navegador de otra app", () => {
  const m = pantalla({ navegadorEmbebido: true });
  it("avisa que hay que abrirla en Chrome o Safari", () => {
    expect(m).toContain("Ábrela en Chrome o Safari");
  });
  it("explica por qué: ahí Google no deja entrar", () => {
    expect(m).toMatch(/Google/);
  });
  it("ofrece copiar el enlace", () => {
    expect(m).toMatch(/<button[^>]*>Copiar enlace<\/button>/);
  });
  it("es un aviso, no un bloqueo: el botón de Google sigue ahí y se puede tocar", () => {
    expect(m).toMatch(/<button[^>]*class="boton boton--contorno"[^>]*>Continuar con Google<\/button>/);
    expect(m).not.toMatch(/<button[^>]*disabled[^>]*>Continuar con Google<\/button>/);
  });
  it("el aviso va arriba, antes de los campos", () => {
    expect(m.indexOf("Ábrela en Chrome o Safari")).toBeLessThan(m.indexOf('type="email"'));
  });
});

describe("copiarTexto", () => {
  it("copia al portapapeles y dice que salió bien", async () => {
    let copiado = "";
    expect(await copiarTexto("https://arena-horas.web.app", { writeText: async (t) => void (copiado = t) })).toBe(true);
    expect(copiado).toBe("https://arena-horas.web.app");
  });
  it("si el navegador no deja copiar, dice que no salió (en vez de fallar en silencio)", async () => {
    expect(await copiarTexto("x", { writeText: async () => Promise.reject(new Error("bloqueado")) })).toBe(false);
  });
  it("sin portapapeles disponible, tampoco falla: devuelve false", async () => {
    expect(await copiarTexto("x", undefined)).toBe(false);
  });
});
