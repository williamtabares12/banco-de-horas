# Revisión de estilo (T21)

Qué se midió en el navegador (build de producción, ancho de 360 px) y qué le toca verificar a Alejandro en el iPhone.

## Medido (automático)

Estados revisados: las seis pantallas, formulario de turno (ordinario, alquiler, con error, pantalla de revisión), formulario de pago (con error), diálogo de confirmación, formulario de plantilla con error y mensaje «Guardado».

| Criterio | Resultado |
|---|---|
| Contraste de texto (mín. 4,5:1) | Todos pasan. El más bajo: 4,55:1 |
| CA17: lo que se toca mide ≥ 44 px de alto | Todos cumplen (mínimo 44 px) |
| CA20: letra de campos ≥ 16 px (sin zoom en iOS) | 17 px en todos los campos |
| CA18: pestañas sin cortar | Fila con scroll lateral, cada pestaña `nowrap`; sin desborde horizontal de la página |
| Texto blanco sobre azul de acción | Decisión (a) de Alejandro, ya aplicada |

## Hallazgos

| # | Hallazgo | Estado |
|---|---|---|
| 1 | El `select` perdía la flecha en iPhone por `appearance: none` | **Corregido**: el `select` conserva la apariencia nativa (con prueba) |
| 2 | Borde de los campos (`--color-linea`) con 1,38:1 de contraste | Viene del documento de estilo. No se cambia sin tu decisión |
| 3 | Relleno de la barra de avance (`--color-decorativo`) con 2,33:1 | Viene del documento. Es decorativo; el valor también está escrito en texto |

## Para verificar en el iPhone (Safari y app instalada)

1. **Reinstalar la app** (quitar de la pantalla de inicio y volver a «Añadir»): así toma el ícono nuevo y el color de la barra.
2. **Sin zoom**: toca cada campo (fecha, hora, horas, notas). La pantalla no debe agrandarse.
3. **Select**: en «Tipo de turno» y «Motivo» debe verse una flecha y abrir la lista nativa.
4. **Fecha y hora**: los campos de fecha/hora no se ven más bajos ni raros que los de texto.
5. **Pestañas**: se ven todas o se deslizan de lado; la activa queda visible y nada aparece cortado.
6. **Tamaño táctil**: botones, pestañas e interruptores se pulsan sin fallar.
7. **Contraste al sol**: texto gris suave (etiquetas, fechas) legible; botón azul con texto blanco.
8. **Barra fija**: al hacer scroll, el título y las pestañas se quedan arriba; en la app instalada no se mete bajo la hora/batería.
9. **Diálogo**: al borrar, aparece el diálogo con «Cancelar» destacado y se cierra al tocar fuera.
10. **PDF del extracto**: sigue compartiéndose bien y en blanco y negro.
11. **Datos**: el saldo y los turnos son los mismos que antes.

Cuando lo revises, dime qué falla y lo corrijo. T21 se marca al confirmar.
