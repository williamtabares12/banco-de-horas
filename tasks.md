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
- [x] T11. PWA con vite-plugin-pwa: instalable y funcional sin internet. Aviso de respaldo en Inicio. Íconos de 192 y 512 px (uno maskable), `apple-touch-icon` de 180 px, y manifiesto con color de fondo y de tema.
- [x] T12. README con cómo correr, probar y exportar los datos, y cómo publicar en un hosting estático gratuito.

## Fase 5: descansos (cambio del spec v0.7)

Se hacen después de lo que ya esté construido, en este orden. La app ya tiene datos reales guardados en el celular de Alejandro, así que primero se protege eso.

- [x] T13. Modelo y migración. Agregar `descansoMin` al turno, `plantillas` a la configuración y `schemaVersion` al almacenamiento. Migrar los datos viejos: turnos con descanso 0 y plantillas de ejemplo (Día 8 h, Día 12 h, Noche 12 h). Pruebas: CA13 con un JSON del formato anterior, importar un respaldo viejo.
- [x] T14. Dominio con descanso. Minutos netos en `segmentar.ts`, `banco.ts` y `semana.ts`. Pruebas: CA2, CA10, CA11, CA5 con minutos netos, descanso mayor que la categoría mayoritaria no baja de cero.
- [x] T15. Plantillas en pantalla: crear, editar y borrar en Ajustes. En el formulario de turno, elegir plantilla rellena inicio, fin, descanso y programadas, todo editable. El desglose y el movimiento de banco usan minutos netos. Prueba: CA12.
- [x] T16. Arreglo visual: la barra de pestañas se corta en celular (se ve "Quincen" truncado). Que se desplace de lado o use letra más pequeña en pantallas angostas. Si ya se hizo T19, queda cubierta por el criterio CA18.
- [x] T17. Pago por capacitación o reunión (spec v0.8). Agregar `motivo` opcional al movimiento. En Banco, el botón de pago pide el motivo (capacitación o reunión, u otro), con fecha, duración y nota. Extracto con etiqueta. Pruebas: CA14, CA15, y que los pagos manuales viejos sigan funcionando como "Otro". No requiere migración de datos.

## Fase 5b: estilo visual (cambio del spec v0.9)

Solo cambia la apariencia. No se toca `src/dominio/` ni los datos guardados, y las pruebas existentes deben seguir en verde.

- [x] T18. Tokens y base. Crear `src/ui/estilo/tokens.css` con las variables de estilo-visual.md sección 8, estilos globales (fondo `--color-lienzo`, letra según estilo-visual.md sección 3 con Inter incluida en la app para Android, tamaños en rem, 17 px de base, cifras tabulares, alturas con `100dvh`, márgenes con `env(safe-area-inset-*)`, `color-scheme: light`), color de tema en el manifiesto y en la etiqueta meta, y `scripts/check-estilo.mjs` con `npm run check:estilo`. Hecho cuando CA16 pasa.
- [x] T19. Componentes. Botón relleno, botón de contorno, enlace, pestañas con desplazamiento de lado (activa en azul), campo de formulario, fila de lista, barra de avance, interruptor y diálogo de confirmación, según la sección 5 del documento de estilo. Hecho cuando CA17 y CA18 se cumplen.
- [x] T20. Pantallas. Rehacer Inicio, Turnos, Banco, Quincena, Extracto (con estilos de impresión) y Ajustes con esos componentes. Sin tarjetas con fondo, sin sombras y sin tema oscuro. Hecho cuando CA21 se cumple y `npm run check:estilo` pasa.
- [x] T21. Revisión en un iPhone y en un Android (Chrome y Samsung Internet, con y sin la app instalada), con la letra del sistema en tamaño grande y en una pantalla angosta de 360 px. Alejandro pide prestado un Android a un compañero: contraste, tamaños táctiles, campos sin zoom, pestañas sin cortar. Lista de hallazgos para corregir. Hecho cuando CA19 y CA20 se cumplen.

## Fase 6: versión para compañeros (spec-companeros.md y plan-nube.md)

Se empieza cuando las fases 5 y 5b estén terminadas y Alejandro haya usado la app unos días. Primero las reglas de seguridad y sus pruebas, después el código de nube. Orden de la fase: T22, T23, T24, T33, T25, T34, T26, T35, T36 y luego T27 a T32. Las pruebas de dominio existentes no se modifican para que pasen.

