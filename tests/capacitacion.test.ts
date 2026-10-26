import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAVE_COPIA_FORMATO_1, RepositorioLocal } from "../src/almacenamiento/local";
import { ErrorImportacion, exportarJSON, importar, importarJSON } from "../src/almacenamiento/respaldo";
import type { Datos } from "../src/almacenamiento/repositorio";
import { editarMovimiento, extracto, motivoDe, nuevoMovimiento, saldoNegativo, saldo, totales } from "../src/dominio/banco";
import { horasDeQuincena } from "../src/dominio/quincena";
import { minutosDeSemana } from "../src/dominio/semana";
import { filasExtracto } from "../src/ui/extractoFilas";
import { construirExtractoPdf } from "../src/ui/extractoPdf";
import { etiquetaMovimiento } from "../src/ui/utilidades";

const H = 60;
const AHORA = "2026-10-15T10:00:00";
const CLAVE_DATOS = "banco-horas:datos";

// Datos en el formato que la app guardaba ANTES de este cambio (schemaVersion 2, sin `motivo`),
// generados con el código real de esa versión.
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const GUARDADO = readFileSync(join(FIXTURES, "formato-2-localstorage.json"), "utf8");
const RESPALDO = readFileSync(join(FIXTURES, "formato-2-respaldo.json"), "utf8");
const original = JSON.parse(GUARDADO);

function almacenFalso(inicial: Record<string, string> = {}) {
  const mapa = new Map<string, string>(Object.entries(inicial));
  return { getItem: (k: string) => mapa.get(k) ?? null, setItem: (k: string, v: string) => void mapa.set(k, v), mapa };
}

const capacitacion = (extra: Partial<Parameters<typeof nuevoMovimiento>[0]> = {}) =>
  nuevoMovimiento({ tipo: "pago", motivo: "capacitacion_reunion", fecha: "2026-10-14", minutos: 2 * H, ...extra }, AHORA, "cap-1");

function textosDelPdf(datos: Datos): string[] {
  const pdf = new TextDecoder("latin1").decode(construirExtractoPdf(datos, "2026-10-15"));
  return [...pdf.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) =>
    m[1].replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, "$1"),
  );
}

describe("el fixture es de verdad el formato anterior a este cambio", () => {
  it("es schemaVersion 2 y ningún movimiento trae `motivo`", () => {
    expect(original.schemaVersion).toBe(2);
    expect(GUARDADO).not.toContain("motivo");
    expect(original.movimientos.some((m: { tipo: string; turnoId?: string }) => m.tipo === "pago" && !m.turnoId)).toBe(true);
  });
});

