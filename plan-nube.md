# Plan técnico: versión con cuenta y nube

Deriva de spec-companeros.md (v0.1). Extiende plan.md: la estructura, el dominio, los algoritmos y el estilo no cambian. Aquí solo va lo nuevo.

## 1. Decisiones

- Firebase, el mismo conjunto que usa Bitácora AIDA v2: Authentication (solo Google), Cloud Firestore y Hosting.
- Proyecto de Firebase nuevo, en la cuenta personal de Alejandro, en el plan gratuito (Spark). Separado de Bitácora AIDA para aislar datos y cuotas.
- SDK modular de Firebase para web.
- La interfaz `Repositorio` ya existe. Se agrega `RepositorioFirestore` que la implementa. `RepositorioLocal` queda para las pruebas y para leer respaldos viejos. La UI y el dominio no se enteran del cambio.
- Caché local persistente de Firestore, para que la app funcione sin señal.
- El saldo y los totales no se guardan: se calculan en el cliente a partir de los movimientos. Así no hay números que puedan quedar desfasados.
- Las pruebas de reglas y del repositorio corren contra el emulador de Firebase (Auth y Firestore), sin tocar datos reales.

## 2. Estructura de datos en Firestore

```
usuarios/{uid}                     perfil: correo, creadoEn, avisoVersion, avisoAceptadoEn, schemaVersion
usuarios/{uid}/config/principal    Config (horas semanales, nocturno, plantillas, festivos, etc.)
usuarios/{uid}/turnos/{id}         Turno
usuarios/{uid}/movimientos/{id}    MovimientoBanco
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
  }
}
```

Cualquier otra ruta queda denegada por defecto. Después se agregan validaciones de tipo (por ejemplo, que `minutos` sea un número y que los textos no pasen de un tamaño razonable).

La `apiKey` de Firebase para web no es un secreto: la seguridad la dan las reglas. Aun así se restringe la llave a los dominios de la app y se autorizan en Authentication solo esos dominios. No se guarda ninguna llave de cuenta de servicio en el repositorio.

## 4. Inicio de sesión

Google, con la ventana emergente del SDK en escritorio. En iPhone puede dar problemas con las ventanas emergentes y con los bloqueos de cookies de terceros de Safari, sobre todo en la app instalada. Se prueba en Safari y en la app instalada (T26). Si falla, se cambia a redirección con `authDomain` igual al dominio de Hosting.

## 5. Primer ingreso e importación

Al iniciar sesión por primera vez no existe `usuarios/{uid}`. La app detecta eso y muestra la bienvenida. Al terminarla escribe, en un solo lote: el perfil con la versión del aviso aceptado, la configuración, el saldo inicial como un movimiento y las plantillas. Si la persona elige importar un respaldo JSON, se valida con el mismo validador de la versión local y se escribe en lotes de máximo 500 operaciones, que es el límite de Firestore. Un JSON inválido no escribe nada.

## 6. Dominio: saldo con fechas futuras

Función nueva, sin tocar las existentes:

- `saldoActual(movimientos, hoy)`: suma los movimientos con fecha hasta hoy.
- `saldoProyectado(movimientos)`: suma todos.
- Un movimiento es "Programado" si su fecha es posterior a hoy.
- Un saldo menor que cero se informa como "a favor": la clínica le debe a la persona.

Las pruebas existentes de `banco.ts` no se modifican.

## 7. Sincronización y conflictos

Comportamiento por defecto de Firestore: la última escritura gana, documento por documento. Es suficiente porque cada persona edita sus propios datos y casi siempre desde un solo dispositivo. Cuando un movimiento se genera de un turno, se escribe en el mismo lote que el turno, para que no queden uno sin el otro.

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

## 11. Riesgos

- Reglas de seguridad mal escritas. Por eso se prueban primero y con dos usuarios distintos.
- Cuotas del plan gratuito. Se mantiene en Spark. Si hiciera falta pasar a un plan de pago, se pone una alerta de presupuesto antes.
- Perder el acceso a la cuenta de Google que administra el proyecto. Verificación en dos pasos y un segundo propietario de confianza, si se desea.
- Inicio de sesión en iPhone con la app instalada (ver sección 4).
- Responsabilidad: ocho personas usando los cálculos en una conversación con la clínica. La app dice en pantalla que es un registro personal, muestra su versión y el extracto lleva la fecha de generación.
- Soporte: cada duda llega a Alejandro. El canal del piloto y la lista de problemas son la forma de no perderse.
