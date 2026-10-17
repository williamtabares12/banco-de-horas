// RF-C22 / CC20: la hora siempre se repite en 24 horas. Y el teclado correcto en cada campo (T36).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAviso } from "../src/dominio/aviso";
import { lineaEn24Horas } from "../src/dominio/hora24";
import { FormularioTurno } from "../src/ui/componentes/FormularioTurno";
import { Acceso } from "../src/ui/nube/Acceso";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = renderToStaticMarkup;
const noop = () => {};
const ok = async () => ({ ok: true as const });

describe("lineaEn24Horas: el texto que repite la hora, sin importar cómo la muestre el teléfono", () => {
  it("un turno de 07:00 a 19:00 se escribe '07:00' y '19:00' (CC20)", () => {
    expect(lineaEn24Horas("07:00", "19:00")).toBe("En 24 horas: 07:00 a 19:00");
  });
  it("un turno de noche, 19:00 a 07:00", () => {
    expect(lineaEn24Horas("19:00", "07:00")).toBe("En 24 horas: 19:00 a 07:00");
  });
  it("la medianoche y el último minuto del día", () => {
    expect(lineaEn24Horas("00:00", "23:59")).toBe("En 24 horas: 00:00 a 23:59");
  });
  it("si falta una de las dos horas, o no es una hora, no escribe nada (en vez de 'undefined')", () => {
    expect(lineaEn24Horas("", "19:00")).toBe("");
    expect(lineaEn24Horas("07:00", "")).toBe("");
    expect(lineaEn24Horas("7pm", "19:00")).toBe("");
    expect(lineaEn24Horas("25:00", "19:00")).toBe("");
    expect(lineaEn24Horas("07:60", "19:00")).toBe("");
  });
});

describe("el formulario del turno repite la hora en 24 horas", () => {
  const turno = {
    id: "t1",
    inicio: "2026-10-20T07:00",
    fin: "2026-10-20T19:00",
    descansoMin: 60,
    minutosProgramados: 660,
    tipo: "ordinario" as const,
    creadoEn: "2026-10-01T08:00:00",
    modificadoEn: "2026-10-01T08:00:00",
  };
  it("al editar un turno de 07:00 a 19:00, dice 'En 24 horas: 07:00 a 19:00'", () => {
    const m = html(<FormularioTurno inicial={turno} plantillas={[]} onContinuar={noop} onCancelar={noop} />);
    expect(m).toContain("En 24 horas: 07:00 a 19:00");
  });
  it("al registrar uno nuevo, sin horas todavía, no muestra la línea", () => {
    const m = html(<FormularioTurno plantillas={[]} onContinuar={noop} onCancelar={noop} />);
    expect(m).not.toContain("En 24 horas");
  });
  it("se anuncia a los lectores de pantalla cuando cambia", () => {
    const m = html(<FormularioTurno inicial={turno} plantillas={[]} onContinuar={noop} onCancelar={noop} />);
    expect(m).toMatch(/<p[^>]*aria-live="polite"[^>]*>En 24 horas: 07:00 a 19:00<\/p>/);
  });
});

describe("el teclado correcto en cada campo", () => {
  const aviso = leerAviso(readFileSync(join(RAIZ, "aviso-privacidad.md"), "utf8"));
  const acceso = (modo: "login" | "registro") =>
    html(<Acceso aviso={aviso} modoInicial={modo} alIniciarConCorreo={ok} alRegistrar={ok} alEntrarConGoogle={ok} alRecuperar={ok} />);

  // React escribe estos atributos con mayúsculas (autoComplete); el HTML los acepta igual, así que se compara sin distinguirlas
  const etiqueta = (m: string, patron: RegExp) => patron.exec(m)![0].toLowerCase();

  it("el correo: teclado de correo, sin mayúscula automática ni corrector", () => {
    const correo = etiqueta(acceso("login"), /<input[^>]*type="email"[^>]*>/);
    expect(correo).toContain('autocomplete="email"');
    expect(correo).toContain('inputmode="email"');
    expect(correo).toContain('autocapitalize="none"');
    expect(correo).toContain('autocorrect="off"');
    expect(correo).toContain('spellcheck="false"');
  });
  it("la contraseña: sin mayúscula automática ni corrector, y 'actual' al entrar, 'nueva' al crear la cuenta", () => {
    const entrar = etiqueta(acceso("login"), /<input[^>]*type="password"[^>]*>/);
    expect(entrar).toContain('autocomplete="current-password"');
    expect(entrar).toContain('autocapitalize="none"');
    expect(entrar).toContain('autocorrect="off"');
    const crear = etiqueta(acceso("registro"), /<input[^>]*type="password"[^>]*>/);
    expect(crear).toContain('autocomplete="new-password"');
  });
  it("el nombre: sugiere el nombre de pila y pone la primera letra en mayúscula", () => {
    const nombre = etiqueta(acceso("registro"), /<input[^>]*autocomplete="given-name"[^>]*>/i);
    expect(nombre).toContain('autocapitalize="words"');
  });

  it("todo campo numérico (type=\"number\") del código declara su teclado (inputMode)", () => {
    const sinTeclado: string[] = [];
    const recorrer = (c: string) => {
      for (const n of readdirSync(c)) {
        const ruta = join(c, n);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.tsx$/.test(n)) {
          const texto = readFileSync(ruta, "utf8");
          for (const m of texto.matchAll(/<Entrada\b[^>]*?type="number"[^>]*?\/?>/gs)) {
            if (!/inputMode=/.test(m[0])) sinTeclado.push(`${relative(RAIZ, ruta).replace(/\\/g, "/")}: ${m[0].replace(/\s+/g, " ").slice(0, 60)}`);
          }
        }
      }
    };
    recorrer(join(RAIZ, "src"));
    expect(sinTeclado).toEqual([]);
  });
});
