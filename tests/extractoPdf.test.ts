import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importarJSON } from "../src/almacenamiento/respaldo";
import type { Datos } from "../src/almacenamiento/repositorio";
import { saldo } from "../src/dominio/banco";
import { formatearDuracion } from "../src/dominio/tiempo";
import { filasExtracto } from "../src/ui/extractoFilas";
import { construirExtractoPdf } from "../src/ui/extractoPdf";
import { ajustarTexto, anchoTexto } from "../src/ui/pdf";

// Datos reales del formato anterior, ya migrados: saldo inicial, préstamos, pagos y un ajuste
const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "formato-1-localstorage.json");
const datos: Datos = importarJSON(readFileSync(FIXTURE, "utf8"));
const HOY = "2026-10-13";

const aTexto = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

/** Lee las cadenas que el PDF dibuja con `(texto) Tj`, deshaciendo los escapes. */
function textos(pdf: string): string[] {
  return [...pdf.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) =>
    m[1].replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, "$1"),
  );
}

/** Comprueba que la tabla de referencias cruzadas apunta de verdad a cada objeto. */
function verificarXref(pdf: string) {
  const inicio = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(pdf)![1]);
  expect(pdf.slice(inicio, inicio + 5)).toBe("xref\n");
  const lineas = pdf.slice(inicio).split("\n");
  const cuantos = Number(lineas[1].split(" ")[1]);
  expect(lineas[2]).toBe("0000000000 65535 f ");
  for (let i = 1; i < cuantos; i++) {
    const entrada = lineas[2 + i];
    expect(entrada).toMatch(/^\d{10} 00000 n $/); // 19 caracteres + salto = 20 bytes por entrada
    expect(pdf.slice(Number(entrada.slice(0, 10))).startsWith(`${i} 0 obj\n`)).toBe(true);
  }
  expect(pdf).toContain(`/Size ${cuantos}`);
}

function datosConMuchos(n: number): Datos {
  const movimientos = Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    fecha: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
    tipo: "prestamo" as const,
    minutos: 60,
    automatico: false,
    nota: `Movimiento número ${i}`,
    creadoEn: `2026-09-01T08:${String(i % 60).padStart(2, "0")}:00`,
    modificadoEn: "2026-09-01T08:00:00",
  }));
  return { ...datos, turnos: [], movimientos };
}

describe("filasExtracto", () => {
  const filas = filasExtracto(datos);

  it("devuelve una fila por movimiento, en orden cronológico", () => {
    expect(filas).toHaveLength(6);
    expect(filas.map((f) => f.fecha)).toEqual([...filas.map((f) => f.fecha)].sort());
    expect(filas[0]).toMatchObject({ tipo: "Saldo inicial", horas: "+40 h 30 min", saldo: "40 h 30 min" });
  });

  it("muestra el turno que originó el movimiento y la nota", () => {
    const pago = filas.find((f) => f.fecha === "2026-09-14")!;
    expect(pago.tipo).toBe("Pago");
    expect(pago.detalle).toEqual(["turno del 2026-09-14, 07:00 a 19:00"]);
    const corregido = filas.find((f) => f.fecha === "2026-09-16")!;
    expect(corregido.detalle).toEqual(["turno del 2026-09-16, 07:00 a 11:00", "La clínica reconoció 3 h 30"]);
  });

  it("las horas llevan signo y el saldo es el acumulado", () => {
    expect(filas.map((f) => f.horas)).toEqual(["+40 h 30 min", "+6 h", "-4 h", "+3 h 30 min", "-8 h", "-30 min"]);
    expect(filas[filas.length - 1].saldo).toBe(formatearDuracion(saldo(datos.movimientos)));
  });
});

