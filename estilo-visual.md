# Estilo visual

Adaptado del estilo de Apple (referencia entregada por Alejandro el 15 de octubre de 2026). Idea central: lienzo gris muy claro, la tipografía como protagonista, un solo azul que marca las acciones. Aplica a toda pantalla de la app. Si algo de aquí contradice el spec, manda el spec.

## 1. Qué se toma y qué se deja

La referencia es de un sitio de productos. Se toman los colores, la tipografía, los radios, el espacio y la regla de no usar sombras. Se dejan la fotografía de producto, las tarjetas de servicios, la barra global y el pie de página, que no tienen equivalente en esta app.

Cambios frente a la versión actual: el tema oscuro se retira (solo tema claro) y las tarjetas con fondo se reemplazan por bloques tipográficos separados por líneas finas.

## 2. Colores

| Variable | Valor | Uso |
|---|---|---|
| `--color-texto` | `#1d1d1f` | Texto principal, títulos |
| `--color-texto-suave` | `#707070` | Etiquetas, fechas, texto secundario. Es el gris más claro permitido para texto |
| `--color-lienzo` | `#f5f5f7` | Fondo de todas las pantallas |
| `--color-realce` | `#f4f8fb` | Fondo de un bloque destacado (por ejemplo el saldo) |
| `--color-sobre-accion` | `#ffffff` | Texto sobre `--color-accion` (botón relleno y pestaña activa). Da 4,70 a 1; `--color-realce` daba 4,40 y no cumplía el criterio CA19 |
| `--color-relleno` | `#e2e2e5` | Pista de la barra de avance, botones deshabilitados |
| `--color-linea` | `#d2d2d7` | Líneas finas de 1 px entre filas, bordes de campos |
| `--color-accion` | `#0071e3` | Solo relleno de botones principales y lo seleccionado (pestaña activa, interruptor encendido) |
| `--color-enlace` | `#0066cc` | Texto de enlaces y de botones de contorno, y su borde |
| `--color-decorativo` | `#2997ff` | Relleno de la barra de avance y trazos de íconos. Nunca en botones |
| `--color-icono` | `#858585` | Solo trazos de íconos y bordes. Nunca texto |

Reglas:

- `--color-accion` nunca es color de texto, borde ni decoración.
- El texto que va sobre `--color-accion` es siempre `--color-sobre-accion`.
- No se mezclan los tres azules en un mismo elemento.
- No hay verde ni rojo. Préstamo y pago se distinguen por el signo (+3 h, -3 h) y por la etiqueta, no por color.
- Avisos y errores: texto en `--color-texto` con la palabra "Aviso" o "Error" delante y una línea fina. Si hace falta un color nuevo, se pregunta antes.

## 3. Tipografía

En iPhone y Mac se usa la letra del sistema (SF Pro). En Android se usa Inter, incluida dentro de la app (archivo propio, no descargada de internet), para que se vea igual en todos los celulares y funcione sin conexión. Los tamaños de letra se definen en rem, para respetar el tamaño de letra que cada persona eligió en su teléfono.

```css
font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
```

| Rol | Tamaño | Peso | Interlineado | Espaciado de letras |
|---|---|---|---|---|
| Caption (fechas, notas) | 12 px | 400 | 1.33 | -0.264 px |
| Cuerpo pequeño (etiquetas) | 14 px | 400 | 1.29 | -0.224 px |
| Cuerpo (texto, campos, botones) | 17 px | 400 | 1.47 | -0.272 px |
| Subtítulo | 21 px | 300 o 600 | 1.24 | -0.105 px |
| Título de sección | 28 px | 600 | 1.18 | 0.196 px |
| Cifra grande (saldo) | 44 px | 600 | 1.18 | -0.44 px |

Reglas:

- Pesos permitidos: 300 (subtítulos y descriptores), 400 (cuerpo), 600 (títulos, pestañas, botones). Nunca 700.
- Las cifras de horas usan `font-variant-numeric: tabular-nums`, para que las columnas del extracto queden alineadas.
- La referencia usa 56 px para títulos de portada y espaciado positivo en tamaños grandes. En esta app la cifra más grande es de 44 px con el espaciado de la tabla, para que quepa en un celular.

## 4. Espacio, radios y sombras

- Unidad base de 4 px. Valores permitidos: 4, 8, 12, 16, 20, 24, 40, 48, 56.
- Margen lateral de pantalla: 16 px. Entre secciones: 40 px.
- Radio de botones, pestañas y etiquetas: 980 px (completamente redondeados). Radio de campos, diálogos e imágenes: 8 px. No hay otros radios.
- Sin sombras en ningún elemento. La jerarquía sale del tamaño de letra, de las líneas finas y de los cambios de superficie.
- Zonas táctiles de al menos 44 px de alto.
- Alturas con `100dvh` y márgenes con `env(safe-area-inset-*)`, para que nada quede tapado por la barra del navegador ni por la barra de gestos de iPhone o Android.
- `color-scheme: light` y `theme-color` del color del lienzo, para que el modo oscuro automático de algunos navegadores Android no deforme los colores.
- Sin el resaltado azul de toque del navegador (`-webkit-tap-highlight-color: transparent`). Cada elemento tocable tiene su propio estado presionado, con un cambio de opacidad, igual en iPhone y Android.

## 5. Componentes

