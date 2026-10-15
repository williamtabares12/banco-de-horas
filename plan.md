# Plan técnico: App de banco de horas

Deriva de spec-banco-de-horas.md (v0.5). Si algo de aquí contradice el spec, manda el spec.

## 1. Decisiones

- React + Vite + TypeScript. TypeScript por las cuentas de minutos y fechas, donde un tipo mal puesto da errores silenciosos.
- Vitest para pruebas. Las reglas de negocio se escriben con la prueba primero.
- Sin librería de fechas. Los turnos se manejan en minutos enteros y las fechas como texto local ("2026-09-12T19:00"). Colombia no tiene horario de verano, así que no hay saltos de hora que cuidar.
- Datos en localStorage detrás de una interfaz `Repositorio`. Son pocos datos (cientos de turnos), y la interfaz permite cambiar a IndexedDB sin tocar el resto. El respaldo es exportar/importar JSON.
- Sin router. Cinco pestañas con un estado simple.
- Estilos con CSS plano, pensado primero para celular. Estilos de impresión para el extracto. Diseño visual estilo Wise: verde bosque (#163300) con lima (#9fe870) solo en acciones primarias y estados activos, botones en píldora, tipografía Inter con el título y el saldo en peso 900. Los tokens están en `src/index.css`. Solo tema claro. Inter va empaquetada con la app (`@fontsource-variable/inter`, solo el subconjunto latino, ~48 KB) y el service worker la guarda para que se vea igual sin internet.
- PWA con vite-plugin-pwa, en una tarea aparte y solo cuando todo lo demás funcione.
- Sin servidor, sin cuentas, sin analítica.
- Los datos guardados llevan un número de versión (`schemaVersion`). Cuando cambia el modelo se escribe una migración, para no perder lo que ya está en el celular.

## 2. Estructura de carpetas

```
src/
  dominio/          lógica pura, sin React ni localStorage
    tiempo.ts       fechas, minutos, quincena, semana
    festivos.ts     festivos de Colombia
    segmentar.ts    parte un turno en categorías de horas
    banco.ts        movimientos automáticos, saldo y extracto
    semana.ts       avance de las 42 horas
    tipos.ts        tipos de datos
  almacenamiento/
    repositorio.ts  interfaz
    local.ts        implementación con localStorage
    respaldo.ts     exportar/importar JSON
  ui/
    pantallas/      Inicio, Turnos, Banco, Quincena, Extracto, Ajustes
    componentes/
  App.tsx
tests/              una prueba por criterio de aceptación
```

Regla: `dominio/` no importa nada de `ui/` ni de `almacenamiento/`.

## 3. Modelo de datos

```ts
type Turno = {
  id: string
  inicio: string            // "2026-09-12T19:00"
  fin: string               // "2026-09-13T03:00" (siempre posterior a inicio)
  descansoMin: number       // minutos descontados (almuerzo, desayuno, tarde); 0 en turnos viejos
  minutosProgramados: number  // netos, ya sin descanso
  tipo: "ordinario" | "alquiler"
  destino?: "deuda" | "semana"   // solo si tipo = alquiler
  nota?: string
  creadoEn: string
  modificadoEn: string
}

type MovimientoBanco = {
  id: string
  fecha: string             // "2026-09-12"
  tipo: "saldo_inicial" | "prestamo" | "pago" | "ajuste"
  minutos: number           // + sube la deuda, - la baja
  turnoId?: string          // si lo generó un turno
  motivo?: "capacitacion_reunion" | "otro"   // solo en pagos manuales; vacío en el resto
  automatico: boolean       // false si Alejandro lo editó a mano
  nota?: string
  creadoEn: string
  modificadoEn: string
}

type Config = {
  minutosSemana: number           // 42 * 60
  nocturnoDesde: string           // "19:00"
  nocturnoHasta: string           // "06:00"
  desfaseQuincenas: 0 | 1         // 1
  extrasDescuentanDeuda: boolean  // true
  festivosAgregados: string[]
  festivosQuitados: string[]
  plantillas: PlantillaTurno[]
}

type PlantillaTurno = {
  id: string
  nombre: string            // "Día 8 h"
  inicio: string            // "07:00"
  fin: string               // "16:00" (si es menor que inicio, cruza medianoche)
  descansoMin: number       // 60
}
```

## 4. Algoritmos

Segmentación (`segmentar.ts`). Recorre el turno minuto a minuto y clasifica cada minuto por su fecha calendario y su hora:

- Domingo o festivo, entre 06:00 y 19:00: dominicalDiurno.
- Domingo o festivo, de 19:00 a 06:00: dominicalNocturno.
- Otro día, de 19:00 a 06:00: nocturno.
- Resto: diurno.

Un turno de 12 horas son 720 iteraciones, no hace falta optimizar. Devuelve minutos por categoría, agrupados por quincena.

Descanso. Después de clasificar los minutos, se resta `descansoMin` de la categoría con más minutos en el turno (en empate, la primera en este orden: nocturno, dominicalNocturno, dominicalDiurno, diurno), sin bajar de cero. Si el turno cruza dos quincenas, el descanso se resta de la quincena donde está esa categoría mayoritaria. Es una suposición del spec (sección 13, punto 4) y vive en una sola función para cambiarla fácil.

Minutos netos de un turno = (fin - inicio) - descansoMin. Es lo que usan banco y semana.

Quincena (`tiempo.ts`). Día 1 al 15 es la 1a quincena. Día 16 en adelante es la 2a. Colilla donde se cobra = quincena de trabajo + desfaseQuincenas. Lo trabajado del 1 al 15 de septiembre se cobra en la 2a quincena de septiembre.

Festivos (`festivos.ts`). Se calculan por código:

- Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
- Se mueven al lunes siguiente (si no caen en lunes): 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
- Según la Pascua (algoritmo de computus): Jueves Santo y Viernes Santo sin mover. Ascensión, Corpus Christi y Sagrado Corazón se mueven al lunes (Pascua + 39, + 60 y + 68 días, y de ahí al lunes siguiente).
- Luego se aplican festivosAgregados y festivosQuitados.

Salen de la ley Emiliani, de memoria. T1 exige comparar 2026 y 2027 con el calendario oficial.

Banco (`banco.ts`). Por cada turno:

- Ordinario: delta = minutos netos - minutosProgramados. Si delta > 0 y extrasDescuentanDeuda, movimiento "pago" de -delta. Si delta < 0, movimiento "prestamo" de +|delta|. Si es 0, nada.
- Alquiler con destino "deuda": movimiento "pago" de -minutos netos.
- Alquiler con destino "semana": ningún movimiento.

Si Alejandro edita un movimiento automático, `automatico` pasa a false y editar el turno después ya no lo sobrescribe. Saldo = suma de `minutos` de todos los movimientos. Extracto = movimientos ordenados por fecha y luego por creadoEn, con el saldo acumulado después de cada uno.

Pago por capacitación o reunión. Es un `MovimientoBanco` de tipo "pago" con `motivo: "capacitacion_reunion"`, sin `turnoId`, y `automatico: false`. No pasa por `segmentar.ts` ni `semana.ts`, así que no cuenta como categoría ni como horas de la semana. El campo `motivo` es opcional, por eso los datos viejos funcionan sin migración. El extracto muestra una etiqueta según el motivo.

Semana (`semana.ts`). De lunes a domingo. Minutos de la semana = suma de minutosProgramados de los turnos ordinarios + minutos netos de los de alquiler con destino "semana". Los ordinarios cuentan lo programado porque las horas prestadas cuentan como cumplidas (confirmado).

## 5. Pantallas

- Inicio: saldo de deuda, prestado, pagado, barra de la semana (horas / 42), botón grande "Registrar turno".
- Turnos: lista y formulario (plantilla opcional, fecha, inicio, fin, descanso, programadas, tipo, destino). Al guardar muestra el desglose de horas y el movimiento de banco antes de confirmar.
- Banco: movimientos, botones de saldo inicial, préstamo, pago y ajuste. El botón de pago pregunta el motivo: capacitación o reunión, u otro.
- Quincena: selector, horas por categoría y en qué colilla se cobran.
- Extracto: vista imprimible con saldo corriente. Botón "Guardar / compartir PDF": genera el PDF dentro de la app (`ui/pdf.ts`, sin librerías) y lo entrega con la hoja de compartir del sistema en el celular, o lo descarga en el computador. `window.print()` no funciona en el iPhone con la app instalada, así que el botón "Imprimir" solo aparece en dispositivos sin pantalla táctil. Una capacitación o reunión sale con su etiqueta.
- Ajustes: configuración, plantillas de turno, festivos, exportar/importar JSON.

## 6. Pruebas

Cada criterio del spec es una prueba, escrita antes del código:

| Criterio | Archivo |
|---|---|
| CA1 sábado a domingo | tests/segmentar.test.ts |
| CA2 turno de 8 h netas que sale a las 19:00 | tests/banco.test.ts |
| CA3 saldo 40 + 6 - 4 | tests/banco.test.ts |
| CA4 saldo negativo | tests/banco.test.ts |
| CA5 alquiler con destino | tests/banco.test.ts, tests/semana.test.ts |
| CA6 desfase de quincena | tests/tiempo.test.ts |
| CA7 extracto = saldo | tests/banco.test.ts |
| CA8 verificación opcional | Manual, tarea T10 |
| CA9 quincena en cero | tests/segmentar.test.ts |
| CA10, CA11 descanso | tests/segmentar.test.ts |
| CA12 plantillas | tests/plantillas.test.ts |
| CA13 migración | tests/migracion.test.ts |
| CA14, CA15 capacitación o reunión | tests/banco.test.ts, tests/semana.test.ts |

Datos de prueba de festivos 2026: 12 de octubre, 2 de noviembre (el 1 cae domingo), 16 de noviembre (el 11 cae miércoles), 8 y 25 de diciembre. Verificar contra el calendario oficial.

## 7. Cómo se corre

Local, en el computador:

```
npm install
npm run dev
```

Desde el celular por la misma red wifi: `npm run dev -- --host` y abrir la dirección que muestra la terminal. Sirve para probar. No se instala como app ni queda offline, porque eso pide HTTPS, y los datos quedan atados a esa dirección.

Para uso diario en el celular hace falta publicar los archivos de `npm run build` en un hosting estático gratuito. Opciones a revisar cuando llegue el momento: GitHub Pages y Cloudflare Pages. Los datos no se suben, viven en cada celular.

## 8. Riesgos

- Reglas sin confirmar: si la coordinadora mantiene la compensación de extras en banco, y en qué línea de la colilla aparece una nocturna de domingo. Están aisladas en funciones pequeñas para cambiarlas sin reescribir.
- localStorage puede borrarse si se limpia el navegador. Mitigación: exportar JSON desde Ajustes y un aviso en Inicio si pasaron más de 14 días sin exportar. El extracto en PDF es un segundo respaldo.
- Festivos calculados de memoria: se verifican en T1.
- Migración de datos: Alejandro ya tiene un saldo inicial guardado en su celular. La migración de T13 no puede borrarlo ni reordenarlo. Se prueba con un JSON del formato anterior antes de tocar nada más.