describe("medidas de texto", () => {
  it("anchoTexto usa las medidas de Helvetica", () => {
    // H=722, o=556, l=222, a=556 (milésimas de em) a 10 pt
    expect(anchoTexto("Hola", 10)).toBeCloseTo(20.56, 5);
  });
  it("las letras con tilde miden como la letra base", () => {
    expect(anchoTexto("ñó", 10)).toBeCloseTo(anchoTexto("no", 10), 5);
  });
  it("ajustarTexto parte el texto en líneas que caben", () => {
    const texto = "La clínica reconoció tres horas y media por la salida anticipada del turno del miércoles";
    const lineas = ajustarTexto(texto, 120, 9);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(anchoTexto(l, 9)).toBeLessThanOrEqual(120);
    expect(lineas.join(" ")).toBe(texto);
  });
  it("una palabra más larga que la columna se parte por letras", () => {
    const lineas = ajustarTexto("a".repeat(200), 100, 9);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(anchoTexto(l, 9)).toBeLessThanOrEqual(100);
    expect(lineas.join("")).toBe("a".repeat(200));
  });
  it("un texto vacío da una sola línea vacía", () => {
    expect(ajustarTexto("", 100, 9)).toEqual([""]);
  });
});

describe("construirExtractoPdf: estructura del archivo", () => {
  const bytes = construirExtractoPdf(datos, HOY);
  const pdf = aTexto(bytes);

  it("es un PDF: empieza con la cabecera y termina con %%EOF", () => {
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
  });
  it("la tabla de referencias apunta a cada objeto", () => verificarXref(pdf));
  it("es ASCII puro: nada de bytes sueltos que un lector pueda malinterpretar", () => {
    for (const b of bytes) expect(b).toBeLessThan(128);
  });
  it("declara tipografías estándar con la codificación de Windows (tildes y ñ)", () => {
    expect(pdf).toContain("/BaseFont /Helvetica");
    expect(pdf).toContain("/BaseFont /Helvetica-Bold");
    expect(pdf.match(/\/Encoding \/WinAnsiEncoding/g)).toHaveLength(2);
  });
  it("el tamaño de hoja es carta", () => {
    expect(pdf).toContain("/MediaBox [0 0 612 792]");
  });
  it("la longitud declarada de cada contenido es la real", () => {
    for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) {
      expect(m[2].length).toBe(Number(m[1]));
    }
  });
  it("los datos pequeños caben en una sola página", () => {
    expect(pdf).toContain("/Count 1");
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
  });
});

describe("construirExtractoPdf: contenido", () => {
  const t = textos(aTexto(construirExtractoPdf(datos, HOY)));

  it("lleva el título, la fecha de generación y los encabezados de la tabla", () => {
    expect(t).toContain("Extracto de horas");
    expect(t.some((x) => x.includes(`Generado el ${HOY}`))).toBe(true);
    for (const h of ["Fecha", "Movimiento", "Horas", "Saldo"]) expect(t).toContain(h);
  });

  it("cada movimiento aparece con su fecha, su nota y su saldo", () => {
    for (const esperado of ["Saldo inicial", "Saldo tras el terremoto", "+40 h 30 min", "40 h 30 min", "Autorizó la coordinadora", "Corrección", "-30 min"]) {
      expect(t, esperado).toContain(esperado);
    }
    expect(t).toContain("2026-08-10");
    expect(t).toContain("2026-09-25");
  });

  it("los movimientos salen en orden cronológico", () => {
    const orden = ["Saldo inicial", "Préstamo", "Pago", "Ajuste"].map((x) => t.indexOf(x));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect(orden[0]).toBeLessThan(orden[1]);
    expect(t.indexOf("2026-08-10")).toBeLessThan(t.indexOf("2026-09-25"));
  });

  it("CA7: el saldo actual del PDF es el de la pantalla principal", () => {
    const i = t.indexOf("Saldo actual");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(t[i + 1]).toBe(formatearDuracion(saldo(datos.movimientos)));
    expect(t[i + 1]).toBe("37 h 30 min");
  });

  it("no pone dinero ni datos que no estén en la app", () => {
    expect(t.join(" ")).not.toMatch(/\$|COP|pesos|salario/i);
  });
});

