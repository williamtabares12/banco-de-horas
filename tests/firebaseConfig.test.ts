import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8").replace(/\r\n/g, "\n");

describe("entorno de Firebase (T22)", () => {
  const firebase = JSON.parse(leer("firebase.json"));

  it("el proyecto por defecto es el de la versión para compañeros", () => {
    expect(JSON.parse(leer(".firebaserc")).projects.default).toBe("banco-horas-f6890");
  });

  it("hay emuladores de Auth y Firestore en puertos fijos", () => {
    expect(firebase.emulators.auth.port).toBe(9099);
    expect(firebase.emulators.firestore.port).toBe(8080);
  });

  it("Firestore apunta a un archivo de reglas que existe y que, por ahora, lo deniega todo", () => {
    const archivo = firebase.firestore.rules;
    expect(existsSync(join(RAIZ, archivo))).toBe(true);
    expect(leer(archivo)).toMatch(/allow read, write: if false/);
  });

  it("`npm run emuladores` levanta Auth y Firestore", () => {
    const paquete = JSON.parse(leer("package.json"));
    expect(paquete.scripts.emuladores).toMatch(/firebase emulators:start/);
    expect(paquete.scripts.emuladores).toMatch(/auth/);
    expect(paquete.scripts.emuladores).toMatch(/firestore/);
    expect(paquete.devDependencies["firebase-tools"]).toBeDefined();
  });

  it("no hay llaves de cuenta de servicio ni archivos de credenciales en el repositorio", () => {
    const sospechosos: string[] = [];
    const recorrer = (c: string) => {
      for (const nombre of readdirSync(c)) {
        if (["node_modules", ".git", "dist"].includes(nombre)) continue;
        const ruta = join(c, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/serviceAccount|service-account|\.env($|\.)|credentials.*\.json$/i.test(nombre)) sospechosos.push(ruta);
        else if (/\.(json|ts|tsx|mjs|md)$/.test(nombre) && !ruta.endsWith("firebaseConfig.test.ts") && /-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(readFileSync(ruta, "utf8"))) sospechosos.push(ruta);
      }
    };
    recorrer(RAIZ);
    expect(sospechosos).toEqual([]);
  });

  it("los datos de los emuladores no se suben a git", () => {
    expect(leer(".gitignore")).toMatch(/firebase-debug\.log|\*-debug\.log|\*\.log/);
    expect(leer(".gitignore")).toMatch(/\.firebase\//);
  });
});
