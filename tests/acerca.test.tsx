import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Acerca } from "../src/ui/nube/Acerca";

const m = renderToStaticMarkup(<Acerca version="0.1.0" compilado="2026-10-16" alVerAviso={() => {}} />);

/** El texto sin las direcciones de correo (una de ellas lleva el dominio de la clínica, y eso es el correo, no la marca). */
const sinCorreos = (html: string) => html.replace(/mailto:[^"]*/g, "").replace(/[\w.+-]+@[\w.-]+/g, "");

describe("Acerca de (RF-C11)", () => {
  it("tiene el título y dice la versión de la app y de cuándo es", () => {
    expect(m).toContain("Acerca de");
    expect(m).toContain("0.1.0");
    expect(m).toContain("2026-10-16");
  });

  it("dice, con las palabras del spec, que es un registro personal y no oficial", () => {
    expect(m).toContain("Registro personal. No es una herramienta oficial de la clínica ni reemplaza sus registros.");
  });

  it("ofrece ver el aviso de privacidad", () => {
    expect(m).toMatch(/<button[^>]*>Ver el aviso de privacidad<\/button>/);
  });

  it("muestra el correo de contacto del aviso, como enlace", () => {
    expect(m).toMatch(/<a [^>]*href="mailto:wiliamtabares\.12@gmail\.com"[^>]*>wiliamtabares\.12@gmail\.com<\/a>/);
  });

  describe("reportar un problema", () => {
    it("es un botón que abre el correo con la versión y el navegador ya escritos", () => {
      expect(m).toMatch(/<a [^>]*href="mailto:wiliamtabares\.12@gmail\.com\?subject=[^"]*body=[^"]*"/);
      expect(m).toContain(">Reportar un problema</a>");
    });
    it("muestra también la dirección escrita, por si el celular no tiene un correo configurado", () => {
      expect(m).toMatch(/escribe a wiliamtabares\.12@gmail\.com/i);
    });
    it("recuerda no escribir datos de pacientes", () => {
      expect(m).toContain("No escribas nombres ni documentos de pacientes");
    });
  });

  describe("sin nombre ni logo de la clínica (RF-C12)", () => {
    // T43 (RF-C25): la única imagen permitida es el monograma de la firma de autor; nada de la clínica
    it("no hay imágenes ni el nombre de la clínica (salvo el monograma de la firma de autor)", () => {
      const imagenes = [...m.matchAll(/<img[^>]*>/g)].map((x) => x[0]);
      expect(imagenes).toHaveLength(1);
      expect(imagenes[0]).toContain("at-monograma");
      expect(m).not.toMatch(/<svg|logo/i);
      expect(sinCorreos(m)).not.toMatch(/comfamiliar/i);
    });
  });
});
