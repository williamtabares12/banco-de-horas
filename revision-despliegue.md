# Revisión de despliegue (T31)

Revisado el 17 de octubre de 2026. La app se publica en https://arena-horas.web.app (sitio de Hosting `arena-horas` del proyecto `banco-horas-f6890`, plan gratuito Spark).

## 1. Cuotas vigentes del plan gratuito

Fuentes: firebase.google.com/pricing y firebase.google.com/docs/firestore/pricing, consultadas el 17 de octubre de 2026. Las cuotas son **por proyecto** y las diarias se reinician hacia la medianoche de la hora del Pacífico (las 2 de la madrugada en Colombia, aproximadamente).

| Servicio | Cuota gratuita | Qué cuenta |
|---|---|---|
| Firestore: lecturas | 50 000 por día | Cada documento que llega a un listener o a una consulta |
| Firestore: escrituras | 20 000 por día | Cada documento creado o editado |
| Firestore: borrados | 20 000 por día | Cada documento borrado |
| Firestore: almacenamiento | 1 GiB en total | Todo lo guardado |
| Firestore: salida de datos | 10 GiB por mes | Lo que se descarga |
| Hosting: almacenamiento | 10 GB en total | Los archivos de la app |
| Hosting: transferencia | 360 MB por día | Lo que descargan las personas al abrir la app |
| Authentication | Correo y Google sin cuota numérica propia | Solo el SMS cobra, y no se usa |

Cómo se cuentan las lecturas de los listeners (Firestore, documentación de precios):
- Cada documento que entra al resultado, o cambia, cuenta como una lectura.
- Con caché local persistente (la app la usa), si el listener estuvo desconectado **más de 30 minutos**, al volver se cobra como una consulta nueva: se vuelven a contar todos los documentos.
- Toda consulta cuesta al menos una lectura, aunque no devuelva nada.

## 2. Estimación para el piloto (8 personas)

Una apertura de la app después de más de 30 minutos lee: el perfil (1), la configuración (1), los parámetros de la clínica (1), y todos los turnos y movimientos de esa persona.

| Escenario | Documentos por persona | Aperturas por día | Lecturas por día | % de la cuota |
|---|---|---|---|---|
| Normal (un año de uso) | 500 | 3 | 8 × 3 × 503 ≈ 12 100 | 24 % |
| Intenso | 1 000 | 6 | 8 × 6 × 1 003 ≈ 48 100 | 96 % |
| 20 personas, uso normal | 500 | 3 | 20 × 3 × 503 ≈ 30 200 | 60 % |

- **Escrituras y borrados:** un turno genera como mucho 2 escrituras (el turno y su movimiento). Con 8 personas son unas decenas al día, frente a 20 000.
- **Almacenamiento:** un documento pesa del orden de 1 KB, así que 1 000 documentos por persona son 1 MB. Muy por debajo de 1 GiB.
- **Hosting:** la primera carga baja unos 300 KB comprimidos, y después la PWA queda en el teléfono. 360 MB por día alcanzan para más de mil primeras cargas.
- **Salida de datos de Firestore:** las lecturas del escenario normal son unos 12 MB por día, unos 360 MB por mes, frente a 10 GiB.

**Conclusión:** el piloto cabe con holgura. Lo único que podría acercarse al límite son las lecturas, y solo con historiales muy largos y muchas aperturas. Si algún día pasa, la mejora natural es leer solo los últimos meses en vez de todo el historial.

## 3. Qué pasa si se supera una cuota

En Spark **no se cobra nada**: Firebase simplemente rechaza las operaciones de ese día hasta que se reinicie la cuota. La app seguiría funcionando con lo que tiene en el teléfono y, al recuperarse la cuota, sincronizaría lo pendiente. No hay riesgo de factura.

Dónde vigilar el consumo: consola de Firebase, Firestore Database, pestaña **Uso**. Conviene mirarla al terminar la primera semana del piloto.

## 4. Antes de invitar a nadie

### 4.1 Hecho
- Sitio `arena-horas.web.app` creado y la app publicada en él.
- Reglas de seguridad publicadas y probadas (CC1, CC2, CC14).
- Dominio de acceso igual al de la página (`authDomain`) y service worker que deja pasar `/__/`.
- Caché de Hosting preparada para una PWA: `sw.js`, `index.html` y el manifiesto sin caché; los archivos con huella en el nombre, un año (`firebase.json`).

### 4.2 Pendiente en la consola (lo haces tú)

