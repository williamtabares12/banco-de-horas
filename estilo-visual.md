# Estilo visual (vidrio)

Aprobado por Alejandro el 27 de octubre de 2026. Reemplaza al estilo anterior, de tipo Apple. Sale de design-coachpro.md (un dashboard de escritorio con barra lateral), adaptado a celular y con los contrastes corregidos. Si algo de aquí contradice el spec, manda el spec. Maqueta de referencia: arena-glass.html.

## 1. Qué se toma y qué se cambia

Se toma: fondo con degradado suave verde azulado con un toque lila, tarjetas de vidrio translúcido, radio de 24 px, sombras largas y muy suaves, botones en pastilla con degradado, verde azulado como único color de acción.

Se deja: la barra lateral (en celular se mantienen las pestañas de arriba), la tarjeta "Next game", la tabla de posiciones y el banner con ilustración, que no tienen equivalente en Arena.

Se cambia, porque la guía original no cumple contraste (medido sobre una tarjeta blanca al 55 % encima de #B9D2D2, que da más o menos #E0EBEB):

| Uso | Guía original | Contraste | Valor para Arena | Contraste |
|---|---|---|---|---|
| Texto secundario | #7C8A8D | 2,9 | #566366 | 4,5 o más |
| Texto de enlace y de pestañas inactivas | #3D8B94 | 3,2 | #256A74 | más de 4,5 |
| Relleno de botón y pestaña activa (texto blanco) | #3D8B94 | 4,0 | degradado de #3D8B94 a #2F7480, con el texto sobre la parte oscura | 5,3 en el extremo oscuro |
| Aviso o error | #E5677C | 2,6 | #B3364C | 4,9 |

Regla: ningún texto de menos de 4,5 de contraste. Lo que no llega se oscurece, no se deja.

## 2. Colores

| Variable | Valor | Uso |
|---|---|---|
| `--fondo-base` | `#B9D2D2` | Base del degradado de fondo |
| `--fondo-lila` | `#C9C3E6` | Mancha a la derecha del degradado |
| `--fondo-claro` | `#DDEAE6` | Mancha arriba a la izquierda |
| `--vidrio` | `rgba(255,255,255,.55)` | Fondo de tarjetas y campos |
| `--vidrio-borde` | `rgba(255,255,255,.65)` | Borde de 1 px de las tarjetas |
| `--vidrio-solido` | `#E4ECEC` | Respaldo cuando no hay vidrio |
| `--texto` | `#1F2A2E` | Texto principal, títulos |
| `--texto-suave` | `#566366` | Etiquetas, fechas, texto secundario |
| `--accion` | `#2F7480` | Extremo oscuro del degradado de botones, pestaña activa, aro de foco |
| `--accion-clara` | `#3D8B94` | Extremo claro del degradado, relleno de barras, arena del reloj |
| `--enlace` | `#256A74` | Texto de enlaces, de pestañas inactivas y de botones de contorno |
| `--aviso` | `#B3364C` | Línea de avisos y errores, acciones que borran |
| `--linea` | `rgba(0,0,0,.08)` | Líneas finas entre filas |
| `--relleno` | `rgba(31,42,46,.10)` | Pista de barras, interruptor apagado, deshabilitado |
| `--sombra` | `0 10px 30px rgba(60,90,100,.10)` | Sombra de tarjetas |
| `--sombra-accion` | `0 8px 20px rgba(47,116,128,.30)` | Sombra de botones y pestaña activa |
| `--velo` | `rgba(0,0,0,.40)` | Fondo detrás de un diálogo |

Los íconos de KPI van en un cuadro redondeado de 36 px con degradado suave y trazo blanco de 1,8 px: violeta (#B7A8FA a #8E7CF0) para lo prestado y verde azulado (#8FC9C9 a #3D8B94) para lo pagado. Naranja y rosa no se usan.

Reglas:
- El color nunca es la única señal. Préstamo y pago se distinguen por el signo (+3 h, -3 h) y por la etiqueta. Los avisos llevan la palabra "Aviso" o "Error" delante.
- `--aviso` solo acompaña una palabra o una línea; no se usa como relleno grande.
- Un solo azul fuera de la paleta está permitido: el de la firma de autor (sección 8).

## 3. Tipografía

En iPhone y Mac, la letra del sistema (SF Pro). En Android, Inter, incluida dentro de la app (archivo propio, no descargada de internet), para que se vea igual y funcione sin conexión. Tamaños en rem, para respetar el tamaño de letra que cada persona eligió en su teléfono.

```css
font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
```

| Rol | Tamaño | Peso | Notas |
|---|---|---|---|
| Etiqueta de KPI | 11 px | 500 | Mayúsculas, espaciado 0,06 em, `--texto-suave` |
| Caption (fechas, notas) | 13 px | 400 | `--texto-suave` |
| Cuerpo pequeño | 14 px | 400 | |
| Cuerpo (texto, campos, botones) | 17 px | 400 (botones 600) | Interlineado 1,45 |
| Título de tarjeta | 17 px | 500 | |
| Título de app y de pantalla | 22 px | 600 | |
| Título de sección | 28 px | 500 | |
| Cifra de KPI | 28 px | 500 | La unidad en 16 px, peso 400 |
| Cifra grande (saldo) | 44 px | 500 | La unidad en 18 px, peso 400 |

Pesos permitidos: 400, 500 y 600. Las cifras de horas usan `font-variant-numeric: tabular-nums`.

## 4. Forma y espacio

- Tarjetas: radio 24 px, relleno 20 px, separación de 16 px entre ellas, borde de 1 px `--vidrio-borde`, sombra `--sombra`.
- Botones, pestañas y píldoras: radio 999 px. Botón principal de 48 px de alto; el resto, 44 px como mínimo.
- Campos: radio 12 px, fondo `--vidrio`, borde 1 px `--linea`, letra de 16 px o más para que el iPhone no haga zoom.
- Máximo 4 a 5 tarjetas por pantalla. Las listas largas (turnos, movimientos, extracto) van dentro de una sola tarjeta, con líneas finas entre filas, no una tarjeta por fila.
- Unidad base de 4 px. Márgenes laterales de 16 px. `100dvh` y `env(safe-area-inset-*)` para que nada quede tapado por las barras del navegador o de gestos.
- `color-scheme: light` y `theme-color` de `--fondo-base`. Sin resaltado azul de toque (`-webkit-tap-highlight-color: transparent`). Cada elemento tocable tiene su estado presionado, con opacidad al 80 %.
- Zonas táctiles de al menos 44 px de alto.

## 5. Vidrio sin romper celulares viejos

- `backdrop-filter: blur(20px)` solo en las tarjetas, nunca en el fondo ni en las filas de una lista. Sin tarjetas de vidrio apiladas una sobre otra.
- Respaldo obligatorio: con `@supports not (backdrop-filter: blur(1px))` la tarjeta usa `--vidrio-solido`.
- Con "reducir transparencia" activado (`prefers-reduced-transparency: reduce`) las tarjetas también pasan a `--vidrio-solido`.
- Si en el Android de gama baja el desplazamiento se entrecorta, el blur baja a 8 px o se quita, sin cambiar nada más. Eso se decide en la revisión de T40, no antes.
- El degradado del fondo es de CSS (radial), sin imágenes.

## 6. Componentes

- Pestañas: fila que se desplaza de lado, bajo el título. Pastilla activa con degradado de `--accion-clara` a `--accion`, texto blanco y `--sombra-accion`. Inactivas con texto `--enlace` y sin fondo. Ninguna etiqueta se corta.
- Botón principal: degradado de `--accion-clara` a `--accion`, texto blanco de 17 px y peso 600, `--sombra-accion`. Uno por pantalla, ancho completo en celular.
- Botón de contorno: borde de 1 px `--accion`, texto `--enlace`, sin relleno. Las acciones que borran: borde y texto `--aviso`.
- Enlace: texto `--enlace`, subrayado solo al pasar el dedo o el cursor.
- Campo: etiqueta de 14 px en `--texto-suave` arriba. Al enfocar, aro de 2 px `--accion-clara` con 2 px de separación.
- Fila de lista: fecha en caption arriba, título de 17 px abajo, horas a la derecha en 17 px peso 600, línea fina `--linea` entre filas.
- Barra de avance: 6 px de alto, radio 999, pista `--relleno`, relleno en degradado de `--accion-clara` a `--accion`.
- Interruptor: apagado en `--relleno`, encendido en `--accion`.
- Aviso o error: la palabra "Aviso" o "Error" en peso 600, línea vertical de 3 px en `--aviso` a la izquierda del texto.
- Diálogo: hoja de vidrio con borde 1 px y radio 24 px sobre `--velo`. Confirmar con botón principal, cancelar con contorno.
- Estado presionado: opacidad al 80 %. Hover con cursor (no en táctil): la tarjeta sube 2 px, transición de 150 a 200 ms.
- Cargando: bloques con `--relleno` y pulso suave, mismos radios que la tarjeta final, o la pantalla de carga de la sección 8.
- Deshabilitado: opacidad al 50 %.

## 7. Pantallas

Todas llevan la misma cabecera: el reloj de arena de 30 px y "Arena" a 22 px peso 600, debajo el estado de sincronización en caption, y las pestañas.

- Inicio: botón principal "Registrar turno". Tarjeta "Debo a la clínica" con la cifra en 44 px y una línea de contexto. Dos tarjetas de KPI en cuadrícula de 2 (Prestado, Pagado). Tarjeta "Esta semana" con "Domingo a sábado", las horas sobre 42 y la barra de avance.
- Turnos: botón principal y una sola tarjeta con la lista de turnos. El formulario va en una pantalla con campos en una columna y la plantilla arriba, como pastillas elegibles. El desglose, tras guardar, en una tarjeta con filas.
- Banco: tarjeta con el saldo en 44 px, cuatro botones de contorno en cuadrícula de 2 (saldo inicial, préstamo, pago, ajuste) y una tarjeta con la lista de movimientos. Los movimientos "Programado" llevan esa etiqueta.
- Quincena: selector con dos botones circulares de 44 px y el nombre de la quincena al centro. Una tarjeta con una fila por categoría y otra con la nota de la colilla.
- Extracto: una tarjeta con la tabla (líneas finas, cifras tabulares). Al imprimir o exportar a PDF: fondo blanco, texto negro, líneas finas, y nada de vidrio, sombras, degradados ni firma.
- Ajustes: tarjetas agrupadas por tema (semana y jornada, plantillas, datos y respaldo, Acerca de), con interruptores y botones de contorno para exportar e importar.
- Acerca de: tarjeta de filas (versión, aviso de privacidad, contacto, reportar un problema), tarjeta con el texto "Registro personal. No es una herramienta oficial de la clínica ni reemplaza sus registros", y la firma al pie.
- Estados vacíos: una frase de 17 px peso 400 en `--texto-suave` dentro de una tarjeta y el botón principal que lleva a la acción.
- Inicio de sesión: reloj de arena animado de 96 px centrado, "Arena" a 28 px peso 500 y debajo "Tus horas, claras y tuyas" en 17 px y `--texto-suave`. Una tarjeta con el selector Entrar | Crear cuenta (dos pastillas, la activa con degradado), el botón de Google y los campos, con los botones existentes en el mismo orden. Enlace "¿Olvidaste tu contraseña?" bajo la contraseña. Al pie, "Solo tú ves tus datos desde la app. Registro personal, no es una herramienta oficial de la clínica", el enlace al aviso y la firma. En una ventana de 360 x 640 px el botón "Entrar" se ve sin desplazarse; el pie y la firma pueden quedar debajo. Con menos de 700 px de alto (`@media (max-height: 700px)`) el reloj baja a 64 px y la frase se oculta.
- Pantalla de carga: fondo degradado, reloj de arena animado de 96 px y "Arena" a 22 px peso 600 debajo. Aparece solo si la espera pasa de 300 ms. A los 6 s se añade "Está tardando más de lo normal. Revisa tu conexión." en 17 px y, si hay copia local, el botón de contorno "Seguir sin conexión".

## 8. Marca y movimiento

La marca de la app es el reloj de arena: contorno `--texto`, arena `--accion-clara`. El ícono de la app (icono-app-oscuro.svg) lleva fondo `--texto`, contorno #F2F6F6 y arena #5FA8A8; los PNG de 192, 512 y 180 px salen de ahí. Sin degradados ni sombras en el logo.

El único movimiento propio de la app es el reloj de arena animado de arena-animado.html: ciclo de 5 s (la arena baja durante 3,5 s, el reloj gira 180° y se repite), en CSS dentro del SVG, sin librerías. Aparece solo en el login y en la pantalla de carga. Con `prefers-reduced-motion: reduce` queda quieto. Las transiciones de la sección 6 (150 a 200 ms) son las únicas otras animaciones. Cualquier otra necesita aprobación de Alejandro.

Firma de autor: al pie de "Acerca de" y del login, el monograma `at-monograma-claro.svg` de 24 px de alto con `<img>`, y al lado "Hecho por Alejandro Tabares · v" más la versión, en 13 px, con el nombre en peso 600. El azul del monograma es el de la marca personal y solo vive en la firma. No va en el extracto, ni en la pantalla de carga.

## 9. Lo que no se hace

- Texto con menos de 4,5 de contraste.
- Blur en listas largas, o vidrio apilado sobre vidrio.
- Colores, tamaños de letra, radios o sombras fuera de este documento.
- Color como única señal de algo.
- Tema oscuro.
- Emojis como íconos. Los íconos son de trazo fino de 1,8 px.
- Más de un botón principal por pantalla.

## 10. Variables listas para copiar

```css
:root {
  color-scheme: light;
  --fondo-base: #B9D2D2;
  --fondo-lila: #C9C3E6;
  --fondo-claro: #DDEAE6;
  --vidrio: rgba(255,255,255,.55);
  --vidrio-borde: rgba(255,255,255,.65);
  --vidrio-solido: #E4ECEC;
  --texto: #1F2A2E;
  --texto-suave: #566366;
  --accion: #2F7480;
  --accion-clara: #3D8B94;
  --enlace: #256A74;
  --aviso: #B3364C;
  --linea: rgba(0,0,0,.08);
  --relleno: rgba(31,42,46,.10);
  --sombra: 0 10px 30px rgba(60,90,100,.10);
  --sombra-accion: 0 8px 20px rgba(47,116,128,.30);
  --velo: rgba(0,0,0,.40);

  --fuente: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;

  --esp-4: 4px; --esp-8: 8px; --esp-12: 12px; --esp-16: 16px; --esp-20: 20px;
  --esp-24: 24px; --esp-40: 40px; --esp-48: 48px; --esp-56: 56px;

  --radio-tarjeta: 24px;
  --radio-campo: 12px;
  --radio-pastilla: 999px;
}
```

Fondo de la app:

```css
body {
  background:
    radial-gradient(120% 70% at 0% 0%, var(--fondo-claro) 0%, transparent 60%),
    radial-gradient(90% 60% at 100% 35%, var(--fondo-lila) 0%, transparent 65%),
    var(--fondo-base);
  min-height: 100dvh;
}
```