Botón relleno (acción principal): fondo `--color-accion`, texto `--color-sobre-accion` de 17 px y peso 400, radio 980 px, relleno 11 px 15 px, sin borde. Uno solo por pantalla. En celular ocupa el ancho completo.

Botón de contorno (acción secundaria): borde de 1 px `--color-enlace`, texto `--color-enlace`, fondo transparente, mismo radio y relleno. Va junto al botón relleno, nunca dos rellenos juntos. Las acciones que borran usan contorno con `--color-texto`.

Enlace: texto `--color-enlace`, sin fondo, subrayado solo al pasar el dedo o el cursor.

Pestañas (navegación): fila horizontal que se desplaza de lado, bajo el título, con línea fina inferior. Cada pestaña es una pastilla de 14 px peso 600. La activa lleva fondo `--color-accion` y texto `--color-sobre-accion`. Las demás, texto `--color-texto` sin fondo. Ninguna etiqueta se corta.

Campo de formulario: etiqueta de 14 px en `--color-texto-suave` arriba, campo con radio 8 px, borde 1 px `--color-linea`, fondo `--color-lienzo`, texto de 17 px. Al enfocar: aro de 2 px `--color-accion`. Letra de 16 px o más para que el iPhone no haga zoom.

Fila de lista (turnos, movimientos): fecha en caption `--color-texto-suave` arriba, título de 17 px abajo, las horas a la derecha en 17 px peso 600. Una línea fina de 1 px entre filas. Sin fondo ni tarjeta.

Barra de avance (semana): alto de 6 px, radio 980 px, pista `--color-relleno`, relleno `--color-decorativo`.

Interruptor: apagado en `--color-relleno`, encendido en `--color-accion`.

Diálogo de confirmación: sobre un velo negro de 40 % de opacidad, hoja de `--color-lienzo` con borde 1 px `--color-linea` y radio 8 px, sin sombra. Botón relleno para confirmar y de contorno para cancelar.

## 6. Pantallas

- Título de la app: 21 px peso 600, arriba, con las pestañas debajo. Barra fija con línea fina.
- Inicio: botón relleno "Registrar turno" al ancho completo. Debajo, bloques tipográficos separados por líneas finas. "Debo a la clínica" como etiqueta de 14 px y la cifra en 44 px (fondo `--color-realce`). "Prestado" y "Pagado" en dos columnas con cifras de 28 px. "Esta semana" con "27 h / 42 h" y la barra de avance.
- Turnos: botón "Registrar turno", lista de filas. El formulario con plantilla arriba y campos en una columna. El desglose tras guardar, en filas con líneas finas.
- Banco: saldo en 44 px, botones de contorno para saldo inicial, préstamo, pago y ajuste, y la lista de movimientos en filas.
- Quincena: selector con dos botones de contorno (anterior y siguiente) y el nombre de la quincena en 21 px. Debajo, una fila por categoría con sus horas.
- Extracto: tabla con líneas finas y cifras tabulares. Al imprimir: fondo blanco, texto negro, líneas finas y nada de azul.
- Ajustes: filas agrupadas con líneas finas, interruptores y botones de contorno para exportar e importar.
- Estados vacíos: una frase de 17 px peso 300 y el botón relleno que lleva a la acción.

## 6b. Marca y movimiento

La marca es el reloj de arena. En el ícono de la app va con fondo `--color-texto` y contorno `--color-lienzo` (icono-app-oscuro.svg). En las pantallas va con contorno `--color-texto` y arena `--color-decorativo` (icono-reloj-arena.svg). Nada de degradados ni sombras en el logo.

El único movimiento de la app es el reloj de arena animado de arena-animado.html: ciclo de 5 s (la arena baja durante 3,5 s, el reloj gira 180° y se repite). Se hace con CSS dentro del SVG, sin librerías. Aparece solo en el login y en la pantalla de carga, con 96 px de lado. Con `prefers-reduced-motion: reduce` queda quieto. Cualquier otra animación necesita aprobación de Alejandro.

Pantalla de carga: lienzo `--color-lienzo`, reloj de arena centrado, la palabra "Arena" en 21 px peso 600 debajo, y el mensaje de demora en 17 px peso 300. Sin barra de progreso ni porcentajes.

## 7. Lo que no se hace

- Sombras, degradados, fondos oscuros o tarjetas con relleno sobre el lienzo.
- Más de un botón relleno por pantalla.
- Colores, tamaños de letra o radios fuera de este documento.
- Texto en `--color-icono` ni en grises más claros que `--color-texto-suave`.
- Emojis como íconos. Los íconos son de trazo fino de 1 a 2 px en gris.

## 8. Variables listas para copiar

```css
:root {
  --color-texto: #1d1d1f;
  --color-texto-suave: #707070;
  --color-lienzo: #f5f5f7;
  --color-realce: #f4f8fb;
  --color-relleno: #e2e2e5;
  --color-linea: #d2d2d7;
  --color-accion: #0071e3;
  --color-sobre-accion: #ffffff;
  --color-enlace: #0066cc;
  --color-decorativo: #2997ff;
  --color-icono: #858585;

  --fuente: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;

  --esp-4: 4px;  --esp-8: 8px;  --esp-12: 12px; --esp-16: 16px; --esp-20: 20px;
  --esp-24: 24px; --esp-40: 40px; --esp-48: 48px; --esp-56: 56px;

  --radio-pastilla: 980px;
  --radio-caja: 8px;
}
```
