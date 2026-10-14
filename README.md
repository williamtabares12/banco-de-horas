# Banco de horas

App web personal para llevar el banco de horas con una clínica: cuántas horas se deben, cuáles se han pagado y con qué turno, y cuántas horas nocturnas y dominicales o festivas se trabajaron en cada quincena. Funciona en el computador y en el celular, sin servidor ni cuentas.

**No calcula dinero.** Salario, valor de recargos y descuentos son asunto de nómina y están fuera de alcance. La app solo cuenta horas y fechas.

## Qué hace

- **Inicio:** saldo de deuda, total prestado, total pagado y avance de la semana (horas / 42).
- **Turnos:** registra un turno (ordinario o quirófano de alquiler), con su descanso de alimentación. Puedes elegir una plantilla (Día 8 h, Día 12 h, Noche 12 h) que rellena el horario, el descanso y las horas programadas; todo se puede cambiar. Antes de guardar muestra el desglose de horas netas y el movimiento de banco que se genera.
- **Banco:** saldo inicial, préstamos, pagos y ajustes manuales, con nota. Todo se puede editar o borrar.
- **Quincena:** horas diurnas, nocturnas, dominicales o festivas diurnas y dominicales o festivas nocturnas de cada quincena, y en qué colilla deberían aparecer.
- **Extracto:** cada movimiento con su fecha, nota y el saldo después de cada uno. Se guarda o comparte como PDF (en el celular abre la hoja de compartir: Archivos, WhatsApp, correo) o se imprime desde el computador.
- **Ajustes:** horas semanales, inicio de la jornada nocturna, desfase de recargos, interruptor de horas extra, plantillas de turno (crear, editar y borrar; los horarios de ejemplo se ajustan aquí), festivos y respaldo de datos.

Las reglas completas están en [spec-banco-de-horas.md](spec-banco-de-horas.md).

## Requisitos

Node.js 22.12 o superior (lo exige Vitest) y npm.

## Cómo correrla

```bash
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).

Para probarla desde el celular por la misma red wifi:

```bash
npm run dev -- --host
```

y abre en el celular la dirección de red que muestra la terminal. Así sirve para probar, pero **no se puede instalar como app ni funciona sin internet**: eso pide HTTPS (ver "Publicarla"). Además, los datos quedan atados a esa dirección.

Para ver la versión final (la que se publica), con el modo sin internet activo:

```bash
npm run build
npm run preview
```

## Cómo probarla

```bash
npm test
```

Corre todas las pruebas una vez. Cada criterio de aceptación del spec (CA1 a CA9) tiene su prueba en la carpeta `tests/`, salvo CA8, que es una comparación manual con tu colilla. Para dejarlas corriendo mientras editas: `npx vitest`.

## Tus datos y el respaldo

Todo se guarda en el navegador de cada dispositivo (`localStorage`). No hay servidor: nada sale de tu dispositivo, y el celular y el computador **no comparten** datos.

El riesgo es que **si borras los datos del navegador, se pierden**. Por eso:

- **Exportar:** en Ajustes, "Exportar JSON" descarga un archivo con todos tus datos. Guárdalo en un lugar seguro (tu correo, la nube).
- **Importar:** en Ajustes, "Importar un respaldo" reemplaza los datos actuales con los del archivo. Si el archivo está dañado o no es válido, no cambia nada.
- **Aviso:** Inicio te avisa si pasaron más de 14 días sin descargar un respaldo.
- **Extracto en PDF:** sirve de segundo respaldo y para mostrárselo a la coordinadora. En Extracto, "Guardar / compartir PDF".

Para pasar tus datos de un dispositivo a otro: exporta en uno e importa en el otro.

## Publicarla (para usarla instalada en el celular)

`npm run build` genera la carpeta `dist/` con archivos estáticos. Cualquier hosting estático gratuito sirve. Lo que importa es que se sirva por **HTTPS**, porque sin eso el navegador no deja instalarla ni usarla sin internet. Solo se suben los archivos de la app: **tus datos no se suben**, siguen viviendo en cada dispositivo.

La app usa rutas relativas, así que funciona tanto en la raíz de un dominio como en una subcarpeta (por ejemplo `https://usuario.github.io/banco-de-horas/`).

Dos opciones gratuitas:

- **GitHub Pages:** el proyecto ya trae el flujo `.github/workflows/publicar.yml`, que en cada subida a la rama principal corre las pruebas, compila y publica `dist/`. Solo hay que subir el código a un repositorio público de GitHub y, en el repositorio, ir a Settings > Pages y elegir "GitHub Actions" como fuente. La app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
- **Cloudflare Pages:** conectas el repositorio, y como comando de build pones `npm run build` y como carpeta de salida `dist`.

Los pasos exactos de cada servicio cambian con el tiempo; sigue la guía oficial de la opción que elijas. Una vez publicada: abre la dirección en el celular y usa "Instalar" o "Agregar a la pantalla de inicio".

Un detalle: los datos quedan atados a la dirección donde la abras. Si publicas en una dirección nueva, empiezas con datos vacíos; para traer los anteriores, exporta e importa.

## Estructura

```
src/
  dominio/          lógica pura (fechas, festivos, turnos, banco, semana, quincena); sin React ni localStorage
  almacenamiento/   Repositorio (interfaz), implementación en localStorage, exportar/importar JSON
  ui/               pantallas y componentes de React
tests/              una prueba por criterio de aceptación, más las de cada módulo
```

Regla del proyecto: `dominio/` no importa nada de `ui/` ni de `almacenamiento/`.

## Documentos del proyecto

- [spec-banco-de-horas.md](spec-banco-de-horas.md): qué hace la app y las reglas. Manda sobre todo lo demás.
- [plan.md](plan.md): decisiones técnicas, estructura y algoritmos.
- [tasks.md](tasks.md): tareas en orden.
- [CLAUDE.md](CLAUDE.md): cómo se trabaja en el proyecto.

## Reglas pendientes de confirmar

- Si la hora extra seguirá compensándose en el banco. Está el interruptor en Ajustes por si cambia.
- En qué línea de la colilla aparece una hora nocturna en domingo. La app la cuenta aparte, como dominical nocturna.
