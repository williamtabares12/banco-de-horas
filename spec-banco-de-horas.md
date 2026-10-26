# Spec: App de banco de horas

Estado: borrador v0.10 (semana de domingo a sábado). Estilo visual nuevo (estilo-visual.md). Sin parte monetaria. Incluye los descansos (alimentación) que la clínica descuenta de cada turno y el pago de horas por capacitaciones o reuniones. Plan técnico en plan.md, tareas en tasks.md.

## 1. Problema

Tras el terremoto del 10 de agosto de 2026, la clínica acortó o canceló turnos de Alejandro porque cirugía quedó inhabilitada. Para no afectar su sueldo, la clínica le "presta" horas (banco de horas). Esas horas se devuelven trabajando horas extra. Además, por decisión propia, hace turnos de quirófano de alquiler en fines de semana y de noche. Hoy lleva la cuenta de memoria y la pierde, y no tiene cómo demostrar cuántas horas debe y cuántas ha pagado.

La plata (salario, valor de recargos, descuentos) es asunto de nómina y contabilidad. La app no la calcula.

## 2. Objetivo

Una app personal que responda cuatro preguntas, con fechas y respaldo:

1. Cuántas horas debo a la clínica hoy.
2. Cuántas horas he pagado, cuándo y con qué turno.
3. Cuántas horas nocturnas y dominicales/festivas he trabajado en cada quincena (puede ser cero), por si quiere compararlas con la línea de recargos de la colilla.
4. Cuánto llevo de las 42 horas de la semana.

## 3. Fuera de alcance (v1)

- Dinero de cualquier tipo: salario, valor hora, porcentajes de recargo, descuentos.
- Servidor, cuentas o login.
- Conexión con la clínica o con nómina.

## 4. Usuario y contexto de uso

Alejandro, desde el celular o el computador, muchas veces saliendo de turno. Registrar un turno debe tomar menos de 30 segundos. Si funciona, la usarían compañeros del servicio (ver sección 11).

## 5. Datos de la colilla y de la clínica que importan

- Los recargos se listan en horas por tipo. En la 2a quincena de septiembre de 2026 fueron 33 horas de recargo nocturno y 17 de recargo diurno dominical y festivo. Es solo un ejemplo: cada quincena varía y a veces es cero.
- Esas horas se trabajaron del 1 al 15 de septiembre. Los recargos se cobran en la colilla de la quincena siguiente (desfase 1).
- Jornada nocturna desde las 19:00 (confirmado).
- Jornada semanal: 42 horas.
- Quincenas: 1 al 15 y 16 al fin de mes.
- La clínica descuenta tiempo de alimentación y descanso de cada turno:
  - Turno diurno de 8 h: 1 h de almuerzo.
  - Turno diurno de 12 h: 1 h de almuerzo, 30 min de desayuno y 30 min de la tarde (2 h en total).
  - Turno nocturno de 12 h: 2 h de descanso.
  - Turnos de quirófano de alquiler: sin descuento.
- Las horas asignadas ya son netas. Un turno de "8 horas" va de 07:00 a 16:00: 9 h de reloj menos 1 h de almuerzo.

## 6. Conceptos

Turno: bloque de trabajo con fecha, hora de inicio y de fin (de reloj, puede cruzar medianoche), descanso en minutos, horas programadas netas y tipo: ordinario o quirófano de alquiler.

Minutos netos de un turno = (fin - inicio) - descanso. Todo el banco, la semana y el conteo por categoría usan minutos netos.

Plantilla de turno: atajo con nombre, hora de inicio, hora de fin y descanso (por ejemplo "Día 8 h": 07:00 a 16:00, 60 min). Las horas programadas de un turno creado con plantilla son sus minutos netos. Las plantillas se editan en Ajustes. Cambiar una plantilla no modifica turnos ya guardados.

Segmentación: la app parte cada turno por hora y por día, y clasifica cada fracción como diurna, nocturna, dominical/festiva diurna o dominical/festiva nocturna. El descanso se resta de la categoría que tenga más minutos en ese turno (suposición, ver sección 13).

