// El nombre Arena y el ícono nuevo (estilo-visual.md §6b, T37).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

describe("la app se llama Arena", () => {
  it("el título de la página y el manifiesto de la PWA", () => {
    expect(leer("index.html")).toMatch(/<title>Arena<\/title>/);
    const vite = leer("vite.config.ts");
    expect(vite).toMatch(/name:\s*'Arena'/);
    expect(vite).toMatch(/short_name:\s*'Arena'/);
  });

  it("ninguna pantalla ni el PDF dicen 'Banco de horas'", () => {
    const encontrados: string[] = [];
    const recorrer = (c: string) => {
      for (const n of readdirSync(c)) {
        const ruta = join(c, n);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.(tsx?|css)$/.test(n) && /Banco de horas/.test(readFileSync(ruta, "utf8"))) encontrados.push(relative(RAIZ, ruta).replace(/\\/g, "/"));
      }
    };
    recorrer(join(RAIZ, "src"));
    expect(encontrados).toEqual([]);
  });

  it("el color de la barra del navegador es el color base del fondo de vidrio (#B9D2D2)", () => {
    expect(leer("index.html")).toContain('content="#B9D2D2"');
    expect(leer("vite.config.ts")).toMatch(/theme_color:\s*'#B9D2D2'/);
  });
});

// ---------- íconos ----------
/** Lee un PNG de 8 bits sin entrelazado (RGB o RGBA), con todos los filtros de fila. */
function leerPng(ruta: string) {
  const bytes = readFileSync(join(RAIZ, ruta));
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  let pos = 8;
  let ancho = 0, alto = 0, tipo = 0;
  const datos: Buffer[] = [];
  while (pos < bytes.length) {
    const largo = bytes.readUInt32BE(pos);
    const nombre = bytes.toString("ascii", pos + 4, pos + 8);
    const cuerpo = bytes.subarray(pos + 8, pos + 8 + largo);
    if (nombre === "IHDR") {
      ancho = cuerpo.readUInt32BE(0);
      alto = cuerpo.readUInt32BE(4);
      expect(cuerpo[8]).toBe(8); // 8 bits por canal
      tipo = cuerpo[9];
      expect(cuerpo[12]).toBe(0); // sin entrelazado
    }
    if (nombre === "IDAT") datos.push(cuerpo);
    pos += 12 + largo;
  }
  expect([2, 6]).toContain(tipo);
  const bpp = tipo === 6 ? 4 : 3;
  const crudo = inflateSync(Buffer.concat(datos));
  const fila = ancho * bpp;
  const px = Buffer.alloc(alto * fila);
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (fila + 1)];
    for (let i = 0; i < fila; i++) {
      const v = crudo[y * (fila + 1) + 1 + i];
      const a = i >= bpp ? px[y * fila + i - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * fila + i] : 0;
      const c = i >= bpp && y > 0 ? px[(y - 1) * fila + i - bpp] : 0;
      let pred = 0;
      if (filtro === 1) pred = a;
      else if (filtro === 2) pred = b;
      else if (filtro === 3) pred = (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * fila + i] = (v + pred) & 255;
    }
  }
  return {
    ancho,
    alto,
    pixel: (x: number, y: number) => [0, 1, 2].map((k) => px[y * fila + x * bpp + k]),
    alfa: (x: number, y: number) => (bpp === 4 ? px[y * fila + x * bpp + 3] : 255),
  };
}
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const cerca = (a: number[], b: number[], tolerancia = 6) => a.every((v, i) => Math.abs(v - b[i]) <= tolerancia);

const TEXTO = rgb("#1F2A2E"); // --texto: el fondo del ícono
const CONTORNO = rgb("#F2F6F6"); // el contorno del reloj en el ícono (estilo-visual.md §8)
const ARENA = rgb("#5FA8A8"); // la arena en el ícono (estilo-visual.md §8)

describe("íconos de la app (icono-app-oscuro.svg)", () => {
  const casos: [string, number][] = [
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
    ["public/apple-touch-icon.png", 180],
  ];

  for (const [archivo, lado] of casos) {
    describe(archivo, () => {
      const png = leerPng(archivo);

      it(`mide ${lado} x ${lado}`, () => {
        expect(png.ancho).toBe(lado);
        expect(png.alto).toBe(lado);
      });
      it("el fondo es el color de texto y llega a las cuatro esquinas, sin transparencia", () => {
        for (const [x, y] of [[0, 0], [lado - 1, 0], [0, lado - 1], [lado - 1, lado - 1]]) {
          expect(png.pixel(x, y)).toEqual(TEXTO);
          expect(png.alfa(x, y)).toBe(255);
        }
      });
      it("el contorno del reloj es #F2F6F6 (la tapa de arriba, a la mitad del ancho)", () => {
        const y = Math.round((160 / 512) * lado);
        expect(cerca(png.pixel(Math.round(lado / 2), y), CONTORNO)).toBe(true);
      });
      it("la arena es #5FA8A8", () => {
        const y = Math.round((208 / 512) * lado);
        expect(cerca(png.pixel(Math.round(lado / 2), y), ARENA)).toBe(true);
      });
      it("todo el dibujo cabe dentro del círculo central del 80 % (así sirve como ícono 'maskable')", () => {
        const centro = (lado - 1) / 2;
        const radioSeguro = lado * 0.4;
        let masLejos = 0;
        for (let y = 0; y < lado; y++) {
          for (let x = 0; x < lado; x++) {
            if (!cerca(png.pixel(x, y), TEXTO, 40)) masLejos = Math.max(masLejos, Math.hypot(x - centro, y - centro));
          }
        }
        expect(masLejos).toBeGreaterThan(0); // hay dibujo
        expect(masLejos).toBeLessThanOrEqual(radioSeguro);
      });
    });
  }

  it("el manifiesto usa los de 192 y 512 (el de 512 también como maskable) y la etiqueta apple-touch-icon", () => {
    const vite = leer("vite.config.ts");
    expect(vite).toContain("icon-192.png");
    expect(vite).toMatch(/icon-512\.png[^}]*maskable/);
    expect(leer("index.html")).toContain('href="apple-touch-icon.png"');
  });
});
