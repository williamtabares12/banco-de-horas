import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BarraAvance, porcentaje } from "../src/ui/componentes/BarraAvance";
import { Boton } from "../src/ui/componentes/Boton";
import { Campo, Entrada, Seleccion } from "../src/ui/componentes/Campo";
import { DialogoConfirmacion } from "../src/ui/componentes/DialogoConfirmacion";
import { Enlace } from "../src/ui/componentes/Enlace";
import { FilaLista, ListaFilas } from "../src/ui/componentes/FilaLista";
import { Interruptor } from "../src/ui/componentes/Interruptor";
import { Pestanas } from "../src/ui/componentes/Pestanas";

const html = renderToStaticMarkup;
const noop = () => {};

describe("Boton", () => {
  it("por defecto es de contorno y no envía formularios", () => {
    const m = html(<Boton>Cancelar</Boton>);
    expect(m).toContain('type="button"');
    expect(m).toContain("boton boton--contorno");
    expect(m).toContain(">Cancelar<");
  });
  it("el relleno es la acción principal", () => {
    expect(html(<Boton variante="relleno">Registrar turno</Boton>)).toContain("boton--relleno");
  });
  it("un botón de envío conserva su tipo", () => {
    expect(html(<Boton variante="relleno" type="submit">Guardar</Boton>)).toContain('type="submit"');
  });
  it("las acciones que borran son de contorno con el color del texto", () => {
    const m = html(<Boton borra>Borrar</Boton>);
    expect(m).toContain("boton--contorno");
    expect(m).toContain("boton--borra");
  });
  it("deshabilitado", () => {
    expect(html(<Boton disabled>Guardar</Boton>)).toContain("disabled");
  });
  it("acepta clases y atributos extra sin perder las suyas", () => {
    const m = html(<Boton className="extra" aria-label="Quincena anterior">‹</Boton>);
    expect(m).toContain("boton");
    expect(m).toContain("extra");
    expect(m).toContain('aria-label="Quincena anterior"');
  });
});

describe("Enlace", () => {
  it("con dirección es un <a>", () => {
    const m = html(<Enlace href="https://ejemplo.org">Ver más</Enlace>);
    expect(m).toMatch(/^<a /);
    expect(m).toContain('href="https://ejemplo.org"');
    expect(m).toContain('class="enlace"');
  });
  it("sin dirección, pero con acción, es un botón (para no engañar a quien usa un lector de pantalla)", () => {
    const m = html(<Enlace onClick={noop}>Ir a Ajustes</Enlace>);
    expect(m).toMatch(/^<button /);
    expect(m).toContain('type="button"');
    expect(m).toContain('class="enlace"');
  });
});

describe("Pestanas", () => {
  const elementos = [
    { id: "inicio", nombre: "Inicio" },
    { id: "turnos", nombre: "Turnos" },
    { id: "quincena", nombre: "Quincena" },
  ];
  const m = html(<Pestanas elementos={elementos} activa="turnos" onCambiar={noop} />);

  it("es una barra de navegación con nombre", () => {
    expect(m).toMatch(/^<nav /);
    expect(m).toContain('aria-label="Secciones"');
    expect(m).toContain("pestanas");
  });
  it("muestra todas las pestañas, con su nombre completo", () => {
    for (const e of elementos) expect(m).toContain(`>${e.nombre}</button>`);
    expect(m.match(/<button /g)).toHaveLength(3);
  });
  it("solo la activa está marcada", () => {
    expect(m.match(/aria-current="page"/g)).toHaveLength(1);
    expect(m).toMatch(/<button[^>]*pestana--activa[^>]*>Turnos<\/button>/);
    expect(m).not.toMatch(/<button[^>]*pestana--activa[^>]*>Inicio<\/button>/);
  });
  it("las pestañas no envían formularios", () => {
    expect(m.match(/type="button"/g)).toHaveLength(3);
  });
});