describe("RF14: los datos que ya estaban guardados siguen funcionando", () => {
  const datos = importarJSON(GUARDADO);

  it("se leen idénticos: mismos movimientos, mismo orden, sin inventar un `motivo`", () => {
    expect(datos.movimientos).toEqual(original.movimientos);
    for (const m of datos.movimientos) expect(Object.keys(m)).not.toContain("motivo");
  });

  it("los turnos, la configuración y el respaldo se conservan", () => {
    expect(datos.turnos).toEqual(original.turnos);
    expect(datos.config).toEqual({ ...original.config, inicioSemana: 0 }); // lo único nuevo: la semana de domingo a sábado
    expect(datos.ultimoRespaldo).toBe("2026-10-12");
  });

  it("el saldo es el de antes", () => {
    expect(saldo(datos.movimientos)).toBe(31 * H);
  });

  it("cargar con el repositorio no reescribe lo guardado ni crea copias", () => {
    const almacen = almacenFalso({ [CLAVE_DATOS]: GUARDADO });
    const leido = new RepositorioLocal(almacen).cargar();
    expect(leido.movimientos).toEqual(original.movimientos);
    expect(almacen.mapa.get(CLAVE_DATOS)).toBe(GUARDADO);
    expect(almacen.mapa.has(CLAVE_COPIA_FORMATO_1)).toBe(false);
  });

  it("un pago manual que ya existía se trata como 'Otro'", () => {
    const manuales = datos.movimientos.filter((m) => m.tipo === "pago" && !m.turnoId);
    expect(manuales).toHaveLength(2);
    for (const m of manuales) expect(motivoDe(m)).toBe("otro");
  });

  it("los pagos que salen de un turno y los demás movimientos no tienen motivo", () => {
    for (const m of datos.movimientos.filter((x) => x.tipo !== "pago" || x.turnoId)) expect(motivoDe(m)).toBeUndefined();
  });

  it("en el extracto los pagos viejos siguen llamándose 'Pago'", () => {
    const filas = filasExtracto(datos);
    expect(filas.filter((f) => f.tipo === "Capacitación o reunión")).toHaveLength(0);
    // 5 pagos: 3 que salieron de turnos y los 2 manuales
    expect(filas.filter((f) => f.tipo === "Pago")).toHaveLength(5);
  });

  it("agregar una capacitación y guardar no toca nada de lo anterior", () => {
    const repo = new RepositorioLocal(almacenFalso({ [CLAVE_DATOS]: GUARDADO }));
    const actual = repo.cargar();
    repo.guardar({ ...actual, movimientos: [...actual.movimientos, capacitacion()] });
    const releido = repo.cargar();
    expect(releido.movimientos.slice(0, original.movimientos.length)).toEqual(original.movimientos);
    expect(releido.movimientos.at(-1)).toMatchObject({ id: "cap-1", tipo: "pago", minutos: -2 * H, motivo: "capacitacion_reunion" });
    expect(saldo(releido.movimientos)).toBe(29 * H);
  });

  it("el motivo sobrevive a exportar e importar (no lo descarta el validador)", () => {
    const con = { ...datos, movimientos: [...datos.movimientos, capacitacion()] };
    const vuelto = importarJSON(exportarJSON(con));
    expect(vuelto).toEqual(con);
    expect(vuelto.movimientos.at(-1)?.motivo).toBe("capacitacion_reunion");
  });

  it("un respaldo viejo (formato 2) se importa y reemplaza los datos", () => {
    const repo = new RepositorioLocal(almacenFalso());
    importar(repo, RESPALDO);
    expect(repo.cargar().movimientos).toEqual(original.movimientos);
  });

  it("el formato 1, el más antiguo, también sigue funcionando y admite capacitaciones", () => {
    const viejo = importarJSON(readFileSync(join(FIXTURES, "formato-1-localstorage.json"), "utf8"));
    const con = { ...viejo, movimientos: [...viejo.movimientos, capacitacion()] };
    expect(importarJSON(exportarJSON(con))).toEqual(con);
  });
});

describe("CA14: pago por capacitación o reunión", () => {
  const movs = [
    nuevoMovimiento({ tipo: "saldo_inicial", fecha: "2026-10-01", minutos: 33 * H }, AHORA, "inicial"),
    capacitacion({ nota: "  Curso de bioseguridad, convocó la coordinadora " }),
  ];
  const datos: Datos = { ...importarJSON(GUARDADO), turnos: [], movimientos: movs };

  it("con saldo de 33 h, un pago por capacitación de 2 h deja el saldo en 31 h", () => {
    expect(saldo(movs)).toBe(31 * H);
  });

  it("es un pago manual: baja la deuda, sin turno, con su motivo, fecha y nota", () => {
    expect(movs[1]).toEqual({
      id: "cap-1",
      fecha: "2026-10-14",
      tipo: "pago",
      minutos: -2 * H,
      motivo: "capacitacion_reunion",
      automatico: false,
      nota: "Curso de bioseguridad, convocó la coordinadora",
      creadoEn: AHORA,
      modificadoEn: AHORA,
    });
    expect(motivoDe(movs[1])).toBe("capacitacion_reunion");
  });

  it("aparece en el extracto con la etiqueta 'Capacitación o reunión' y el saldo después", () => {
    const filas = filasExtracto(datos);
    expect(filas).toHaveLength(2);
    expect(filas[1]).toMatchObject({ tipo: "Capacitación o reunión", horas: "-2 h", saldo: "31 h" });
    expect(filas[1].detalle).toEqual(["Curso de bioseguridad, convocó la coordinadora"]);
    expect(extract0(movs)).toBe(31 * H);
  });

  it("también sale con esa etiqueta en el PDF, con el mismo saldo final", () => {
    const t = textosDelPdf(datos);
    expect(t).toContain("Capacitación o reunión");
    expect(t[t.indexOf("Saldo actual") + 1]).toBe("31 h");
  });

  it("la etiqueta de un pago con motivo 'Otro' es la de siempre", () => {
    expect(etiquetaMovimiento(capacitacion({ motivo: "otro" }))).toBe("Pago");
    expect(etiquetaMovimiento(capacitacion())).toBe("Capacitación o reunión");
  });

  it("cuenta como pagado y puede dejar el saldo en negativo con aviso, sin bloquear (CA4)", () => {
    expect(totales(movs)).toEqual({ prestado: 0, pagado: 2 * H });
    const mucho = [movs[0], capacitacion({ minutos: 40 * H })];
    expect(saldo(mucho)).toBe(-7 * H);
    expect(saldoNegativo(mucho)).toBe(true);
  });

  it("la duración de una capacitación puede ser de minutos, no solo horas enteras", () => {
    expect(capacitacion({ minutos: 90 }).minutos).toBe(-90);
  });
});

