import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAviso } from "../src/dominio/aviso";
import { Acceso } from "../src/ui/nube/Acceso";
import { HojaPrivacidad } from "../src/ui/nube/HojaPrivacidad";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const aviso = leerAviso(readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8"));
const ok = async () => ({ ok: true as const });

/** El elemento <button> cuyo texto contiene `texto`, como cadena de HTML. */
const boton = (html: string, texto: string) =>
  new RegExp(`<button[^>]*>(?:(?!</button>).)*${texto}(?:(?!</button>).)*</button>`).exec(html)?.[0] ?? "";

const pantalla = (modoInicial?: "login" | "registro") =>
  renderToStaticMarkup(
    <Acceso aviso={aviso} modoInicial={modoInicial} alIniciarConCorreo={ok} alRegistrar={ok} alEntrarConGoogle={ok} alRecuperar={ok} />,
  );

describe("Acceso: iniciar sesión", () => {
  const html = pantalla();

  it("pide correo y contraseña y ofrece Google", () => {
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Continuar con Google");
  });
  it("el botón principal es Iniciar sesión y no está bloqueado", () => {
    expect(boton(html, "Iniciar sesión")).not.toMatch(/disabled/);
    expect(boton(html, "Continuar con Google")).not.toMatch(/disabled/);
  });
  it("tiene el enlace para recuperar la contraseña y el de crear cuenta", () => {
    expect(html).toContain("¿Olvidaste tu contraseña?");
    expect(html).toMatch(/<button[^>]*>Entrar<\/button>/); // el selector Entrar | Crear cuenta (RF-C23)
    expect(boton(html, "Crear cuenta")).not.toBe("");
  });
  it("no pide nombre ni la casilla del aviso (eso es solo al crear la cuenta)", () => {
    expect(html).not.toContain("Tu nombre");
    expect(html).not.toMatch(/role="switch"/);
  });
  it("ofrece leer el aviso de privacidad y dice que es un registro personal", () => {
    expect(boton(html, "Aviso de privacidad")).not.toBe("");
    expect(html).toMatch(/Registro personal/);
    expect(html).toMatch(/no es una herramienta oficial/i);
  });
});

describe("Acceso: crear cuenta", () => {
  const html = pantalla("registro");

  it("pide el nombre, el correo y la contraseña", () => {
    expect(html).toContain("Tu nombre");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
  });
  it("muestra la casilla con el texto de la autorización, sin marcar", () => {
    expect(html).toContain(aviso.textoAutorizacion);
    expect(html).toMatch(/role="switch"[^>]*aria-checked="false"/);
  });
  it("sin aceptar el aviso no se puede crear la cuenta, ni con correo ni con Google", () => {
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Crear cuenta<\/button>/); // el botón de envío (la pestaña "Crear cuenta" del selector no lleva disabled)
    expect(boton(html, "Continuar con Google")).toMatch(/disabled/);
  });
  it("no ofrece recuperar la contraseña y sí volver a iniciar sesión", () => {
    expect(html).not.toContain("¿Olvidaste tu contraseña?");
    expect(html).toMatch(/<button[^>]*>Entrar<\/button>/); // el selector deja volver a Entrar
  });
});

describe("HojaPrivacidad", () => {
  const html = renderToStaticMarkup(<HojaPrivacidad aviso={aviso} alCerrar={() => {}} />);

  it("es un diálogo con el aviso completo", () => {
    expect(html).toMatch(/role="dialog"/);
    expect(html).toContain("1. Quién es el responsable");
    expect(html).toContain("11. Cambios");
  });
  it("trae los datos de contacto ya rellenos", () => {
    expect(html).toContain("wiliamtabares.12@gmail.com");
    expect(html).not.toMatch(/\[CORREO/);
  });
  it("se cierra con un botón", () => {
    expect(boton(html, "Cerrar")).not.toBe("");
  });
});
