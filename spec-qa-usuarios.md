# Spec de QA: cinco usuarios sobre Arena

Estado: borrador v0.1, 26 de octubre de 2026. Cuelga de spec-companeros.md y no cambia ninguna regla de la app: solo dice cómo se prueba y qué se entrega.

## 1. Para qué

Encontrar lo que se le va a atravesar a un compañero antes del piloto de 5 a 8 personas. La prueba termina en un informe con capturas. No se arregla nada hasta que Alejandro marque qué hallazgos sí.

## 2. Entorno

La app corre con `npm run dev:emulador` (http://localhost:5173) y Auth y Firestore con `npm run emuladores` (puertos 9099 y 8080, interfaz en http://localhost:4000). Firestore necesita Java instalado.

Nunca `dev:nube` ni arena-horas.web.app: esos hablan con el proyecto real. En modo emulador la app cambia la llave por una falsa y solo conversa con 127.0.0.1.

El emulador arranca vacío, sin el documento configuracion/parametros. La app avisa y usa las reglas incluidas (RF-C16). Antes de la tanda se crea ese documento desde la interfaz del emulador con el contenido de parametros-iniciales.md, para ver lo que vería un compañero.

Cada usuario de prueba tiene su propia cuenta (por ejemplo prisa@prueba.test). De paso se comprueba CC11: ninguna cuenta ve datos de otra. Entre un usuario y el siguiente se vacían los datos del emulador. Los cinco corren uno tras otro, porque comparten navegador.

Lo que esta prueba no cubre: 3G real (el navegador integrado puede no dejar simular red lenta; si no deja, el usuario 1 se prueba solo en ancho de 375 px), un iPhone o un Android reales (CC13, CC18 y CC19 siguen pendientes en teléfono) y el inicio de sesión con Google.

## 3. Los cinco usuarios

Usuario 1, la auxiliar con prisa. Celular de 375 px, una mano libre, entre una cirugía y otra. Toca el primer botón que parece botón, no lee párrafos y se va si algo se queda esperando sin indicador o si un error no le deja salida. Primer éxito: con su cuenta ya creada, ver cuánto debe en menos de 10 segundos desde que abre la app, y registrar un turno ordinario con plantilla en 8 toques o menos. Se vigila: botón principal evidente, texto cortado a 375 px, teclado tapando "Confirmar" o "Guardar", pantalla de carga.

Usuario 2, la del turno de noche. Llena todo con sueño y como le sale. Primer éxito: registrar un turno Noche 12 h de viernes a sábado y uno de quirófano de alquiler, y que el saldo y el desglose queden bien, o que la app le diga qué corregir. Escribe "7.30", "7,30", "7:30", "8 h", " 8 ", "1.500", notas con tildes, eñes y mayúsculas, un turno de 07:00 a 07:00 y fechas tecleadas a medias. Se vigila que ningún texto se lea en silencio de otra manera distinta a la que ella quiso.

Usuario 3, la jefe que revisa. No entiende siglas y desconfía de los números. Primer éxito: con los casos de la sección 4, el saldo y el extracto coinciden con su cuenta a mano, y entiende cada línea sin preguntar. Se vigila: etiquetas, "Programado", "La clínica te debe X h", y que el PDF del extracto diga lo mismo que la pantalla.

Usuario 4, el compañero nuevo sin capacitación. Sigue la pantalla al pie de la letra. Primer éxito: crear cuenta, aceptar el aviso, cargar saldo inicial, horas semanales y plantillas, y registrar su primer turno en menos de 3 minutos (sección 4 de spec-companeros.md). Entrega una lista de textos ambiguos: texto exacto, en qué pantalla, qué entendió y qué significa de verdad. Es una simulación del modelo y sirve para sospechar de textos; que un compañero real los entienda solo se confirma con uno real durante el piloto.

Usuario 5, el que rompe. Doble toque en Confirmar, Guardar, Crear cuenta y Borrar. Botón atrás a mitad de un flujo (RF-C21). Recargar con el formulario a medias. Pegar 5000 caracteres con saltos de línea en una nota. Horas como "99999". Fechas con año 0001 o 20000. Descanso negativo o con decimales. Cerrar sesión con un formulario abierto. Guardar sin conexión, si el navegador deja simularlo. Dos pestañas con la misma cuenta editando el mismo turno (RF-C5). Borrar la cuenta y volver a entrar. Se vigila: filas duplicadas, saldo que cambia dos veces, pantallas en blanco, mensajes técnicos o en inglés.

## 4. Casos con respuesta conocida

La respuesta sale de la cuenta a mano de Alejandro, no del código que se está probando.

- A. Día 8 h, 07:00 a 16:00, descanso 60 min: 9 h de reloj, 8 h netas.
- B. Noche 12 h, 19:00 a 07:00, descanso 120 min: 12 h de reloj, 10 h netas. El reparto entre nocturnas y diurnas lo calcula Alejandro antes de la prueba.
- C. Quirófano de alquiler de sábado a domingo cruzando la medianoche. Alejandro define el reparto esperado (dominical nocturna hasta las 00:00 y nocturna normal después, según lo que ya confirmó).
- D. Saldo inicial 10 h, préstamo 4 h, pago 3 h: saldo 11 h.
- E. Pago mayor que la deuda, por ejemplo saldo 1 h y pago 3 h: debe decir "La clínica te debe 2 h" (CC7).
- F. Préstamo con fecha futura: aparece como "Programado", el saldo actual no cambia y el proyectado sí (CC8).

## 5. Cómo se reporta

Cada hallazgo lleva: número, usuario o usuarios que lo sufren, gravedad, pasos, qué se esperaba, qué pasó y captura.

Gravedad 1: el saldo o los datos quedan mal sin aviso, o se pierden o se duplican. Gravedad 2: impide llegar al primer éxito. Gravedad 3: confunde pero se resuelve. Gravedad 4: detalle visual.

El informe se ordena por gravedad. Dentro de la misma gravedad, por cuántos usuarios lo sufren, que va como dato al lado.

## 6. Sospechas que salen de leer el código

Todavía sin probar. La prueba las confirma o las descarta.

1. `parsearDuracion("7.30")` devuelve 7 h 18 min, porque lee 7,3 horas. "1.500" da 1 h 30 min. Aplica a horas programadas y a los movimientos.
2. FormularioMovimiento solo exige fecha no vacía y horas mayores que 0. Puede que dominio lo valide más adelante; falta confirmarlo. Si no, "99999" y el año 0001 se guardan.
3. Para la misma regla hay dos mensajes distintos: el de horas programadas dice "8 o 7:30" y el de movimientos dice "4, 4:30 o 4,5".
4. Un turno con inicio y fin iguales dura 24 h por regla y hay texto de ayuda en el formulario. Falta ver si en la pantalla de revisión se nota.
5. Confirmar (Turnos) y Guardar (Banco) llaman a `cambiar()` sin protección propia contra doble toque. Lo que los salva, si algo, es que la vista cambia al primer toque. Hay que comprobarlo.

## 7. Cuándo se da por bueno

- Ningún hallazgo de gravedad 1 abierto.
- Los de gravedad 2 de los usuarios 1 y 4 resueltos.
- Cada arreglo con una prueba nueva en tests/ que falla antes y pasa después, sin tocar las pruebas de dominio existentes.
- `npm test` y `npm run check:estilo` en verde.
- Los cinco usuarios repetidos con las mismas cuentas y pasos, sin que reaparezca ningún hallazgo cerrado.

## 8. Orden de trabajo

1. Alejandro revisa y corrige este spec.
2. Alejandro levanta los emuladores y la app.
3. Se corren los cinco usuarios y sale el informe, sin tocar código.
4. Alejandro marca qué hallazgos sí se arreglan.
5. Arreglo con la prueba primero, una tarea a la vez.
6. Se repiten los cinco usuarios.
