# Decisiones y hallazgos del piloto

Este archivo es la memoria del proyecto para quien programe (Claude Code o una persona). Lo que está aquí vale tanto como el spec. Si algo choca con el spec, se avisa a Alejandro antes de programar. Las entradas nuevas van al final, con fecha, sin borrar las anteriores.

## Cómo se usa

1. Antes de empezar una tarea, leer este archivo completo.
2. Cuando un usuario del piloto reporta una falla o una regla nueva, se agrega una entrada con la plantilla de abajo.
3. Primero se escribe la prueba que reproduce el problema, después se corrige.
4. Si la decisión cambia una regla, se actualiza el spec (RF o CA) y se agrega la tarea en tasks.md.

Plantilla:

```
### AAAA-MM-DD Título corto
Quién lo reportó:
Qué pasó:
Regla correcta según Alejandro:
Qué se cambió (RF, CA, tarea):
Datos de prueba (respaldo JSON, fechas):
```

## Contexto fijo

- La clínica "presta" horas a las personas tras el terremoto del 10 de agosto de 2026. Esa deuda es el banco de horas. Se paga trabajando turnos de alquiler (MEGACENTRO, CALCULASER) o con el exceso de los turnos ordinarios (CARPA).
- Arena no calcula dinero. El resumen de la quincena existe para comparar las horas con la colilla de pago.
- La semana de 42 h va de domingo a sábado. Un turno cuenta entero en la semana de su fecha de inicio, aunque termine al día siguiente.
- Piloto en curso desde mediados de octubre de 2026 con compañeros. Hay datos reales de usuarios: cualquier migración tiene que conservar los turnos y movimientos existentes.

## Decisiones

### 2026-10-29 Nombres de los tipos de turno
Quién lo reportó: Alejandro.
Qué pasó: "Ordinario" y "Quirófano provisional" no coincidían con cómo se llaman en la clínica.
Regla correcta: en pantalla, el ordinario se llama CARPA. El alquiler se divide en MEGACENTRO y CALCULASER, que son siempre alquiler, sin descanso por defecto (campo editable que empieza en 0). Por dentro el tipo sigue siendo "ordinario" o "alquiler" y el alquiler guarda `sede`.
Qué se cambió: RF19, CA37 a CA40, tarea T47.
Datos de prueba: banco-horas-2026-10-29.json. Los alquileres viejos no tienen sede y muestran "Elige la sede" sin cambiar el saldo. El turno del 16 de octubre fue un caso excepcional de turno ordinario hecho en Megacentro: se queda como CARPA.

### 2026-10-29 Los turnos que pagan deuda no suman a la quincena
Quién lo reportó: Alejandro.
Qué pasó: un alquiler con destino "pagar deuda" (29 de octubre, 14:00 a 22:00) sumaba 3 h nocturnas a la quincena, y eso descuadraba la comparación con la colilla.
Regla correcta: las horas que pagan deuda no cuentan en recargos nocturnos ni dominicales ni en la semana de 42 h. Vale también para el exceso de un turno ordinario (los minutos finales, que pasan de las horas programadas) mientras `extrasDescuentanDeuda` esté activo. El pago en el banco sigue igual.
Qué se cambió: RF20, CA41 a CA45 y CA48, tarea T48.
Datos de prueba: banco-horas-2026-10-29.json. Saldo esperado: 13 h.

### 2026-10-29 Colores de la deuda
Quién lo reportó: Alejandro.
Regla correcta: verde para pagar horas, rojo para deber horas, acento de la app para saldo a favor. Siempre con palabra y signo. Los avisos conservan el rojo con la palabra "Aviso" o "Error".
Qué se cambió: RF21, CA46 y CA47, tarea T49, sección de colores en estilo-visual.md.

### 2026-10-29 Horas extras quedan fuera
Regla correcta: sin saldo de deuda y con trabajo de más, el saldo pasa a negativo ("La clínica te debe X h"). No hay función de extras todavía.
Qué se cambió: línea en la sección 3 del spec (fuera de alcance).

### 2026-10-29 Comparación con el reporte de la jefa de servicio
Qué pasó: el reporte de la jefa de la 1.ª quincena de octubre traía 9 h de recargo más que Arena (5 nocturnas y 4 dominicales).
Regla correcta: Alejandro confirmó que el reporte tenía el cálculo mal. Arena queda como está.

### 2026-10-27 Datos al día entre pestañas y dispositivos (chat de QA)
Qué pasó: una pestaña o un celular desactualizado, al guardar, reescribía lo que había cambiado otro dispositivo (hallazgo 1 de informe-qa-2026-10-27.md).
Qué se cambió: RF-C5 y CC24 en spec-companeros.md, tarea T40 (hecha). `src/ui/datosVivos.ts` con `aplicarCambio` y `escucharDatos`.

### 2026-10-27 Horas ambiguas (chat de QA)
Qué pasó: "7.30" se guardaba como 7 h 18 min (hallazgo 2).
Regla correcta según Alejandro: se acepta un entero, horas con dos puntos o un decimal de una sola cifra. Con dos cifras o más después de la coma o el punto se rechaza, con la sugerencia "¿Quisiste decir 7:30?".
Qué se cambió: RF15 y CA24, tarea T41 (pendiente de probar en el emulador y de commit).

### 2026-10-29 Numeración
El chat principal y el chat de QA usaban los mismos números para cosas distintas. Quedó así: lo del chat principal posterior al 27 de octubre pasó de RF15-RF20 a RF16-RF21, de CA26-CA46 a CA28-CA48 y de T42-T47 a T44-T49. Desde ahora solo el chat principal crea números nuevos.

### 2026-10-29 Ajustes que pidió el chat de QA
CA1 ahora dice destino "completar semana", para que T48 no la ponga en rojo. CA48 cubre el exceso con descanso. En T47, "Elige la sede" no bloquea abrir ni editar un alquiler viejo, y el aviso de pago sale después de guardar, sin quitar el texto de la revisión.
