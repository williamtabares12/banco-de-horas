# Plan técnico: versión con cuenta y nube

Deriva de spec-companeros.md (v0.1). Extiende plan.md: la estructura, el dominio, los algoritmos y el estilo no cambian. Aquí solo va lo nuevo.

## 1. Decisiones

- Firebase, el mismo conjunto que usa Bitácora AIDA v2: Authentication (correo y contraseña, y Google), Cloud Firestore y Hosting.
- Proyecto de Firebase nuevo, en la cuenta personal de Alejandro, en el plan gratuito (Spark). Separado de Bitácora AIDA para aislar datos y cuotas.
- SDK modular de Firebase para web.
- La interfaz `Repositorio` ya existe. Se agrega `RepositorioFirestore` que la implementa. `RepositorioLocal` queda para las pruebas y para leer respaldos viejos. La UI y el dominio no se enteran del cambio.
- Caché local persistente de Firestore, para que la app funcione sin señal.
- El saldo y los totales no se guardan: se calculan en el cliente a partir de los movimientos. Así no hay números que puedan quedar desfasados.
- Las pruebas de reglas y del repositorio corren contra el emulador de Firebase (Auth y Firestore), sin tocar datos reales.

## 2. Estructura de datos en Firestore

```
usuarios/{uid}                     perfil: correo, creadoEn, avisoVersion, avisoAceptadoEn, schemaVersion
usuarios/{uid}/config/principal    Config personal (horas semanales propias, plantillas, festivos propios)
usuarios/{uid}/turnos/{id}         Turno
usuarios/{uid}/movimientos/{id}    MovimientoBanco
configuracion/parametros           Parámetros globales (solo lectura desde la app, ver sección 6b)
```

Los documentos conservan los mismos campos que en la versión local, con los mismos id. Eso hace que importar un respaldo sea copiar documentos. `creadoEn` y `modificadoEn` siguen siendo texto ISO del dispositivo. No son prueba legal, porque la hora del celular se puede cambiar.

Volumen esperado: unos cientos de documentos por persona. Con 8 personas queda muy por debajo de las lecturas y escrituras diarias del plan gratuito, pero se revisa la cuota vigente en T31.

## 3. Reglas de seguridad