Movimiento de banco, de cuatro tipos:

- Saldo inicial: lo carga Alejandro una vez, con fecha y total de horas debidas.
- Préstamo: la clínica acortó o canceló un turno. La deuda sube.
- Pago: horas que devuelven deuda. La deuda baja. Puede venir de un turno (horas extra o alquiler) o de una capacitación o reunión.
- Ajuste manual: corrección con nota.

Saldo de deuda: saldo inicial + préstamos - pagos +/- ajustes, en horas y minutos.

## 7. Reglas del banco

Turno ordinario. La diferencia entre minutos netos y minutos programados genera un movimiento automático:

- Netos menor que programados: préstamo por la diferencia.
- Netos mayor que programados: pago por la diferencia, 1 a 1.
- Ejemplo: turno de 07:00 a 16:00 con 60 min de descanso (8 h programadas). Si sale a las 19:00 trabajó 11 h netas, y genera un pago de 3 h.

Turno de quirófano de alquiler. Cada turno lleva un destino que Alejandro elige: "pagar deuda" o "completar semana de 42 h". Con "pagar deuda", todos sus minutos netos generan un pago.

Capacitación o reunión. Es un pago manual con fecha, duración y nota. No es un turno: no se parte en categorías (nocturna, dominical), no lleva descanso y por defecto no suma a las 42 h de la semana. Baja la deuda 1 a 1 y se ve en el extracto con la etiqueta "Capacitación o reunión".

Las horas extra se compensan contra el banco. Hay un interruptor de configuración (extras descuentan deuda, activo por defecto) por si la clínica cambia la regla y empieza a pagarlas aparte.

Alejandro puede editar o borrar cualquier movimiento automático. Lo editado queda marcado como manual.

## 8. Requisitos funcionales

RF1. Registrar un turno con fecha, inicio, fin, descanso, horas programadas, tipo y, si es de alquiler, destino.

RF2. Al guardar, mostrar el desglose de horas netas: diurnas, nocturnas, dominicales/festivas diurnas y dominicales/festivas nocturnas.

RF3. Generar el movimiento de banco automático según la sección 7 y mostrarlo antes de confirmar.

RF4. Registrar saldo inicial, préstamos, pagos y ajustes manuales, cada uno con fecha y nota opcional (por ejemplo, quién autorizó).

RF5. Pantalla principal: saldo de deuda, total prestado, total pagado y avance de la semana (horas / 42).

RF6. Vista por quincena: horas por categoría y en qué colilla deberían aparecer, para compararlas con la línea de recargos.

RF7. Historial de turnos y movimientos, editable y borrable. Cada registro guarda cuándo se creó y cuándo se modificó por última vez.

RF8. Extracto de horas: una vista imprimible (guardable como PDF) con el saldo inicial, cada movimiento con fecha y nota, y el saldo después de cada uno.

RF9. Configuración: horas semanales (42), primer día de la semana (domingo), inicio de jornada nocturna (19:00), desfase de pago de recargos (por defecto 1 quincena), interruptor de extras, festivos a agregar o quitar.

RF10. Festivos de Colombia calculados por código (ley Emiliani y Semana Santa), con opción de agregar o quitar fechas a mano.

RF11. Exportar e importar los datos en JSON.

RF12. Plantillas de turno: crear, editar y borrar en Ajustes. Al registrar un turno, elegir una plantilla rellena inicio, fin, descanso y horas programadas, y todo sigue editable. Vienen tres de ejemplo para ajustar: Día 8 h (07:00 a 16:00, 60 min), Día 12 h (07:00 a 19:00, 120 min) y Noche 12 h (19:00 a 07:00, 120 min). Los turnos de alquiler no llevan plantilla y su descanso es 0.

RF13. Los datos ya guardados en el dispositivo se conservan al actualizar la app. Los turnos anteriores al cambio quedan con descanso 0.

