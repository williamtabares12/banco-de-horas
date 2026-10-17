// T28: lo que se ve en pantalla (CC4, CC7, CC8) y el recordatorio de las notas (RF-C10).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Datos } from "../src/almacenamiento/repositorio";
import { CONFIG_POR_DEFECTO } from "../src/dominio/config";
import type { MovimientoBanco } from "../src/dominio/tipos";
import { Campo, Entrada } from "../src/ui/componentes/Campo";
import { FormularioMovimiento } from "../src/ui/componentes/FormularioMovimiento";
import { FormularioTurno } from "../src/ui/componentes/FormularioTurno";
import { IndicadorSincronizacion } from "../src/ui/componentes/IndicadorSincronizacion";
import { filasExtracto } from "../src/ui/extractoFilas";
import { construirExtractoPdf } from "../src/ui/extractoPdf";
import { Banco } from "../src/ui/pantallas/Banco";
import { Extracto } from "../src/ui/pantallas/Extracto";
import { Inicio } from "../src/ui/pantallas/Inicio";

const html = renderToStaticMarkup;
const noop = () => {};

// Fechas lejanas, para que "pasado" y "futuro" no dependan del día en que se corra la prueba.
const PASADO = "2020-01-01";
const FUTURO = "2099-01-01";

const mov = (id: string, fecha: string, tipo: MovimientoBanco["tipo"], minutos: number, nota?: string): MovimientoBanco => ({
  id,
  fecha,
  tipo,
  minutos,
  automatico: false,
  ...(nota ? { nota } : {}),
  creadoEn: "2020-01-01T08:00:00",
  modificadoEn: "2020-01-01T08:00:00",
});
const datosCon = (movimientos: MovimientoBanco[]): Datos => ({ schemaVersion: 2, config: CONFIG_POR_DEFECTO, turnos: [], movimientos });

const conDeuda = datosCon([mov("a", PASADO, "saldo_inicial", 8 * 60)]); // debe 8 h
const aFavor = datosCon([mov("a", PASADO, "saldo_inicial", 2 * 60), mov("b", "2020-02-01", "pago", -4 * 60)]); // la clínica debe 2 h
const conProgramado = datosCon([mov("a", PASADO, "saldo_inicial", 8 * 60), mov("p", FUTURO, "pago", -2 * 60, "Se acordó para enero")]); // hoy 8 h; proyectado 6 h

describe("CC7: saldo a favor, 'La clínica te debe X h' (RF-C6)", () => {
  for (const [nombre, pantalla] of [
    ["Inicio", (d: Datos) => html(<Inicio datos={d} alRegistrar={noop} alIrARespaldo={noop} />)],
    ["Banco", (d: Datos) => html(<Banco datos={d} cambiar={noop} />)],
  ] as const) {
    describe(nombre, () => {
      it("con saldo por debajo de cero dice 'La clínica te debe 2 h', sin avisos de error ni de negativo", () => {
        const m = pantalla(aFavor);
        expect(m).toContain("La clínica te debe");
        expect(m).toMatch(/La clínica te debe<\/span><span class="cifra">2 h</);
        expect(m).not.toMatch(/negativo/i);
        expect(m).not.toContain("Revisa los pagos");
        expect(m).not.toContain("-2 h");
      });
      it("con deuda sigue diciendo 'Debo a la clínica'", () => {
        const m = pantalla(conDeuda);
        expect(m).toMatch(/Debo a la clínica<\/span><span class="cifra">8 h</);
        expect(m).not.toContain("La clínica te debe");
      });
    });
  }
});

