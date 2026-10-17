// Generador mínimo de PDF, sin dependencias: solo texto y líneas, con las tipografías estándar
// Helvetica y Helvetica-Bold (que todo lector de PDF trae). Basta para el extracto y evita sumar
// una librería de ~300 KB que cada celular tendría que descargar.

/** Medidas de Helvetica (milésimas de em) de los caracteres ASCII 32 a 126. */
const ANCHOS_ASCII = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // espacio a /
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, // 0 a 9
  278, 278, 584, 584, 584, 556, 1015, // : a @
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, // A a Z
  278, 278, 278, 469, 556, 333, // [ a `
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, // a a z
  334, 260, 334, 584, // { a ~
];

/** Signos del español que no son ASCII y no salen de quitarles la tilde. */
const ANCHOS_EXTRA: Record<string, number> = { "¿": 611, "¡": 333, "°": 400, "·": 278 };

const FACTOR_NEGRITA = 1.07; // Helvetica-Bold es un poco más ancha

/** Ancho aproximado de un texto, en puntos. Las letras con tilde miden como la letra base. */
export function anchoTexto(texto: string, tam: number, negrita = false): number {
  let milesimas = 0;
  for (const c of texto.normalize("NFD").replace(/[̀-ͯ]/g, "")) {
    const codigo = c.codePointAt(0)!;
    if (codigo >= 32 && codigo <= 126) milesimas += ANCHOS_ASCII[codigo - 32];
    else milesimas += ANCHOS_EXTRA[c] ?? 556;
  }
  return ((milesimas * tam) / 1000) * (negrita ? FACTOR_NEGRITA : 1);
}

/** Parte un texto en líneas que caben en `ancho` puntos. Una palabra demasiado larga se parte por letras. */
export function ajustarTexto(texto: string, ancho: number, tam: number): string[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [""];
  const lineas: string[] = [];
  let linea = "";
  for (const palabra of palabras) {
    const candidata = linea ? `${linea} ${palabra}` : palabra;
    if (anchoTexto(candidata, tam) <= ancho) {
      linea = candidata;
      continue;
    }
    if (linea) lineas.push(linea);
    linea = "";
    if (anchoTexto(palabra, tam) <= ancho) {
      linea = palabra;
      continue;
    }
    let trozo = "";
    for (const letra of palabra) {
      if (trozo && anchoTexto(trozo + letra, tam) > ancho) {
        lineas.push(trozo);
        trozo = "";
      }
      trozo += letra;
    }
    linea = trozo;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

/**
 * Convierte un texto a la cadena que va entre paréntesis en el PDF, en la codificación WinAnsi.
 * Latin-1 (tildes, ñ, ¿, ¡, °, ·) sale como escape octal; lo que la tipografía no tiene se cambia por "?".
 */
function codificar(texto: string): string {
  let salida = "";
  for (const c of texto) {
    const codigo = c.codePointAt(0)!;
    if (codigo === 40 || codigo === 41 || codigo === 92) salida += `\\${c}`;
    else if (codigo >= 32 && codigo <= 126) salida += c;
    else if (codigo >= 160 && codigo <= 255) salida += `\\${codigo.toString(8).padStart(3, "0")}`;
    else if (codigo === 9 || codigo === 10 || codigo === 13) salida += " ";
    else salida += "?";
  }
  return salida;
}

const num = (n: number) => String(Number(n.toFixed(2)));

export type OpcionesTexto = {
  tam?: number;
  negrita?: boolean;
  gris?: boolean;
  alinear?: "izq" | "der" | "centro";
};

/** Documento de tamaño carta. Se dibuja página por página con coordenadas en puntos (origen abajo a la izquierda). */
export class Pdf {
  readonly ancho = 612;
  readonly alto = 792;
  private paginas: string[][] = [[]];
  private actual = 0;

  get numPaginas(): number {
    return this.paginas.length;
  }

  nuevaPagina(): void {
    this.paginas.push([]);
    this.actual = this.paginas.length - 1;
  }

  irAPagina(indice: number): void {
    this.actual = indice;
  }

  /** `x` es el borde izquierdo, el derecho o el centro del texto, según `alinear`. */
  texto(x: number, y: number, texto: string, { tam = 10, negrita = false, gris = false, alinear = "izq" }: OpcionesTexto = {}): void {
    const ancho = anchoTexto(texto, tam, negrita);
    const px = alinear === "der" ? x - ancho : alinear === "centro" ? x - ancho / 2 : x;
    const color = gris ? "0.4 g " : "";
    const restaurar = gris ? " 0 g" : "";
    this.paginas[this.actual].push(
      `${color}BT /${negrita ? "F2" : "F1"} ${num(tam)} Tf ${num(px)} ${num(y)} Td (${codificar(texto)}) Tj ET${restaurar}`,
    );
  }

  linea(x1: number, x2: number, y: number): void {
    this.paginas[this.actual].push(`0.75 G 0.5 w ${num(x1)} ${num(y)} m ${num(x2)} ${num(y)} l S 0 G`);
  }

  /** El archivo PDF completo. Es ASCII puro, así que cada carácter es un byte. */
  bytes(): Uint8Array<ArrayBuffer> {
    const cuerpos: string[] = [];
    const hijas: number[] = [];
    // objetos 1 a 4 fijos; luego, por cada página, su objeto y su contenido; al final, la información
    for (let i = 0; i < this.paginas.length; i++) hijas.push(5 + 2 * i);
    cuerpos.push("<< /Type /Catalog /Pages 2 0 R >>");
    cuerpos.push(`<< /Type /Pages /Kids [${hijas.map((n) => `${n} 0 R`).join(" ")}] /Count ${this.paginas.length} >>`);
    cuerpos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    cuerpos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    this.paginas.forEach((ops, i) => {
      const contenido = ops.join("\n");
      cuerpos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.ancho} ${this.alto}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + 2 * i} 0 R >>`,
      );
      cuerpos.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    });
    const info = cuerpos.length + 1;
    cuerpos.push("<< /Title (Extracto de horas) /Producer (Arena) >>");

    let salida = "%PDF-1.4\n";
    const posiciones: number[] = [];
    cuerpos.forEach((cuerpo, i) => {
      posiciones.push(salida.length);
      salida += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
    });
    const xref = salida.length;
    salida += `xref\n0 ${cuerpos.length + 1}\n0000000000 65535 f \n`;
    for (const p of posiciones) salida += `${String(p).padStart(10, "0")} 00000 n \n`;
    salida += `trailer\n<< /Size ${cuerpos.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(salida);
  }
}