describe("Campo", () => {
  it("la etiqueta envuelve el campo: queda asociada sin necesidad de ids", () => {
    const m = html(
      <Campo etiqueta="Fecha">
        <Entrada type="date" defaultValue="2026-10-15" />
      </Campo>,
    );
    expect(m).toMatch(/^<label class="campo">/);
    expect(m).toContain('<span class="campo__etiqueta">Fecha</span>');
    expect(m).toContain('class="campo__control"');
    expect(m).toContain('type="date"');
  });
  it("sirve también para listas desplegables", () => {
    const m = html(
      <Campo etiqueta="Tipo de turno">
        <Seleccion defaultValue="ordinario">
          <option value="ordinario">Ordinario</option>
        </Seleccion>
      </Campo>,
    );
    expect(m).toMatch(/<select[^>]*class="campo__control"/);
    expect(m).toContain("<option");
  });
  it("las entradas de texto avisan al teclado del celular y no cambian de tipo por su cuenta", () => {
    const m = html(<Entrada inputMode="decimal" placeholder="ej. 4 o 4:30" />);
    expect(m).toContain('inputMode="decimal"');
    expect(m).toContain('placeholder="ej. 4 o 4:30"');
  });
});

describe("FilaLista", () => {
  it("fecha arriba, título abajo y las horas a la derecha", () => {
    const m = html(<FilaLista fecha="2026-10-14" titulo="Capacitación o reunión" valor="-2 h" />);
    expect(m).toContain('<span class="fila-lista__fecha">2026-10-14</span>');
    expect(m).toContain('<span class="fila-lista__titulo">Capacitación o reunión</span>');
    expect(m).toContain('<span class="fila-lista__valor">-2 h</span>');
    expect(m.indexOf("fila-lista__fecha")).toBeLessThan(m.indexOf("fila-lista__titulo"));
    expect(m.indexOf("fila-lista__titulo")).toBeLessThan(m.indexOf("fila-lista__valor"));
  });
  it("puede llevar líneas de detalle (nota, turno)", () => {
    const m = html(<FilaLista titulo="Pago" detalle={["turno del 2026-10-12", "Salí tarde"]} />);
    expect(m.match(/fila-lista__detalle/g)).toHaveLength(2);
  });
  it("sin fecha ni valor no deja huecos", () => {
    const m = html(<FilaLista titulo="Día 8 h" />);
    expect(m).not.toContain("fila-lista__fecha");
    expect(m).not.toContain("fila-lista__valor");
  });
  it("una fila que se puede tocar es un botón real", () => {
    const m = html(<FilaLista titulo="Turno" onClick={noop} />);
    expect(m).toMatch(/<button[^>]*class="fila-lista__tocable"/);
    expect(m).toContain('type="button"');
  });
  it("una fila que no se toca no es un botón", () => {
    expect(html(<FilaLista titulo="Turno" />)).not.toContain("<button");
  });
  it("puede llevar acciones (editar, borrar) fuera del área tocable", () => {
    const m = html(<FilaLista titulo="Pago" acciones={<span>acciones</span>} />);
    expect(m).toContain('<div class="fila-lista__acciones"><span>acciones</span></div>');
  });
  it("las filas van dentro de una lista", () => {
    const m = html(
      <ListaFilas>
        <FilaLista titulo="Uno" />
        <FilaLista titulo="Dos" />
      </ListaFilas>,
    );
    expect(m).toMatch(/^<ul class="lista-filas">/);
    expect(m.match(/<li /g)).toHaveLength(2);
  });
});