describe("CC8: movimientos programados (RF-C7)", () => {
  describe("Inicio", () => {
    const m = html(<Inicio datos={conProgramado} alRegistrar={noop} alIrARespaldo={noop} />);
    it("el saldo grande es el actual: el programado todavía no cuenta", () => {
      expect(m).toMatch(/Debo a la clínica<\/span><span class="cifra">8 h</);
    });
    it("muestra el saldo proyectado, que sí lo incluye, y cuántos hay programados", () => {
      expect(m).toContain("Saldo proyectado");
      expect(m).toMatch(/Saldo proyectado<\/span><span class="etiqueta-valor__valor">6 h</);
      expect(m).toMatch(/1 programado/);
    });
    it("sin movimientos programados no aparece nada de proyectado", () => {
      const sin = html(<Inicio datos={conDeuda} alRegistrar={noop} alIrARespaldo={noop} />);
      expect(sin).not.toContain("Saldo proyectado");
      expect(sin).not.toMatch(/programado/i);
    });
    it("un saldo proyectado a favor también se dice 'La clínica te debe'", () => {
      const d = datosCon([mov("a", PASADO, "saldo_inicial", 60), mov("p", FUTURO, "pago", -180)]);
      expect(html(<Inicio datos={d} alRegistrar={noop} alIrARespaldo={noop} />)).toMatch(/Saldo proyectado<\/span><span class="etiqueta-valor__valor">La clínica te debe 2 h</);
    });
  });

  describe("Banco", () => {
    const m = html(<Banco datos={conProgramado} cambiar={noop} />);
    it("el movimiento con fecha futura lleva la etiqueta 'Programado' y el pasado no", () => {
      expect(m).toContain("Programado");
      expect(m.match(/Programado/g)).toHaveLength(1);
      expect(html(<Banco datos={conDeuda} cambiar={noop} />)).not.toContain("Programado");
    });
    it("muestra el saldo actual y el proyectado", () => {
      expect(m).toMatch(/Debo a la clínica<\/span><span class="cifra">8 h</);
      expect(m).toMatch(/Saldo proyectado<\/span><span class="etiqueta-valor__valor">6 h</);
    });
  });

  describe("Extracto", () => {
    const m = html(<Extracto datos={conProgramado} alIrABanco={noop} />);
    it("la fila futura lleva 'Programado'", () => {
      expect(m.match(/Programado/g)).toHaveLength(1);
    });
    it("el pie dice el saldo actual y el proyectado", () => {
      expect(m).toMatch(/Saldo actual<\/td><td class="num">8 h</);
      expect(m).toMatch(/Saldo proyectado<\/td><td class="num">6 h</);
    });
    it("sin programados, el extracto queda como antes: sin proyectado", () => {
      const sin = html(<Extracto datos={conDeuda} alIrABanco={noop} />);
      expect(sin).not.toContain("Saldo proyectado");
      expect(sin).not.toContain("Programado");
    });
    it("un saldo actual a favor se dice 'La clínica te debe 2 h'", () => {
      expect(html(<Extracto datos={aFavor} alIrABanco={noop} />)).toMatch(/Saldo actual<\/td><td class="num">La clínica te debe 2 h</);
    });
  });

  describe("filasExtracto y PDF dicen lo mismo que la pantalla", () => {
    it("filasExtracto marca la fila programada cuando se le da la fecha de hoy", () => {
      const filas = filasExtracto(conProgramado, "2026-10-15");
      expect(filas.find((f) => f.id === "p")?.detalle).toContain("Programado");
      expect(filas.find((f) => f.id === "a")?.detalle).not.toContain("Programado");
    });
    it("sin la fecha de hoy se comporta como antes (nada programado)", () => {
      expect(filasExtracto(conProgramado).some((f) => f.detalle.includes("Programado"))).toBe(false);
    });
    it("el PDF trae 'Programado' y las dos líneas de saldo", () => {
      const pdf = new TextDecoder("latin1").decode(construirExtractoPdf(conProgramado, "2026-10-15"));
      expect(pdf).toContain("(Programado)");
      expect(pdf).toContain("(Saldo actual");
      expect(pdf).toContain("(Saldo proyectado");
    });
    it("el PDF de un extracto sin programados no cambia: sin proyectado", () => {
      const pdf = new TextDecoder("latin1").decode(construirExtractoPdf(conDeuda, "2026-10-15"));
      expect(pdf).not.toContain("Saldo proyectado");
      expect(pdf).not.toContain("Programado");
    });
  });
});

describe("RF-C10: recordatorio de no escribir datos de pacientes en las notas", () => {
  const RECORDATORIO = "No escribas nombres ni documentos de pacientes";

  it("Campo puede llevar una ayuda debajo del campo", () => {
    const m = html(
      <Campo etiqueta="Nota" ayuda="Una ayuda">
        <Entrada />
      </Campo>,
    );
    expect(m).toContain('<span class="campo__ayuda">Una ayuda</span>');
    expect(html(<Campo etiqueta="Nota"><Entrada /></Campo>)).not.toContain("campo__ayuda");
  });
  it("el formulario de turno lo trae junto a la nota", () => {
    expect(html(<FormularioTurno plantillas={[]} onContinuar={noop} onCancelar={noop} />)).toContain(RECORDATORIO);
  });
  it("el formulario de movimiento lo trae junto a la nota, en todos los tipos", () => {
    for (const tipo of ["saldo_inicial", "prestamo", "pago", "ajuste"] as const) {
      expect(html(<FormularioMovimiento tipo={tipo} onGuardar={noop} onCancelar={noop} />)).toContain(RECORDATORIO);
    }
  });
});

describe("CC4: indicador de sincronización (RF-C4)", () => {
  it("con cambios sin confirmar dice que está guardado solo en el dispositivo", () => {
    const m = html(<IndicadorSincronizacion pendiente />);
    expect(m).toContain("Guardado solo en este dispositivo");
    expect(m).not.toContain("Sincronizado");
  });
  it("cuando el servidor ya confirmó, dice que está sincronizado", () => {
    const m = html(<IndicadorSincronizacion pendiente={false} />);
    expect(m).toContain("Sincronizado");
    expect(m).not.toContain("solo en este dispositivo");
  });
  it("se anuncia a los lectores de pantalla sin interrumpir", () => {
    expect(html(<IndicadorSincronizacion pendiente={false} />)).toMatch(/role="status"/);
  });
});