describe("construirExtractoPdf: texto difícil", () => {
  function conNota(nota: string): string[] {
    const d: Datos = { ...datos, turnos: [], movimientos: [{ ...datos.movimientos[0], nota }] };
    const bytes = construirExtractoPdf(d, HOY);
    verificarXref(aTexto(bytes));
    return textos(aTexto(bytes));
  }

  it("las tildes, la ñ y los signos del español salen bien", () => {
    expect(conNota("Coordinación: ¿señor Muñoz? ¡Sí! 3° piso · ok")).toContain("Coordinación: ¿señor Muñoz? ¡Sí! 3° piso · ok");
  });
  it("los paréntesis y la barra invertida no rompen el archivo", () => {
    expect(conNota("turno (urgente) \\ fin")).toContain("turno (urgente) \\ fin");
  });
  it("lo que no existe en la tipografía (emoji, otros alfabetos) se cambia por ?", () => {
    const t = conNota("listo 😀 ✓");
    expect(t).toContain("listo ? ?");
  });
  it("una nota muy larga se reparte en varias líneas dentro de la columna", () => {
    const nota = "Autorizó la coordinadora después de revisar los turnos de la semana completa y hablar con el jefe del servicio ".repeat(3).trim();
    const t = conNota(nota);
    // el texto va después de la fila "Saldo inicial / +40 h 30 min / 40 h 30 min" y antes de "Saldo actual"
    const partes = t.slice(t.indexOf("Saldo inicial") + 3, t.indexOf("Saldo actual"));
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.join(" ")).toBe(nota);
    for (const p of partes) expect(anchoTexto(p, 8.5)).toBeLessThanOrEqual(258);
  });
});

describe("construirExtractoPdf: varias páginas", () => {
  const muchos = datosConMuchos(120);
  const pdf = aTexto(construirExtractoPdf(muchos, HOY));
  const t = textos(pdf);

  it("reparte los movimientos en varias páginas", () => {
    const paginas = pdf.match(/\/Type \/Page\b/g)!.length;
    expect(paginas).toBeGreaterThan(2);
    expect(pdf).toContain(`/Count ${paginas}`);
    verificarXref(pdf);
  });
  it("cada página lleva su número y el total", () => {
    const paginas = pdf.match(/\/Type \/Page\b/g)!.length;
    for (let i = 1; i <= paginas; i++) expect(t).toContain(`Página ${i} de ${paginas}`);
  });
  it("los encabezados de la tabla se repiten en cada página", () => {
    const paginas = pdf.match(/\/Type \/Page\b/g)!.length;
    expect(t.filter((x) => x === "Movimiento")).toHaveLength(paginas);
  });
  it("no se pierde ningún movimiento y el saldo actual es el correcto", () => {
    for (let i = 0; i < 120; i++) expect(t).toContain(`Movimiento número ${i}`);
    expect(t[t.indexOf("Saldo actual") + 1]).toBe("120 h");
  });
  it("el saldo actual no queda solo en una página sin ningún movimiento", () => {
    // la página que contiene "Saldo actual" también contiene al menos un movimiento
    const contenidos = [...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => textos(m[1]));
    const conSaldo = contenidos.find((c) => c.includes("Saldo actual"))!;
    expect(conSaldo.some((x) => x.startsWith("Movimiento número"))).toBe(true);
  });
});

describe("construirExtractoPdf: sin movimientos", () => {
  const vacio: Datos = { ...datos, turnos: [], movimientos: [] };
  const pdf = aTexto(construirExtractoPdf(vacio, HOY));

  it("genera un PDF válido de una página con un aviso", () => {
    verificarXref(pdf);
    expect(pdf).toContain("/Count 1");
    expect(textos(pdf).some((x) => x.includes("Todavía no hay movimientos"))).toBe(true);
  });
});
