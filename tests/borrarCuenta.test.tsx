import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BorrarCuenta } from "../src/ui/nube/BorrarCuenta";

const html = renderToStaticMarkup;
const alBorrar = async () => ({ ok: true as const });

describe("BorrarCuenta (RF-C9): al principio solo explica y ofrece el botón", () => {
  const m = html(<BorrarCuenta proveedor="password" alBorrar={alBorrar} />);

  it("dice con claridad que es definitivo y qué se borra", () => {
    expect(m).toContain("Borrar mi cuenta");
    expect(m).toMatch(/para siempre/i);
    expect(m).toMatch(/no se puede deshacer/i);
    expect(m).toMatch(/turnos/i);
  });
  it("recuerda descargar el respaldo antes", () => {
    expect(m).toMatch(/respaldo/i);
  });
  it("el botón es de las acciones que borran (contorno con el color del texto)", () => {
    expect(m).toMatch(/<button[^>]*boton--borra[^>]*>Borrar mi cuenta<\/button>/);
  });
  it("no pide la contraseña ni muestra confirmaciones hasta que se toque el botón", () => {
    expect(m).not.toContain('type="password"');
    expect(m).not.toContain("alertdialog");
  });
});

describe("BorrarCuenta con otro tipo de cuenta", () => {
  it("si no se sabe cómo confirmar, no ofrece borrar y manda a escribir al contacto", () => {
    const m = html(<BorrarCuenta proveedor="otro" alBorrar={alBorrar} />);
    expect(m).not.toMatch(/boton--borra/);
    expect(m).toMatch(/escribe al correo de contacto/i);
  });
});