**a) Restringir la llave de la web a las direcciones de la app.** La llave que está en el código no es un secreto, pero conviene que solo funcione desde nuestras direcciones. En https://console.cloud.google.com/apis/credentials?project=banco-horas-f6890:
1. Abre la llave **"Browser key (auto created by Firebase)"** (o la que tenga el valor que empieza por `AIza...` de la app web).
2. En **Restricciones de la aplicación** elige **Sitios web (referentes HTTP)** y agrega:
   - `https://arena-horas.web.app/*`
   - `https://arena-horas.firebaseapp.com/*`
   - `https://banco-horas-f6890.web.app/*`
   - `https://banco-horas-f6890.firebaseapp.com/*`
3. Deja las **Restricciones de API** como están ("No restringir clave"): las APIs que usa Firebase para el acceso y los datos son varias y es fácil romper el ingreso.
4. Guarda, espera unos minutos y **prueba entrar con Google y con correo** en el teléfono. Si algo falla, quita la restricción y avísame.

Es una defensa extra. La protección real de los datos son las reglas de Firestore, que ya están probadas.

**b) Dominios autorizados de Authentication.** Debe aparecer `arena-horas.web.app` (y `arena-horas.firebaseapp.com`) en Authentication, Configuración, Dominios autorizados. Y en Google Cloud, en el cliente "Web client (auto created by Google Service)", su origen y su `/__/auth/handler` (ver plan-nube.md, sección 4).

**c) El sitio viejo, `banco-horas-f6890.web.app`.** Sigue publicado con una versión anterior. Opciones: dejarlo como está hasta el piloto; o reemplazarlo por una página que diga "Arena se mudó a arena-horas.web.app" para que nadie use una copia vieja. No hay prisa, pero que ninguno de tus compañeros reciba ese enlace.

### 4.3 Publicar (cada vez que haya cambios)
```
npm.cmd run build:nube
npx.cmd firebase deploy --only hosting
```
Después, en cada teléfono que ya tenga la app instalada: abrirla, esperar unos segundos y cerrarla y abrirla otra vez, para que tome la versión nueva.

## 5. Prueba de punta a punta con dos cuentas (CC11)

Necesitas dos dispositivos y dos cuentas de Google. Si no tienes un segundo celular, sirve un computador con Chrome. El teléfono A es tu iPhone con la cuenta A. El dispositivo B usa la cuenta B (otra cuenta de Google, o una de correo y contraseña).

**Preparación**
- [ ] En A y en B, abre `https://arena-horas.web.app` en Safari o Chrome (no desde WhatsApp) y entra.
- [ ] Completa la bienvenida en cada uno. En A pon un saldo inicial de **10 h**; en B, de **5 h**.

**Cada uno ve solo lo suyo**
- [ ] En A registra un turno el 20 de octubre, de 07:00 a 15:00, con la nota **Soy A**.
- [ ] En B registra un turno el mismo día, de 08:00 a 12:00, con la nota **Soy B**.
- [ ] En A mira Inicio, Turnos, Banco, Quincena y Extracto. Debe verse **10 h**, el turno de A, y **nada** de B (ni el saldo de 5 h, ni la nota "Soy B").
- [ ] En B lo mismo al revés: **5 h**, el turno de B y nada de A.
- [ ] Espera un minuto, recarga los dos y repite la revisión: sigue sin mezclarse.

**Los cambios de uno no tocan al otro**
- [ ] En A borra el turno. En B no debe cambiar nada.
- [ ] En B registra un pago de 1 h. En A el saldo sigue en 10 h.

**Los respaldos tampoco se mezclan**
- [ ] En A, Ajustes, Respaldo, descarga el JSON. Ábrelo y busca "Soy B": **no debe aparecer**.
- [ ] En B haz lo mismo y busca "Soy A": no debe aparecer.

**Cerrar sesión**
- [ ] En A cierra sesión y entra con la cuenta B en el mismo teléfono: debes ver los datos de B, no los de A.
- [ ] Vuelve a entrar con A: sus datos están intactos.

**Sin internet con la app instalada**
- [ ] En el iPhone, con la app instalada, pon modo avión y ábrela: carga con tus datos.
- [ ] Registra un turno sin señal; debe decir "Guardado solo en este dispositivo". Quita el modo avión: debe pasar a "Sincronizado" y el turno aparecer en el otro dispositivo.

**Criterio de T31:** A no ve nada de B, B no ve nada de A, y la app instalada funciona sin internet.

## 6. Lo que ya está probado por máquina

Las reglas de seguridad se prueban con dos personas y un visitante (`tests/reglas.test.ts`, CC1 y CC2), y borrar una cuenta no toca a otra (`tests/borrarCuenta.test.ts`). La prueba de arriba es la de punta a punta con teléfonos reales, que una máquina no reemplaza.