RF14. Al registrar un pago en Banco, elegir el motivo: "Capacitación o reunión" u "Otro". Para capacitación o reunión se piden fecha, duración (horas y minutos) y nota opcional (nombre del evento o quién lo convocó). El pago aparece en Banco y en el extracto con su etiqueta. Los pagos manuales que ya existen quedan como "Otro".

## 9. Reglas de cálculo

- Todo se mide en minutos enteros y se muestra en horas y minutos.
- Cada minuto se clasifica por su fecha calendario y su hora. Domingo y festivo cuentan por la fecha en que cae el minuto. Confirmado: un turno de domingo a lunes cuenta como dominical nocturna hasta la medianoche y como nocturna ordinaria después.
- El descanso se resta de los minutos de la categoría con más minutos en el turno, sin bajar de cero.
- Semana de domingo a sábado (confirmado el 26 de octubre de 2026; antes se contaba de lunes a domingo por error). El primer día es configurable (`inicioSemana`, por defecto domingo). Un turno cuenta en la semana de su fecha de inicio, aunque termine en la semana siguiente. Horas de la semana = programadas netas de turnos ordinarios + netas de turnos de alquiler con destino "completar semana". Las horas prestadas cuentan como cumplidas (confirmado).
- Cada fracción de hora cuenta en la quincena de la fecha en que se trabajó. Se cobra en la colilla de la quincena siguiente.

## 10. Requisitos no funcionales

- Funciona en el navegador del computador y del celular (Safari en iPhone; Chrome y Samsung Internet en Android), sin internet una vez cargada.
- Datos guardados en el dispositivo. Sin servidor.
- No guarda datos personales ni de pacientes: solo horas, fechas y notas que Alejandro escriba.
- Se ejecuta en local con `npm run dev`, sin hosting de pago.

## 11. Escalar a compañeros

Cada compañero tendría su propio banco en su dispositivo, sin compartir nada. Lo único que cambia entre personas es el saldo inicial, las horas semanales y las plantillas de turno. Compartirla requiere un sitio estático gratuito (ver plan.md).

## 12. Criterios de aceptación

CA1. Un turno de alquiler de sábado 19:00 a domingo 03:00 (descanso 0) se parte en 5 h nocturnas de sábado y 3 h dominicales nocturnas.

CA2. Turno de 07:00 a 16:00 con 60 min de descanso (8 h programadas) y salida real a las 19:00 genera un pago de 3 h.

CA3. Con saldo inicial de 40 h, préstamo de 6 h y pago de 4 h, el saldo muestra 42 h.

CA4. Un pago que deja el saldo en negativo muestra aviso, pero no bloquea.

CA5. Un turno de alquiler de 8 h con destino "pagar deuda" baja el saldo 8 h. Con destino "completar semana" suma 8 h a la semana y deja el saldo igual.

CA6. Un turno trabajado el 10 de septiembre aparece en la colilla de la 2a quincena de septiembre. Uno trabajado el 20 de septiembre, en la 1a quincena de octubre.

CA7. En el extracto, el saldo después del último movimiento es igual al saldo de la pantalla principal.

CA8 (verificación opcional). Si Alejandro quiere, carga los turnos de una quincena cuya colilla ya tiene y las horas por categoría coinciden con las de la línea de recargos. No es requisito para dar la app por terminada.

CA9. Una quincena sin turnos nocturnos ni dominicales muestra 0 h en esas categorías, sin errores.

CA10. Un turno diurno de lunes de 07:00 a 16:00 con 60 min de descanso muestra 8 h netas, todas diurnas.

CA11. Un turno de lunes 19:00 a martes 07:00 con 120 min de descanso muestra 10 h netas: 9 h nocturnas y 1 h diurna. Antes del descanso son 11 h nocturnas (5 h del lunes y 6 h del martes hasta las 06:00) y 1 h diurna (06:00 a 07:00). El descanso se resta de la categoría con más minutos, la nocturna.

