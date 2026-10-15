# Tareas

Se hacen en orden. Cada una termina cuando sus pruebas pasan y está commiteada. No se salta a la siguiente con pruebas en rojo. Si algo del spec no alcanza para decidir, se pregunta a Alejandro antes de inventar la regla.

## Fase 0: base

- [x] T0. Crear el proyecto con Vite (plantilla react-ts), instalar Vitest, configurar `npm test`, crear las carpetas de plan.md sección 2 y una prueba de humo que pase. Hecho cuando `npm run dev` abre una página y `npm test` pasa.

## Fase 1: dominio (solo lógica, sin pantallas)

- [x] T1. `tiempo.ts` y `festivos.ts`. Pruebas: quincena de una fecha, colilla donde se cobra (CA6), semana lunes-domingo, festivos 2026 y 2027 contra el calendario oficial. Hecho cuando Alejandro confirma la lista de festivos generada.
- [x] T2. `segmentar.ts`. Pruebas: CA1, turno diurno, turno que cruza medianoche a domingo, turno que cruza de domingo a lunes, turno en festivo, turno que cruza de la quincena 1 a la 2, quincena sin turnos nocturnos ni dominicales (CA9).
- [x] T3. `banco.ts`. Pruebas: CA2, CA3, CA4, CA5 (parte de saldo), CA7, movimiento editado a mano que no se sobrescribe, interruptor `extrasDescuentanDeuda`.
- [x] T4. `semana.ts`. Pruebas: CA5 (parte de semana), semana con turnos ordinarios, alquiler con destino semana, alquiler con destino deuda (no suma), semana que arranca en lunes.

## Fase 2: datos

- [x] T5. `Repositorio` y su implementación en localStorage. Exportar e importar JSON con validación (un JSON dañado no borra los datos actuales). Pruebas: guardar, leer, exportar, importar, importar archivo inválido.

## Fase 3: pantallas

- [x] T6. Ajustes y Banco: configuración, saldo inicial, préstamos, pagos y ajustes manuales con nota.
- [x] T7. Turnos e Inicio: formulario de turno con desglose de horas y movimiento de banco antes de confirmar, lista editable, tarjetas de Inicio.
- [x] T8. Quincena: selector, horas por categoría y colilla donde se cobran.
- [x] T9. Extracto: vista imprimible con saldo corriente y botón para imprimir o guardar como PDF.

## Fase 4: cierre

- [ ] T10. Verificación opcional (CA8): si Alejandro quiere, carga los turnos de una quincena cuya colilla ya tiene y compara las horas por categoría con la línea de recargos. Si no coincide, se ajusta la regla en el spec primero y después en el código. No bloquea el resto.
- [x] T11. PWA con vite-plugin-pwa: instalable y funcional sin internet. Aviso de respaldo en Inicio.
- [x] T12. README con cómo correr, probar y exportar los datos, y cómo publicar en un hosting estático gratuito.

## Fase 5: descansos (cambio del spec v0.7)

Se hacen después de lo que ya esté construido, en este orden. La app ya tiene datos reales guardados en el celular de Alejandro, así que primero se protege eso.

- [x] T13. Modelo y migración. Agregar `descansoMin` al turno, `plantillas` a la configuración y `schemaVersion` al almacenamiento. Migrar los datos viejos: turnos con descanso 0 y plantillas de ejemplo (Día 8 h, Día 12 h, Noche 12 h). Pruebas: CA13 con un JSON del formato anterior, importar un respaldo viejo.
- [x] T14. Dominio con descanso. Minutos netos en `segmentar.ts`, `banco.ts` y `semana.ts`. Pruebas: CA2, CA10, CA11, CA5 con minutos netos, descanso mayor que la categoría mayoritaria no baja de cero.
- [x] T15. Plantillas en pantalla: crear, editar y borrar en Ajustes. En el formulario de turno, elegir plantilla rellena inicio, fin, descanso y programadas, todo editable. El desglose y el movimiento de banco usan minutos netos. Prueba: CA12.
- [x] T16. Arreglo visual: la barra de pestañas se corta en celular (se ve "Quincen" truncado). Que se desplace de lado o use letra más pequeña en pantallas angostas.
- [ ] T17. Pago por capacitación o reunión (spec v0.8). Agregar `motivo` opcional al movimiento. En Banco, el botón de pago pide el motivo (capacitación o reunión, u otro), con fecha, duración y nota. Extracto con etiqueta. Pruebas: CA14, CA15, y que los pagos manuales viejos sigan funcionando como "Otro". No requiere migración de datos.

## Fase 6: ajustes tras probar en el celular

Estas dos ya estaban hechas cuando llegó la T17 de arriba. En el historial de git figuran con los números T17 y T18.

- [x] T18. Extracto en PDF en iPhone. `window.print()` no hace nada en el iPhone con la app instalada. El extracto se genera como PDF dentro de la app, sin librerías (`ui/pdf.ts`), y se entrega con la hoja de compartir del sistema; en el computador se descarga o se imprime. Verificado leyendo y dibujando los PDF con pdf.js. (Commit "T17: extracto en PDF…")
- [x] T19. Diseño estilo Wise: paleta verde bosque y lima, botones en píldora, saldo como tarjeta oscura con el número en lima, pestañas segmentadas, Inter empaquetada (con caché para uso sin internet), ícono nuevo y colores de la app instalada. Solo CSS y recursos. (Commit "T18: diseño estilo Wise…")
