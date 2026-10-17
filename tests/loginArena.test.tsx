// RF-C23 y CC21: el login con la marca Arena.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAviso } from "../src/dominio/aviso";
import { Acceso } from "../src/ui/nube/Acceso";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const aviso = leerAviso(readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8"));
const ok = async () => ({ ok: true as const });

const pantalla = (modoInicial?: "login" | "registro") =>
  renderToStaticMarkup(
    <Acceso aviso={aviso} modoInicial={modoInicial} alIniciarConCorreo={ok} alRegistrar={ok} alEntrarConGoogle={ok} alRecuperar={ok} />,
  );
const antes = (html: string, a: string, b: string) => html.indexOf(a) >= 0 && html.indexOf(a) < html.indexOf(b);

describe("el login (modo Entrar)", () => {
  const m = pantalla();

  it("muestra el reloj de arena animado, el nombre Arena y la frase", () => {
    expect(m).toContain('class="reloj-arena"');
    expect(m).toMatch(/<h1[^>]*>Arena<\/h1>/);
    expect(m).toContain("Tus horas, claras y tuyas");
  });

  it("ya no repite 'Banco de horas' ni el texto largo de antes", () => {
    expect(m).not.toContain("Banco de horas");
    expect(m).not.toContain("Entra con tu cuenta");
  });

  describe("selector Entrar | Crear cuenta, arriba de los botones", () => {
    it("tiene las dos opciones y Entrar es la activa", () => {
      expect(m).toMatch(/<button[^>]*pestana--activa[^>]*>Entrar<\/button>/);
      expect(m).toMatch(/<button[^>]*class="pestana"[^>]*>Crear cuenta<\/button>/);
    });
    it("está antes de los campos y de todos los botones", () => {
      for (const despues of ['type="email"', ">Iniciar sesión<", ">Continuar con Google<"]) {
        expect(antes(m, ">Entrar<", despues)).toBe(true);
      }
    });
  });

  describe("los botones actuales no cambian ni de forma ni de orden", () => {
    it("Iniciar sesión (relleno), luego Continuar con Google (contorno), luego ¿Olvidaste tu contraseña?", () => {
      expect(m).toMatch(/class="boton boton--relleno"[^>]*type="submit"|type="submit"[^>]*class="boton boton--relleno"/);
      expect(m).toMatch(/<button[^>]*class="boton boton--contorno"[^>]*>Continuar con Google<\/button>/);
      expect(antes(m, ">Iniciar sesión<", ">Continuar con Google<")).toBe(true);
      expect(antes(m, ">Continuar con Google<", "¿Olvidaste tu contraseña?")).toBe(true);
    });
  });

  describe("el pie", () => {
    it("dice que solo la persona ve sus datos y que es un registro personal, no oficial", () => {
      expect(m).toContain("Solo tú ves tus datos desde la app. Registro personal, no es una herramienta oficial de la clínica");
    });
    it("enlaza al aviso de privacidad", () => {
      expect(m).toMatch(/<button[^>]*class="enlace"[^>]*>Aviso de privacidad<\/button>/);
    });
    it("el pie va al final de la pantalla", () => {
      expect(antes(m, "¿Olvidaste tu contraseña?", "Solo tú ves tus datos")).toBe(true);
    });
  });

  it("sin la casilla del aviso ni el nombre: eso es solo al crear la cuenta", () => {
    expect(m).not.toContain("Tu nombre");
    expect(m).not.toMatch(/role="switch"/);
  });
});

describe("el login en modo Crear cuenta", () => {
  const m = pantalla("registro");
  it("el selector marca Crear cuenta como activa", () => {
    expect(m).toMatch(/<button[^>]*pestana--activa[^>]*>Crear cuenta<\/button>/);
    expect(m).toMatch(/<button[^>]*class="pestana"[^>]*>Entrar<\/button>/);
  });
  it("sigue pidiendo nombre y aviso, y sin aceptar no se puede crear la cuenta", () => {
    expect(m).toContain("Tu nombre");
    expect(m).toMatch(/role="switch"[^>]*aria-checked="false"/);
    expect(m).toMatch(/<button[^>]*disabled[^>]*>Crear cuenta<\/button>/);
  });
  it("también lleva la marca", () => {
    expect(m).toContain('class="reloj-arena"');
    expect(m).toContain("Tus horas, claras y tuyas");
  });
});