CA12. Elegir la plantilla "Día 8 h" rellena inicio 07:00, fin 16:00, descanso 60 y programadas 8 h, y los cuatro campos se pueden cambiar.

CA13. Actualizar la app conserva el saldo inicial y los movimientos ya guardados.

CA14. Con saldo de 33 h, un pago por capacitación de 2 h deja el saldo en 31 h y aparece en el extracto con la etiqueta "Capacitación o reunión".

CA15. Un pago por capacitación o reunión no cambia las horas por categoría de ninguna quincena ni el avance de la semana, aunque su fecha sea domingo o festivo.

CA22. Con la semana de domingo a sábado, un turno de alquiler del domingo 4 de octubre de 2026 con destino "completar semana" suma a la semana del 4 al 10 de octubre y no a la del 27 de septiembre al 3 de octubre. Un turno del sábado 3 de octubre de 19:00 a domingo 4 de octubre a las 07:00 cuenta completo en la semana del 27 de septiembre al 3 de octubre.

CA23. Con `inicioSemana` en lunes, el turno de alquiler del domingo 4 de octubre suma a la semana del 28 de septiembre al 4 de octubre. Cambiar el parámetro no modifica el saldo ni los movimientos.

## 13. Preguntas abiertas

1. Confirmar con la coordinadora si la hora extra seguirá compensándose en banco.
2. Una hora nocturna en domingo, ¿en qué línea de la colilla aparece? No bloquea: la app la cuenta aparte como dominical nocturna.
3. Las 42 horas semanales, ¿se cuentan en horas netas (sin descansos)? Por ahora sí. Se verifica contra una semana real.
4. El descanso se resta de la categoría con más minutos del turno. Si la clínica lo descuenta de otra forma, solo cambia el conteo por categoría, no el banco.
5. Horarios de los turnos de 12 h. Los de las plantillas son un ejemplo (07:00 a 19:00 y 19:00 a 07:00) y se ajustan en Ajustes.
6. Turnos de otras duraciones (6, 4, 10 h): sin descanso hasta que Alejandro cree una plantilla.
7. Las horas de capacitación o reunión, ¿cuentan para las 42 semanales? Por ahora no.
8. Si una capacitación o reunión cae de noche o en domingo, ¿la clínica la cuenta como recargo? Por ahora no se cuenta como categoría.
10. Un turno que cruza de sábado a domingo (por ejemplo una noche), ¿la clínica lo cuenta en la semana donde empieza? Por ahora sí, entero en la semana del sábado. Se verifica contra una semana real.
9. Avisos y errores sin color rojo, solo con texto y una palabra delante ("Aviso", "Error"). Si Alejandro prefiere un rojo para errores, se agrega un color a estilo-visual.md.

## 14. Estilo visual

La interfaz sigue estilo-visual.md (lienzo claro, tipografía como protagonista, un solo azul de acción). Reglas que cuentan como requisitos:

- Solo tema claro. Se retira el tema oscuro actual.
- Solo se usan los colores, tamaños de letra, radios y espacios de estilo-visual.md.
- Sin sombras. La jerarquía sale del tamaño de letra, las líneas finas y las superficies.
- El azul de acción (#0071e3) solo rellena botones principales y marca lo seleccionado.
- Los datos no cambian: este cambio es solo de apariencia y no toca saldos, turnos ni movimientos guardados.

Criterios de aceptación del estilo:

CA16. Un script revisa el código y falla si encuentra un color que no esté definido en `tokens.css`.

CA17. Botones, pestañas, filas que se pueden tocar y campos miden al menos 44 px de alto.

CA18. Con una pantalla de 360 px de ancho se llega a todas las pestañas y ningún texto queda cortado.

CA19. El texto tiene contraste mínimo de 4,5 a 1 sobre su fondo. El gris más claro permitido para texto es #707070.

CA20. Los campos de formulario usan letra de 16 px o más, para que el iPhone no haga zoom al tocarlos.

CA21. El extracto impreso sale en blanco y negro con líneas finas, sin azul.