describe("BarraAvance", () => {
  it("porcentaje: proporción entre 0 y 100", () => {
    expect(porcentaje(27 * 60, 42 * 60)).toBeCloseTo(64.2857, 3);
    expect(porcentaje(0, 100)).toBe(0);
    expect(porcentaje(100, 100)).toBe(100);
  });
  it("porcentaje: nunca pasa de 100 ni baja de 0", () => {
    expect(porcentaje(50 * 60, 42 * 60)).toBe(100);
    expect(porcentaje(-5, 100)).toBe(0);
  });
  it("porcentaje: sin meta (0) o datos raros no da NaN ni infinito", () => {
    expect(porcentaje(10, 0)).toBe(0);
    expect(porcentaje(Number.NaN, 100)).toBe(0);
    expect(porcentaje(10, Number.NaN)).toBe(0);
  });
  it("es una barra de progreso accesible con su valor", () => {
    const m = html(<BarraAvance valor={27 * 60} max={42 * 60} etiqueta="Avance de la semana" />);
    expect(m).toContain('role="progressbar"');
    expect(m).toContain('aria-valuemin="0"');
    expect(m).toContain('aria-valuemax="2520"');
    expect(m).toContain('aria-valuenow="1620"');
    expect(m).toContain('aria-label="Avance de la semana"');
  });
  it("el relleno mide el porcentaje", () => {
    expect(html(<BarraAvance valor={21} max={42} etiqueta="x" />)).toContain('style="width:50%"');
  });
  it("con más de la meta, el aria-valuenow no pasa del máximo", () => {
    expect(html(<BarraAvance valor={50} max={42} etiqueta="x" />)).toContain('aria-valuenow="42"');
  });
});

describe("Interruptor", () => {
  it("apagado", () => {
    const m = html(<Interruptor etiqueta="Las horas extra descuentan deuda" activo={false} onCambiar={noop} />);
    expect(m).toContain('role="switch"');
    expect(m).toContain('aria-checked="false"');
    expect(m).toContain("Las horas extra descuentan deuda");
    expect(m).not.toContain("interruptor--encendido");
  });
  it("encendido", () => {
    const m = html(<Interruptor etiqueta="x" activo onCambiar={noop} />);
    expect(m).toContain('aria-checked="true"');
    expect(m).toContain("interruptor--encendido");
  });
  it("es un botón que no envía formularios", () => {
    expect(html(<Interruptor etiqueta="x" activo onCambiar={noop} />)).toMatch(/^<button[^>]*type="button"/);
  });
});

describe("DialogoConfirmacion", () => {
  const m = html(
    <DialogoConfirmacion
      titulo="¿Borrar este movimiento?"
      mensaje="Pago del 2026-10-14, -2 h"
      textoConfirmar="Borrar"
      onConfirmar={noop}
      onCancelar={noop}
    />,
  );
  it("es un diálogo modal de alerta con título y mensaje", () => {
    expect(m).toContain('role="alertdialog"');
    expect(m).toContain('aria-modal="true"');
    expect(m).toMatch(/aria-labelledby="([^"]+)"/);
    expect(m).toContain("¿Borrar este movimiento?");
    expect(m).toContain("Pago del 2026-10-14, -2 h");
  });
  it("el título y el mensaje están enlazados con sus ids", () => {
    const tituloId = /aria-labelledby="([^"]+)"/.exec(m)![1];
    const mensajeId = /aria-describedby="([^"]+)"/.exec(m)![1];
    expect(m).toContain(`id="${tituloId}"`);
    expect(m).toContain(`id="${mensajeId}"`);
  });
  it("botón relleno para confirmar y de contorno para cancelar", () => {
    expect(m).toMatch(/<button[^>]*boton--relleno[^>]*>Borrar<\/button>/);
    expect(m).toMatch(/<button[^>]*boton--contorno[^>]*>Cancelar<\/button>/);
  });
  it("hay un velo detrás de la hoja", () => {
    expect(m).toContain("dialogo__velo");
    expect(m.indexOf("dialogo__velo")).toBeLessThan(m.indexOf("dialogo__hoja"));
  });
  it("el texto del botón de cancelar se puede cambiar; por defecto dice Cancelar y confirmar dice Confirmar", () => {
    const sinTextos = html(<DialogoConfirmacion titulo="t" mensaje="m" onConfirmar={noop} onCancelar={noop} />);
    expect(sinTextos).toContain(">Confirmar<");
    expect(sinTextos).toContain(">Cancelar<");
    expect(html(<DialogoConfirmacion titulo="t" mensaje="m" textoCancelar="Mejor no" onConfirmar={noop} onCancelar={noop} />)).toContain(">Mejor no<");
  });
});
