import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");

/** Lo que dice parametros-iniciales.md: el primer bloque ```json. */
const esperado = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(leer("parametros-iniciales.md").replace(/\r\n/g, "\n"))![1]);

type ValorFirestore =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { mapValue: { fields?: Record<string, ValorFirestore> } }
  | { arrayValue: { values?: ValorFirestore[] } };

/** Pasa del formato de la API REST de Firestore (con tipos) a un JSON normal. */
function aPlano(v: ValorFirestore): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, aPlano(x)]));
  return (v.arrayValue.values ?? []).map(aPlano);
}

describe("parametros-iniciales.firestore.json (para crear el documento con la API de Firestore)", () => {
  const cuerpo = JSON.parse(leer("parametros-iniciales.firestore.json")) as { fields: Record<string, ValorFirestore> };

  it("tiene el mismo contenido que parametros-iniciales.md", () => {
    const plano = Object.fromEntries(Object.entries(cuerpo.fields).map(([k, v]) => [k, aPlano(v)]));
    expect(plano).toEqual(esperado);
  });
  it("los números van como enteros y las horas como texto (el tipo importa)", () => {
    const regla = (cuerpo.fields.reglas as { mapValue: { fields: Record<string, { mapValue: { fields: Record<string, ValorFirestore> } }> } }).mapValue.fields["2026-01-01"].mapValue.fields;
    expect(regla.minutosSemana).toEqual({ integerValue: "2520" });
    expect(regla.desfaseQuincenas).toEqual({ integerValue: "1" });
    expect(regla.extrasDescuentanDeuda).toEqual({ booleanValue: true });
    expect(regla.nocturnoDesde).toEqual({ stringValue: "19:00" });
  });
  it("los nombres de las plantillas llevan tilde", () => {
    expect(JSON.stringify(cuerpo)).toContain("Día 8 h");
    expect(JSON.stringify(cuerpo)).toContain("Día 12 h");
  });
});