- [x] T22. Proyecto y entorno de Firebase. Alejandro crea el proyecto nuevo en su cuenta personal (plan gratuito), activa Authentication con Google, Firestore y Hosting. Claude Code lo guía paso a paso, instala `firebase-tools`, configura los emuladores de Auth y Firestore (el de Firestore necesita Java instalado) y el archivo `firebase.json`. Sin secretos en el repositorio. Hecho cuando `npm run emuladores` levanta Auth y Firestore.
- [x] T23. Reglas de seguridad y sus pruebas. Escribir primero las pruebas con dos usuarios y un visitante sin sesión, y después las reglas de plan-nube.md sección 3. Después Alejandro las publica en la consola de Firebase: en modo producción, Firestore niega todo hasta que haya reglas. Hecho cuando CC1 y CC2 pasan en el emulador y las reglas están publicadas.
- [x] T24. Dominio: saldo actual, saldo proyectado, movimientos "Programado" y saldo a favor. Funciones nuevas, sin tocar las existentes. Hecho cuando CC7, CC8 y CC9 pasan.
- [x] T25. `RepositorioFirestore` con caché local persistente y lectura en tiempo real. Pruebas en el emulador: guardar, leer, editar, borrar, turno y su movimiento en el mismo lote. Los cambios se ven al instante y no se vuelve a leer todo el historial después de cada operación (CC12). Hecho cuando pasan y el repositorio local sigue funcionando para las pruebas.
- [x] T26. Inicio de sesión y primer ingreso. Primero, portar a React y TypeScript el login de Bitácora AIDA v2: módulo `auth`, pantallas de inicio de sesión y de registro, recuperación por correo, inicio con Google y la hoja de política de privacidad. Se hace leyendo el repositorio bitacora-aida-v2 (Alejandro le da la ruta a Claude Code) y adaptando también sus pruebas. Después, el primer ingreso en pasos (aviso y casilla, saldo inicial, horas semanales, plantillas) y el cierre de sesión. Probar en Safari del iPhone y en Chrome y Samsung Internet de Android, con la app instalada en cada uno; si Google falla en la instalada, probar redirección con `authDomain` propio. Hecho cuando CC3 y CC13 pasan.
- [x] T27. Importar un respaldo JSON a la cuenta, con validación y lotes de máximo 500 operaciones. Hecho cuando CC5 pasa y un JSON inválido no escribe nada.
- [x] T28. Pantallas: "La clínica te debe X h", etiqueta "Programado" y saldo proyectado, indicador de sincronización, recordatorio de no escribir datos de pacientes en las notas. Con el estilo de estilo-visual.md. Hecho cuando CC4, CC7, CC8 y CC10 se cumplen.
- [ ] T29. Exportar mis datos (JSON y PDF) y borrar mi cuenta con reautenticación y borrado por lotes. Hecho cuando CC6 pasa.
- [ ] T30. Pantalla "Acerca de": versión de la app, aviso de privacidad (texto de aviso-privacidad.md ya revisado), correo de contacto, leyenda de "Registro personal, no oficial" y botón para reportar un problema. Sin nombre ni logo de la clínica.
- [ ] T31. Despliegue en Firebase Hosting con la PWA (T11). Revisar las cuotas vigentes del plan gratuito. Prueba de punta a punta con dos cuentas en dos celulares (CC11). Hecho cuando A no ve nada de B y la app instalada funciona sin internet.
- [ ] T32. Piloto (lo hace Alejandro, no Claude Code): invitar a 5 a 8 compañeros por enlace, dos semanas, canal de comentarios, lista de problemas. Hecho cuando se cumplen los criterios de la sección 8 de spec-companeros.md.

Parámetros globales (plan-nube.md sección 6b y parametros-iniciales.md). Se hacen en el orden indicado arriba, no al final.

- [x] T33 (después de T24). Dominio con reglas versionadas. `ReglasGlobales` con fecha de vigencia y una función `reglasVigentes(reglas, fecha)`. `segmentar`, `banco`, `semana` y `tiempo` reciben las reglas como argumento, con las reglas por defecto (las del documento inicial) como valor predeterminado, para que las pruebas existentes pasen sin modificarse. Pruebas primero: CC16 y CC9.
- [x] T34 (después de T25). Parámetros globales en la nube. Agregar a las reglas de seguridad la regla de `configuracion/parametros` y su prueba (CC14). Escribir `validarParametros` y la lectura una vez por sesión con copia en memoria, con respaldo a la última copia guardada o a las reglas incluidas, y aviso claro (CC15). Alejandro crea el documento en la consola con los valores de parametros-iniciales.md, guiado paso a paso por Claude Code, y lo prueba con su cuenta. Hecho cuando CC14 y CC15 pasan.
- [ ] T36 (después de T35). Compatibilidad iPhone y Android (plan-nube.md sección 9b). Botón atrás con la API de historial (RF-C21), botón "Instalar app" en Android y guía de tres pasos en iPhone (RF-C19), aviso en navegadores embebidos con botón para copiar el enlace (RF-C20), hora siempre repetida en 24 horas antes de guardar (RF-C22), `inputmode` y `autocomplete` correctos, estado presionado propio. Pruebas automáticas de navegación y de hora. Después, revisión manual en un iPhone y en un Android real, con la CPU limitada desde Chrome para simular gama baja. Hecho cuando CC18, CC19 y CC20 pasan.
- [x] T35 (después de T26). Reglas globales en pantalla y reautorización. En Ajustes, mostrar en solo lectura las reglas vigentes con su fecha. Copiar las plantillas por defecto en el primer ingreso. Si sube `avisoVersion`, pedir aceptar el aviso de nuevo. Hecho cuando CC17 pasa.
- [ ] T37 (después de T18 y T26). Marca Arena y login. Convertir icono-app-oscuro.svg en los PNG para T11 (192 y 512 maskable, `apple-touch-icon` de 180). Rediseñar el login según RF-C23 y estilo-visual.md sección 6b, sin tocar los botones existentes. Hecho cuando CC21 y CC23 pasan, `npm run check:estilo` pasa y el login se ve igual en iPhone y Android (revisión manual junto con T21).
- [ ] T38 (después de T37). Pantalla de carga con el reloj de arena (RF-C24). Componente que solo aparece tras 300 ms, mensaje de demora a los 6 s, `role="status"` con el texto "Abriendo Arena" y sin animación con movimiento reducido. Hecho cuando CC22 y CC23 pasan y, en un Android de gama baja, el giro se ve fluido; si no, se reduce a un fundido.
