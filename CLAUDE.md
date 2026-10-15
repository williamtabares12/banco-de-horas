# Banco de horas

App web personal para llevar el banco de horas de una clínica (horas que se deben y horas que se pagan) y las horas nocturnas y dominicales por quincena. No calcula dinero. Se construye con Spec-Driven Development.

## Documentos

- spec-banco-de-horas.md: qué hace la app y las reglas. Manda sobre todo lo demás.
- plan.md: cómo se construye (stack, carpetas, algoritmos).
- tasks.md: orden de trabajo. Se hace una tarea a la vez.
- estilo-visual.md: colores, letra, espacios y componentes de la interfaz.

Lee los cuatro antes de escribir código.

## Forma de trabajar

1. Toma la siguiente tarea sin marcar de tasks.md.
2. Escribe primero la prueba que sale del criterio de aceptación del spec. Verifica que falla.
3. Escribe el código mínimo para que pase.
4. Corre `npm test`. Si hay algo en rojo, no sigas.
5. Marca la tarea en tasks.md y haz un commit con el número de la tarea.

Si el spec no alcanza para decidir una regla, pregunta. No inventes horarios ni reglas de la clínica. No agregues cálculos de dinero: salario, recargos en pesos y nómina están fuera del alcance. Si cambia una regla, se actualiza el spec primero y después el código.

## Reglas de código

- `src/dominio/` es lógica pura: no importa React, ni localStorage, ni nada de `ui/` o `almacenamiento/`.
- Tiempo en minutos enteros y fechas como texto local. Sin librerías de fechas.
- Los valores que pueden cambiar (42 horas, 19:00, desfase de quincena) viven en la configuración, no en el código.
- Cada movimiento y cada turno guarda cuándo se creó y cuándo se modificó.
- Pocas dependencias. Antes de agregar una, explica por qué hace falta.
- No guardar datos personales: nada de cédula, salario ni datos de la colilla. Solo horas, fechas y notas.
- Interfaz en español colombiano, pensada primero para celular.
- Estilo visual: solo los colores, tamaños de letra, radios y espacios de `src/ui/estilo/tokens.css` (sale de estilo-visual.md). Sin colores sueltos en los componentes, sin sombras, sin tema oscuro y sin librerías de UI. Si hace falta algo que el documento no define (un color de error, por ejemplo), pregunta antes de inventarlo.
- Un cambio de estilo no toca `src/dominio/` ni los datos guardados.

## Sobre Alejandro

Estudia segundo semestre de ingeniería de software y quiere aprender buenas prácticas, no solo recibir código. Explica las decisiones importantes en pocas líneas, en un tono directo e informal. No expliques lo obvio.

## Comandos

- `npm run dev`: servidor local.
- `npm run dev -- --host`: accesible desde el celular por la misma red wifi.
- `npm test`: pruebas.
- `npm run build`: genera los archivos estáticos.