// el extracto en orden: el saldo de la última fila
const extract0 = (movimientos: Parameters<typeof extracto>[0]) => extracto(movimientos).at(-1)!.saldoDespues;

describe("CA15: no cambia horas por categoría ni la semana", () => {
  const datos = importarJSON(GUARDADO);
  const quincenas = [
    { anio: 2026, mes: 9, numero: 1 },
    { anio: 2026, mes: 9, numero: 2 },
    { anio: 2026, mes: 10, numero: 1 },
  ] as const;
  // un domingo (13 de septiembre) y un festivo (lunes 12 de octubre)
  const domingo = capacitacion({ fecha: "2026-09-13" });
  const festivo = capacitacion({ fecha: "2026-10-12" });

  it("las fechas elegidas son de verdad un domingo y un festivo", () => {
    expect(new Date("2026-09-13T12:00:00Z").getUTCDay()).toBe(0);
    expect(datos.config.festivosAgregados).toContain("2026-10-13"); // sanity del fixture
  });

  for (const [nombre, mov] of [["un domingo", domingo], ["un festivo", festivo]] as const) {
    it(`una capacitación en ${nombre} no cambia las horas por categoría de ninguna quincena`, () => {
      const antes = quincenas.map((q) => horasDeQuincena(datos.turnos, q, datos.config));
      const despues = { ...datos, movimientos: [...datos.movimientos, mov] };
      expect(despues.turnos).toBe(datos.turnos); // no se crea ni se toca ningún turno
      expect(quincenas.map((q) => horasDeQuincena(despues.turnos, q, despues.config))).toEqual(antes);
    });

    it(`una capacitación en ${nombre} no cambia el avance de la semana`, () => {
      const fechas = ["2026-09-14", "2026-10-05", "2026-10-12"];
      const antes = fechas.map((f) => minutosDeSemana(datos.turnos, f));
      const despues = { ...datos, movimientos: [...datos.movimientos, mov] };
      expect(fechas.map((f) => minutosDeSemana(despues.turnos, f))).toEqual(antes);
    });
  }

  it("la capacitación no lleva turno, ni descanso, ni categorías", () => {
    expect(domingo).not.toHaveProperty("turnoId");
    expect(domingo).not.toHaveProperty("descansoMin");
    expect(Object.keys(domingo).sort()).toEqual(
      ["automatico", "creadoEn", "fecha", "id", "minutos", "modificadoEn", "motivo", "tipo"].sort(),
    );
  });

  it("sí baja la deuda, aunque caiga en domingo o festivo", () => {
    expect(saldo([...datos.movimientos, domingo])).toBe(saldo(datos.movimientos) - 2 * H);
  });
});

