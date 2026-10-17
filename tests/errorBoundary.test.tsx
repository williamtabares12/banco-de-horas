// CC22: "la app nunca queda en blanco". Si algo falla al dibujar, se ve un mensaje y una salida.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBoundary, PantallaDeError } from "../src/ui/ErrorBoundary";

describe("PantallaDeError", () => {
  const m = renderToStaticMarkup(<PantallaDeError alReintentar={() => {}} />);

  it("dice con claridad que algo falló y no deja la pantalla vacía", () => {
    expect(m).toMatch(/Algo salió mal/);
    expect(m.length).toBeGreaterThan(100);
  });
  it("ofrece volver a intentar", () => {
    expect(m).toMatch(/<button[^>]*>Volver a intentar<\/button>/);
  });
  it("avisa que los datos no se perdieron (viven en la cuenta)", () => {
    expect(m).toMatch(/no se perdió nada|tus datos siguen/i);
  });
  it("no enseña errores técnicos", () => {
    expect(m).not.toMatch(/TypeError|undefined|stack|at Object/);
  });
});

describe("ErrorBoundary", () => {
  it("al fallar un componente hijo, cambia al estado de error", () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error("falló"))).toEqual({ fallo: true });
  });
  it("sin fallos muestra lo que envuelve", () => {
    const m = renderToStaticMarkup(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    );
    expect(m).toBe("<p>Todo bien</p>");
  });
});