Punto de partida, que se prueba antes de escribir código de nube (T23):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{uid}/{documento=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Parámetros globales: los lee cualquier persona con sesión, nadie los
    // escribe desde la app (se editan desde la consola de Firebase).
    match /configuracion/parametros {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

Cualquier otra ruta queda denegada por defecto. Después se agregan validaciones de tipo (por ejemplo, que `minutos` sea un número y que los textos no pasen de un tamaño razonable).

La `apiKey` de Firebase para web no es un secreto: la seguridad la dan las reglas. Aun así se restringe la llave a los dominios de la app y se autorizan en Authentication solo esos dominios. No se guarda ninguna llave de cuenta de servicio en el repositorio.

## 4. Inicio de sesión

Se reutiliza el diseño del inicio de sesión de Bitácora AIDA v2, que ya está probado, portado a React y TypeScript. Un módulo `auth` encapsula todo lo de Firebase Auth y expone: registrarConCorreo, iniciarSesionConCorreo, iniciarSesionConGoogle, enviarCorreoRecuperacion, cerrarSesion y observarSesion. Ninguna otra parte de la app toca Firebase Auth directamente, y la sesión decide qué pantalla se ve.

Lo que se reutiliza: las pantallas de inicio de sesión y de registro, los mensajes de error en español, la recuperación de contraseña, el texto de la autorización y la política de privacidad en una hoja que sube desde abajo, accesible desde el inicio de sesión y desde la pantalla principal. El código vive en el repositorio bitacora-aida-v2: se lee y se adapta, con sus pruebas, no se copia a ciegas. Esa versión está escrita en JavaScript sin React, así que es un port. El proyecto de Firebase de esta app es otro, por lo que las cuentas no se comparten con Bitácora AIDA.

El inicio con Google puede dar problemas en iPhone, con las ventanas emergentes y con los bloqueos de cookies de terceros de Safari, sobre todo en la app instalada. Se prueba en Safari y en la app instalada (T26). Si falla, se cambia a redirección con `authDomain` igual al dominio de Hosting.

## 5. Primer ingreso e importación

Al iniciar sesión por primera vez no existe `usuarios/{uid}`. La app detecta eso y muestra la bienvenida. Al terminarla escribe, en un solo lote: el perfil con la versión del aviso aceptado, la configuración, el saldo inicial como un movimiento y las plantillas. Si la persona elige importar un respaldo JSON, se valida con el mismo validador de la versión local y se escribe en lotes de máximo 500 operaciones, que es el límite de Firestore. Un JSON inválido no escribe nada.

## 6. Dominio: saldo con fechas futuras

Función nueva, sin tocar las existentes:

- `saldoActual(movimientos, hoy)`: suma los movimientos con fecha hasta hoy.
- `saldoProyectado(movimientos)`: suma todos.
- Un movimiento es "Programado" si su fecha es posterior a hoy.
- Un saldo menor que cero se informa como "a favor": la clínica le debe a la persona.

Las pruebas existentes de `banco.ts` no se modifican.

## 6b. Parámetros globales (`configuracion/parametros`)

Es el mismo patrón de Bitácora AIDA v2: un documento que todas las personas con sesión leen y nadie escribe desde la app. Alejandro lo edita desde la consola de Firebase, que no pasa por las reglas. Los valores iniciales y cómo crearlo están en parametros-iniciales.md.

Contenido:

- `version`: número que sube cada vez que se edita.
- `avisoVersion`: versión vigente del aviso de privacidad. Si sube, la app pide aceptar de nuevo.
- `reglas`: mapa cuya clave es la fecha desde la que rige la regla y cuyo valor trae `nocturnoDesde`, `nocturnoHasta`, `minutosSemana`, `desfaseQuincenas` y `extrasDescuentanDeuda`. Son mapas y no arreglos porque la consola de Firebase los edita más fácil.
- `festivosAgregados` y `festivosQuitados`: fechas que se suman o se restan a los festivos calculados por código.
- `plantillasPorDefecto`: mapa de plantillas que se copian a una persona nueva en su primer ingreso. Cambiar el documento no cambia las plantillas de quienes ya se registraron.

Qué es global y qué es personal. Global: hora nocturna, desfase de pago, extras descuentan deuda, horas semanales por defecto y festivos extra. Personal: saldo inicial, plantillas, horas semanales propias si difieren y festivos propios. En Ajustes, las reglas globales se muestran en solo lectura, con la fecha desde la que rigen.

Vigencia. El dominio recibe la lista de reglas y usa la que rige en la fecha calendario de cada minuto, igual que las tarifas del plan base. Una regla nueva con fecha futura no cambia lo ya calculado. Por eso nunca se edita una regla vieja: se agrega una nueva con su fecha, salvo para corregir un error de tipeo.

Dos precisiones (decididas con Alejandro en T33): (1) antes de la primera regla rige la primera, hacia atrás; solo las reglas nuevas tienen fecha de cambio; sin ninguna regla es un error, nunca se calcula con valores a medias. (2) Lo que no es por minuto se busca con la fecha de inicio del periodo o del turno: la meta semanal con el lunes de la semana, el desfase de cobro con el primer día de la quincena y "las extras descuentan deuda" con la fecha de inicio del turno. Una regla que arranca a mitad de semana empieza a regir la semana siguiente. En la versión personal, que no tiene fechas, la configuración de Ajustes se comporta como una sola regla que rige siempre.

Lectura. Una vez por sesión, con la copia en memoria (lección de Bitácora AIDA). Se valida su forma como hace `validarParametros` en Bitácora: tipos correctos y campos completos. Si falta algo o el documento no existe, la app avisa con un mensaje claro y usa la última copia guardada en el dispositivo o, si no hay, las reglas incluidas en la app (las mismas del documento inicial). Nunca calcula con valores a medias.

Dominio. Las funciones de `segmentar`, `banco`, `semana` y `tiempo` reciben las reglas como argumento, con las reglas por defecto como valor predeterminado. Así la versión personal y las pruebas existentes siguen funcionando sin cambios, y la versión de nube pasa las reglas leídas del documento.

Riesgo. Un error de tipeo en la consola afecta a todos a la vez. Por eso la validación, la copia local, subir `version` en cada edición y abrir la app con tu cuenta después de cada cambio, antes de que los demás la abran.

## 7. Sincronización y conflictos

Comportamiento por defecto de Firestore: la última escritura gana, documento por documento. Es suficiente porque cada persona edita sus propios datos y casi siempre desde un solo dispositivo. Cuando un movimiento se genera de un turno, se escribe en el mismo lote que el turno, para que no queden uno sin el otro.

Dos lecciones de Bitácora AIDA v2 que se aplican desde el inicio: no volver a leer todo el historial después de cada crear, editar o borrar (se actualiza la caché en memoria, o llega solo con la escucha en tiempo real), y mostrar el cambio al instante en pantalla. Con la latencia de Firestore, un borrado parecía no funcionar hasta que otra acción redibujaba la lista.

## 8. Borrado de cuenta

Cliente: pedir de nuevo el inicio de sesión (Firebase lo exige para operaciones sensibles), borrar las tres subcolecciones y el perfil en lotes, y luego eliminar el usuario de Authentication. Si algo falla a mitad de camino, el proceso se puede repetir sin dejar datos huérfanos. Se verifica en el emulador (CC6).

## 9. Despliegue

Firebase Hosting, con el sitio de Bitácora AIDA aparte. La PWA (T11) se activa aquí, porque Hosting da HTTPS. Dominio gratuito `*.web.app`. Se despliega a mano con `firebase deploy`; no hace falta integración continua para un piloto.

## 10. Pruebas

| Criterio | Dónde |
|---|---|
| CC1, CC2 reglas de acceso | tests/reglas.test.ts (emulador) |
| CC3 aviso obligatorio | tests/bienvenida.test.tsx |
| CC4 sin conexión | tests/repositorio-firestore.test.ts y revisión manual en el celular |
| CC5 importación | tests/importar.test.ts (emulador) |
| CC6 borrar cuenta | tests/borrar-cuenta.test.ts (emulador) |
| CC7, CC8 saldo a favor y programado | tests/banco.test.ts |
| CC9 pruebas de dominio | Las existentes, sin cambios |
| CC10 estilo | `npm run check:estilo` |
| CC11 dos cuentas | Revisión manual con dos celulares, tarea T31 |
| CC12 cambios al instante, sin releer todo | tests/repositorio-firestore.test.ts |
| CC13 login en iPhone | Revisión manual en el iPhone, tarea T26 |
| CC14 lectura y escritura de parámetros | tests/reglas.test.ts (emulador) |
| CC15 documento ausente o mal formado | tests/parametros.test.ts |
| CC16 vigencia de reglas | tests/reglas-vigencia.test.ts |
| CC17 nueva versión del aviso | tests/bienvenida.test.tsx |

## 11. Riesgos

- Reglas de seguridad mal escritas. Por eso se prueban primero y con dos usuarios distintos.
- Cuotas del plan gratuito. Se mantiene en Spark. Si hiciera falta pasar a un plan de pago, se pone una alerta de presupuesto antes.
- Perder el acceso a la cuenta de Google que administra el proyecto. Verificación en dos pasos y un segundo propietario de confianza, si se desea.
- Inicio de sesión en iPhone con la app instalada (ver sección 4).
- Responsabilidad: ocho personas usando los cálculos en una conversación con la clínica. La app dice en pantalla que es un registro personal, muestra su versión y el extracto lleva la fecha de generación.
- Soporte: cada duda llega a Alejandro. El canal del piloto y la lista de problemas son la forma de no perderse.