describe("motivo: reglas del dominio", () => {
  const base = { tipo: "pago" as const, fecha: "2026-10-14", minutos: 60 };

  it("un pago sin motivo sigue siendo válido (así se creaban antes)", () => {
    expect(nuevoMovimiento(base, AHORA, "p1")).not.toHaveProperty("motivo");
  });
  it("acepta 'otro'", () => {
    expect(nuevoMovimiento({ ...base, motivo: "otro" }, AHORA, "p1").motivo).toBe("otro");
  });
  it("rechaza un motivo que no existe", () => {
    expect(() => nuevoMovimiento({ ...base, motivo: "viaje" as never }, AHORA, "p1")).toThrow(/motivo/i);
  });
  it("el motivo solo aplica a pagos", () => {
    for (const tipo of ["prestamo", "saldo_inicial", "ajuste"] as const) {
      expect(() => nuevoMovimiento({ ...base, tipo, motivo: "capacitacion_reunion" }, AHORA, "p1")).toThrow(/pago/i);
    }
  });
  it("motivoDe: un pago manual sin motivo es 'otro'; el resto, ninguno", () => {
    expect(motivoDe(nuevoMovimiento(base, AHORA, "p1"))).toBe("otro");
    expect(motivoDe(nuevoMovimiento({ ...base, tipo: "prestamo" }, AHORA, "p2"))).toBeUndefined();
    expect(motivoDe({ ...nuevoMovimiento(base, AHORA, "p3"), turnoId: "t1", automatico: true })).toBeUndefined();
  });
  it("editarMovimiento puede cambiar el motivo y lo deja como manual", () => {
    const viejo = nuevoMovimiento(base, AHORA, "p1");
    const editado = editarMovimiento(viejo, { motivo: "capacitacion_reunion" }, "2026-10-16T09:00:00");
    expect(editado).toMatchObject({ motivo: "capacitacion_reunion", automatico: false, modificadoEn: "2026-10-16T09:00:00" });
    expect(viejo).not.toHaveProperty("motivo");
  });
});

describe("motivo: validación al importar", () => {
  const conCambio = (cambio: (d: any) => void) => {
    const d = JSON.parse(exportarJSON(importarJSON(GUARDADO)));
    cambio(d);
    return JSON.stringify(d);
  };
  const manual = (d: any) => d.movimientos.find((m: any) => m.id === "mov-pago-manual-1");

  it("acepta los dos motivos en un pago", () => {
    for (const motivo of ["capacitacion_reunion", "otro"]) {
      expect(importarJSON(conCambio((d) => (manual(d).motivo = motivo))).movimientos.find((m) => m.id === "mov-pago-manual-1")?.motivo).toBe(motivo);
    }
  });
  it("rechaza un motivo desconocido", () => {
    expect(() => importarJSON(conCambio((d) => (manual(d).motivo = "viaje")))).toThrow(ErrorImportacion);
  });
  it("rechaza un motivo que no es texto", () => {
    expect(() => importarJSON(conCambio((d) => (manual(d).motivo = 5)))).toThrow(ErrorImportacion);
  });
  it("rechaza un motivo en un movimiento que no es un pago", () => {
    expect(() => importarJSON(conCambio((d) => (d.movimientos[0].motivo = "capacitacion_reunion")))).toThrow(ErrorImportacion);
  });
  it("un archivo inválido por el motivo no borra los datos actuales", () => {
    const repo = new RepositorioLocal(almacenFalso({ [CLAVE_DATOS]: GUARDADO }));
    expect(() => importar(repo, conCambio((d) => (manual(d).motivo = "viaje")))).toThrow(ErrorImportacion);
    expect(repo.cargar().movimientos).toEqual(original.movimientos);
  });
  it("lo que no es un campo conocido se sigue descartando", () => {
    const limpio = importarJSON(conCambio((d) => (manual(d).salario = 999)));
    expect(limpio.movimientos.find((m) => m.id === "mov-pago-manual-1")).not.toHaveProperty("salario");
  });
});
