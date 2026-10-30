# Arena

Arena es el nombre de la app (antes "Banco de horas"). App web personal para llevar el banco de horas de una clínica (horas que se deben y horas que se pagan) y las horas nocturnas y dominicales por quincena. No calcula dinero. Se construye con Spec-Driven Development.

## Documentos

- spec-banco-de-horas.md: qué hace la app y las reglas. Manda sobre todo lo demás.
- plan.md: cómo se construye (stack, carpetas, algoritmos).
- tasks.md: orden de trabajo. Se hace una tarea a la vez.
- estilo-visual.md: colores, letra, espacios y componentes de la interfaz.
- spec-companeros.md y plan-nube.md: versión con cuenta y nube para compañeros (Fase 6, desde T22).
- aviso-privacidad.md: borrador del aviso que la app muestra y hace aceptar.
- parametros-iniciales.md: valores y forma del documento de parámetros globales.
- decisiones-del-piloto.md: memoria del proyecto: decisiones y hallazgos del piloto. Vale tanto como el spec.
- arena-animado.html: reloj de arena animado de referencia (login y pantalla de carga). Los íconos están en icono-reloj-arena.svg e icono-app-oscuro.svg.

Lee spec, plan, tasks y estilo-visual antes de escribir código. Para la Fase 6 lee también los cuatro últimos.

## Forma de trabajar

1. Toma la siguiente tarea sin marcar de tasks.md.
2. Escribe primero la prueba que sale del criterio de aceptación del spec. Verifica que falla.
3. Escribe el código mínimo para que pase.
4. Corre `npm test`. Si hay algo en rojo, no sigas.
5. Marca la tarea en tasks.md y haz un commit con el número de la tarea.

Antes de empezar cualquier tarea, lee decisiones-del-piloto.md completo. Si la tarea choca con una decisión de ese archivo, avísame antes de programar. Cuando una tarea corrija una falla reportada por un usuario, agrega la entrada al final de ese archivo en el mismo commit.

Si el spec no alcanza para decidir una regla, pregunta. No inventes horarios ni reglas de la clínica. No agregues cálculos de dinero: salario, recargos en pesos y nómina están fuera del alcance. Si cambia una regla, se actualiza el spec primero y después el código.

## Reglas de código

- `src/dominio/` es lógica pura: no importa React, ni localStorage, ni nada de `ui/` o `almacenamiento/`.
- Tiempo en minutos enteros y fechas como texto local. Sin librerías de fechas.
- Los valores que pueden cambiar (42 horas, 19:00, desfase de quincena) viven en la configuración, no en el código.
- Cada movimiento y cada turno guarda cuándo se creó y cuándo se modificó.
- Pocas dependencias. Antes de agregar una, explica por qué hace falta.
- No guardar datos personales: nada de cédula, salario ni datos de la colilla. Solo horas, fechas y notas.
- Interfaz en español colombiano, pensada primero para celular, para iPhone y Android por igual (Safari, Chrome y Samsung Internet). Nada se da por bueno si solo se probó en uno de los dos sistemas.
- Estilo visual (vidrio): solo los colores, tamaños de letra, radios, sombras y espacios de `src/ui/estilo/tokens.css` (sale de estilo-visual.md). Sin colores ni sombras sueltos en los componentes, sin tema oscuro y sin librerías de UI. Ningún texto con menos de 4,5 de contraste. El vidrio (`backdrop-filter`) solo en tarjetas y siempre con respaldo sólido. Si hace falta algo que el documento no define, pregunta antes de inventarlo.
- Un cambio de estilo no toca `src/dominio/` ni los datos guardados.
- Fase 6 (nube): las reglas de seguridad se escriben y se prueban antes que el código que usa la base. Ninguna pantalla muestra datos de otra persona. No se guardan llaves ni secretos en el repositorio. Las pruebas de dominio existentes no se modifican para que pasen. Para T26, el login de referencia está en el repositorio bitacora-aida-v2: pídele a Alejandro la ruta, léelo y adáptalo a React y TypeScript.

## Sobre Alejandro

Estudia segundo semestre de ingeniería de software y quiere aprender buenas prácticas, no solo recibir código. Explica las decisiones importantes en pocas líneas, en un tono directo e informal. No expliques lo obvio.

## Comandos

- `npm run dev`: servidor local.
- `npm run dev -- --host`: accesible desde el celular por la misma red wifi.
- `npm test`: pruebas.
- `npm run build`: genera los archivos estáticos.
