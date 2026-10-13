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
- [ ] T7. Turnos e Inicio: formulario de turno con desglose de horas y movimiento de banco antes de confirmar, lista editable, tarjetas de Inicio.
- [ ] T8. Quincena: selector, horas por categoría y colilla donde se cobran.
- [ ] T9. Extracto: vista imprimible con saldo corriente y botón para imprimir o guardar como PDF.

## Fase 4: cierre

- [ ] T10. Verificación opcional (CA8): si Alejandro quiere, carga los turnos de una quincena cuya colilla ya tiene y compara las horas por categoría con la línea de recargos. Si no coincide, se ajusta la regla en el spec primero y después en el código. No bloquea el resto.
- [ ] T11. PWA con vite-plugin-pwa: instalable y funcional sin internet. Aviso de respaldo en Inicio.
- [ ] T12. README con cómo correr, probar y exportar los datos, y cómo publicar en un hosting estático gratuito.
