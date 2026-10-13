# Spec: App de banco de horas

Estado: borrador v0.6. Sin parte monetaria. Confirmadas las reglas de horas prestadas y de domingo a lunes. Plan técnico en plan.md, tareas en tasks.md.

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

## 5. Datos de la colilla que importan

- Los recargos se listan en horas por tipo. En la 2a quincena de septiembre de 2026 fueron 33 horas de recargo nocturno y 17 de recargo diurno dominical y festivo. Es solo un ejemplo: cada quincena varía y a veces es cero.
- Esas horas se trabajaron del 1 al 15 de septiembre. Los recargos se cobran en la colilla de la quincena siguiente (desfase 1).
- Jornada nocturna desde las 19:00 (confirmado).
- Jornada semanal: 42 horas.
- Quincenas: 1 al 15 y 16 al fin de mes.

## 6. Conceptos

Turno: bloque de trabajo con fecha, hora de inicio, hora de fin (puede cruzar medianoche), horas programadas y tipo: ordinario o quirófano de alquiler.

Segmentación: la app parte cada turno por hora y por día, y clasifica cada fracción como diurna, nocturna, dominical/festiva diurna o dominical/festiva nocturna.

Movimiento de banco, de cuatro tipos:

- Saldo inicial: lo carga Alejandro una vez, con fecha y total de horas debidas.
- Préstamo: la clínica acortó o canceló un turno. La deuda sube.
- Pago: horas trabajadas que devuelven deuda. La deuda baja.
- Ajuste manual: corrección con nota.

Saldo de deuda: saldo inicial + préstamos - pagos +/- ajustes, en horas y minutos.

## 7. Reglas del banco

Turno ordinario. Tiene horas programadas y horas reales. La diferencia genera un movimiento automático:

- Reales menor que programadas: préstamo por la diferencia.
- Reales mayor que programadas: pago por la diferencia, 1 a 1.
- Ejemplo: programado de 8 h, hecho de 12 h, pago de 4 h.

Turno de quirófano de alquiler. Cada turno lleva un destino que Alejandro elige: "pagar deuda" o "completar semana de 42 h". Con "pagar deuda", todas sus horas generan un pago.

Las horas extra se compensan contra el banco. Hay un interruptor de configuración (extras descuentan deuda, activo por defecto) por si la clínica cambia la regla y empieza a pagarlas aparte.

Alejandro puede editar o borrar cualquier movimiento automático. Lo editado queda marcado como manual.

## 8. Requisitos funcionales

RF1. Registrar un turno con fecha, inicio, fin, horas programadas, tipo y, si es de alquiler, destino.

RF2. Al guardar, mostrar el desglose de horas: diurnas, nocturnas, dominicales/festivas diurnas y dominicales/festivas nocturnas.

RF3. Generar el movimiento de banco automático según la sección 7 y mostrarlo antes de confirmar.

RF4. Registrar saldo inicial, préstamos, pagos y ajustes manuales, cada uno con fecha y nota opcional (por ejemplo, quién autorizó).

RF5. Pantalla principal: saldo de deuda, total prestado, total pagado y avance de la semana (horas / 42).

RF6. Vista por quincena: horas por categoría y en qué colilla deberían aparecer, para compararlas con la línea de recargos.

RF7. Historial de turnos y movimientos, editable y borrable. Cada registro guarda cuándo se creó y cuándo se modificó por última vez.

RF8. Extracto de horas: una vista imprimible (guardable como PDF) con el saldo inicial, cada movimiento con fecha y nota, y el saldo después de cada uno. Sirve para mostrárselo a la coordinadora.

RF9. Configuración: horas semanales (42), inicio de jornada nocturna (19:00), desfase de pago de recargos (por defecto 1 quincena), interruptor de extras, festivos a agregar o quitar.

RF10. Festivos de Colombia calculados por código (ley Emiliani y Semana Santa), con opción de agregar o quitar fechas a mano.

RF11. Exportar e importar los datos en JSON.

## 9. Reglas de cálculo

- Todo se mide en minutos enteros y se muestra en horas y minutos.
- Cada minuto se clasifica por su fecha calendario y su hora. Domingo y festivo cuentan por la fecha en que cae el minuto. Confirmado: un turno de domingo a lunes cuenta como dominical nocturna hasta la medianoche y como nocturna ordinaria después.
- Semana de lunes a domingo, configurable. Horas de la semana = programadas de turnos ordinarios + reales de turnos de alquiler con destino "completar semana". Las horas prestadas cuentan como cumplidas (confirmado).
- Cada fracción de hora cuenta en la quincena de la fecha en que se trabajó. Se cobra en la colilla de la quincena siguiente.

## 10. Requisitos no funcionales

- Funciona en el navegador del computador y del celular, sin internet una vez cargada.
- Datos guardados en el dispositivo. Sin servidor.
- No guarda datos personales ni de pacientes: solo horas, fechas y notas que Alejandro escriba.
- Se ejecuta en local con `npm run dev`, sin hosting de pago.

## 11. Escalar a compañeros

Cada compañero tendría su propio banco en su dispositivo, sin compartir nada. Lo único que cambia entre personas es el saldo inicial y las horas semanales. Compartirla requiere un sitio estático gratuito (ver plan.md).

## 12. Criterios de aceptación

CA1. Un turno de sábado 19:00 a domingo 03:00 se parte en 5 h nocturnas de sábado y 3 h dominicales nocturnas.

CA2. Turno programado de 8 h con 12 h reales genera un pago de 4 h.

CA3. Con saldo inicial de 40 h, préstamo de 6 h y pago de 4 h, el saldo muestra 42 h.

CA4. Un pago que deja el saldo en negativo muestra aviso, pero no bloquea.

CA5. Un turno de alquiler de 8 h con destino "pagar deuda" baja el saldo 8 h. Con destino "completar semana" suma 8 h a la semana y deja el saldo igual.

CA6. Un turno trabajado el 10 de septiembre aparece en la colilla de la 2a quincena de septiembre. Uno trabajado el 20 de septiembre, en la 1a quincena de octubre.

CA7. En el extracto, el saldo después del último movimiento es igual al saldo de la pantalla principal.

CA8 (verificación opcional). Si Alejandro quiere, carga los turnos de una quincena cuya colilla ya tiene y las horas por categoría coinciden con las de la línea de recargos. No es requisito para dar la app por terminada.

CA9. Una quincena sin turnos nocturnos ni dominicales muestra 0 h en esas categorías, sin errores.

## 13. Preguntas abiertas

1. Confirmar con la coordinadora si la hora extra seguirá compensándose en banco.
2. Una hora nocturna en domingo, ¿en qué línea de la colilla aparece? No bloquea: la app la cuenta aparte como dominical nocturna.
