# Spec: versión para compañeros (con cuenta y nube)

Estado: borrador v0.1. Extiende spec-banco-de-horas.md (v0.9). Todo lo de allá sigue valiendo: cálculo de horas, banco, descansos, plantillas y estilo visual. Aquí solo va lo nuevo. Plan técnico en plan-nube.md, aviso de privacidad en aviso-privacidad.md, tareas en tasks.md (Fase 6).

## 1. Objetivo

Que otros auxiliares del servicio usen la app con su propia cuenta y sus datos privados. Primero como piloto con unas 8 personas, igual que se hizo con Bitácora AIDA, y después, si funciona, con más.

## 2. Principios

- Registro personal. La app no es una herramienta oficial de la clínica ni reemplaza sus registros.
- Privacidad por defecto. Cada persona ve solo sus datos. No hay vista de administrador.
- Sin datos de pacientes ni de nómina. Solo horas, fechas y notas.
- Gratis para quien la usa, y que cueste cero mantenerla mientras el piloto sea pequeño.
- El cálculo es el mismo para todos y es el que ya está probado en la versión personal.

## 3. Fuera de alcance

- Vista de la jefe, de coordinación o de cualquier otra persona sobre los datos de alguien.
- Dinero de cualquier tipo.
- Conexión con los Excel o las hojas de la jefe.
- Tiendas de aplicaciones, notificaciones push, chat.
- Varias clínicas o servicios con reglas distintas, más allá de lo que se arregla con plantillas y horas semanales.

## 4. Usuarios

Auxiliares de enfermería del servicio, con celular (iPhone o Android) y, en su mayoría, cuenta de Google. Poca paciencia para configurar: el primer ingreso debe tomar menos de 3 minutos.

## 5. Requisitos funcionales

RF-C1. Registro e inicio de sesión como en Bitácora AIDA v2: con correo y contraseña o con Google, y recuperación de contraseña por correo. Se puede cerrar sesión. La sesión decide qué pantalla se ve.

RF-C2. Primer ingreso. Una pantalla de bienvenida en pasos:

1. Aviso de privacidad y casilla de autorización. Sin aceptar no se continúa. Se guarda la fecha y la versión del aviso aceptado.
2. Saldo inicial: fecha y horas que debe a la clínica (puede ser 0).
3. Horas semanales (por defecto las de los parámetros globales, hoy 42). La hora de inicio de la jornada nocturna ya no se pregunta: viene de los parámetros globales.
4. Plantillas de turno: las tres de ejemplo, editables.
5. Si viene de la versión personal, opción de importar su respaldo JSON.

RF-C3. Cada persona ve y modifica solo sus propios datos. Ninguna pantalla muestra datos de otra persona.

RF-C4. Funciona sin señal. Se puede registrar turnos y movimientos sin internet, y se sincronizan cuando vuelve la conexión. Un indicador pequeño dice si lo último está guardado solo en el dispositivo o ya sincronizado.

RF-C5. Mismos datos en varios dispositivos (celular y computador). Lo que se cambia en uno aparece en los demás sin recargar. Guardar en un dispositivo nunca deshace lo que otro cambió en registros que este no tocó. Si dos cambios chocan sobre el mismo registro, gana el más reciente.

RF-C6. Saldo a favor. Cuando el saldo queda por debajo de cero, se muestra "La clínica te debe X h" en lugar de un aviso de error. Reemplaza el comportamiento de CA4 del spec base.

RF-C7. Fechas futuras. Los préstamos y pagos pueden tener fecha futura (a veces se acuerda para días que aún no llegan). Mientras la fecha no llegue, se muestran con la etiqueta "Programado", no cambian el saldo actual y sí el saldo proyectado.

RF-C8. Exportar mis datos. En cualquier momento, en JSON y en extracto PDF.

RF-C9. Borrar mi cuenta. Elimina la cuenta y todos sus datos de forma definitiva, con una confirmación clara y volviendo a iniciar sesión por seguridad.

RF-C10. En todo campo de nota, un recordatorio: "No escribas nombres ni documentos de pacientes".

RF-C11. Pantalla "Acerca de": versión de la app, aviso de privacidad, correo de contacto, el texto "Registro personal. No es una herramienta oficial de la clínica ni reemplaza sus registros" y un botón para reportar un problema.

RF-C12. La app no usa el nombre ni el logo de la clínica.

RF-C13. Instalable en la pantalla de inicio y utilizable sin internet una vez instalada (PWA).

RF-C14. El cálculo de horas, banco, descansos y semana es idéntico al de la versión personal. Las pruebas de dominio existentes pasan sin modificarse.

RF-C15. Parámetros globales. Las reglas que no son de una persona sino de la clínica o de la norma (hora de inicio y fin de la jornada nocturna, desfase de pago de recargos, si las extras descuentan deuda, horas semanales por defecto, festivos extra y plantillas por defecto) se leen de un documento que todas las personas con sesión pueden leer y que nadie puede escribir desde la app. Alejandro lo edita desde la consola de Firebase. Los valores iniciales están en parametros-iniciales.md. En Ajustes, esas reglas se muestran en solo lectura.

RF-C16. Si el documento de parámetros no se puede leer o está mal formado, la app avisa con un mensaje claro y usa la última copia guardada en el dispositivo o, si no hay, las reglas incluidas en la app. Nunca calcula con valores a medias.

RF-C17. Las reglas llevan fecha de inicio de vigencia. Agregar una regla nueva no cambia el cálculo de fechas anteriores a su vigencia.

RF-C18. El documento de parámetros trae la versión vigente del aviso de privacidad. Si sube, la app pide aceptar el aviso de nuevo antes de continuar.

RF-C19. Instalación guiada. En Android, un botón "Instalar app" cuando el navegador lo permite. En iPhone, una guía corta de tres pasos (Compartir, Añadir a pantalla de inicio, Añadir). Se oculta si la app ya está instalada.

RF-C20. Navegadores dentro de otras apps. Si la app se abre en un navegador embebido que no permite iniciar sesión con Google, avisa "Ábrela en Chrome o Safari" y deja copiar el enlace.

RF-C21. Botón atrás. En Android, y con el gesto de atrás en iPhone, primero se cierra una hoja o diálogo abierto, luego se vuelve a la pantalla anterior, y desde Inicio se sale de la app.

RF-C22. Hora en 24 horas. Antes de guardar un turno se muestran la hora de inicio y la de fin en formato de 24 horas, sin importar cómo las muestre el selector de hora del teléfono (a. m. y p. m. o 24 horas).

RF-C23. Marca y login. La pantalla de inicio de sesión muestra el reloj de arena animado (arena-animado.html), el nombre "Arena" y la frase "Tus horas, claras y tuyas". Selector Entrar | Crear cuenta arriba de los botones. Los botones actuales no cambian ni de forma ni de orden. Todo cabe sin desplazarse en una pantalla de 360 x 640. El pie dice "Solo tú ves tus datos desde la app. Registro personal, no es una herramienta oficial de la clínica" y enlaza al aviso de privacidad.

RF-C24. Pantalla de carga. Mientras la app resuelve la sesión y trae los datos por primera vez se muestra el reloj de arena animado con la palabra "Arena" debajo, no un letrero de "Cargando". Si hay copia local de los datos, la app abre directo sin esta pantalla. La pantalla aparece solo si la espera pasa de 300 ms, para que no parpadee. Si la espera pasa de 6 segundos, se añade debajo "Está tardando más de lo normal. Revisa tu conexión." y el botón de contorno "Seguir sin conexión" cuando haya copia local. Un lector de pantalla anuncia "Abriendo Arena".

## 6. Datos y privacidad

Qué se guarda: correo y nombre de la cuenta (de Google o del registro con correo), turnos, movimientos, configuración, y fecha y versión del aviso aceptado.

Qué no se guarda: contraseñas propias (si alguien se registra con correo, las maneja Firebase Authentication y la app no las ve), documentos de identidad, salario, datos de pacientes.

Quién los ve: solo su titular, desde la app. Alejandro, como dueño técnico del proyecto, tiene acceso a la base desde la consola de Firebase. Se compromete, en el aviso, a no consultar datos individuales salvo que el titular lo pida o para corregir un error, y en ese caso solo lo necesario.

Dónde viven: en servidores de Google (Firebase), que pueden estar fuera de Colombia. El aviso lo dice.

Parámetros globales: un documento con las reglas vigentes. No contiene datos personales. Lo leen todas las personas con sesión y solo Alejandro lo edita, desde la consola de Firebase.

Marco legal: en Colombia el tratamiento de datos personales se rige por la Ley 1581 de 2012 y sus decretos. Pide autorización previa, expresa e informada, y reconoce derechos de consulta, rectificación, supresión y revocación. El borrador del aviso está en aviso-privacidad.md. Hay que revisarlo con alguien que sepa de esto antes del piloto, y confirmar si existe alguna obligación adicional.

## 7. Requisitos no funcionales

- Costo cero: plan gratuito de Firebase. Sin inicio de sesión por SMS, que sí cobra. Revisar las cuotas vigentes antes del piloto.
- Seguridad: reglas de acceso probadas con pruebas automáticas, tráfico cifrado (HTTPS), verificación en dos pasos en la cuenta de Google de Alejandro que administra el proyecto.
- Abre en menos de 3 segundos en un celular con los datos ya cargados.
- Estilo visual: el de estilo-visual.md.

## 8. Piloto

- De 5 a 8 compañeros, dos semanas, invitados por enlace. Al menos 2 con iPhone y 2 con Android, y al menos una persona con un Android de gama baja.
- Un canal para recibir comentarios (por ejemplo, un grupo de WhatsApp) y una lista donde Alejandro anota cada problema.
- Criterios para dar el piloto por bueno:
  1. Al menos 5 personas registran movimientos durante las dos semanas.
  2. Ningún reporte de cálculo erróneo sin resolver.
  3. Ninguna pérdida de datos.
  4. Cada participante puede explicar su saldo con su extracto.

## 9. Criterios de aceptación

CC1. Una persona sin sesión no puede leer ni escribir datos (probado con las reglas).

CC2. La persona A no puede leer ni escribir los datos de la persona B (probado con las reglas).

CC3. En el primer ingreso no se puede continuar sin aceptar el aviso.

CC4. Sin conexión, registrar un turno funciona, y al volver la señal queda sincronizado.

CC5. Importar el JSON de la versión personal deja el mismo saldo que tenía.

CC6. Borrar la cuenta elimina todos los datos de la persona (verificado en el emulador).

CC7. Un saldo por debajo de cero muestra "La clínica te debe X h".

CC8. Un movimiento con fecha futura aparece como "Programado", no cambia el saldo actual y sí el saldo proyectado.

CC9. Las pruebas de dominio existentes pasan sin cambios.

CC10. `npm run check:estilo` pasa.

CC11. Dos cuentas distintas en dos celulares, con datos propios, no ven nada de la otra (prueba de punta a punta antes del piloto).

CC12. Crear, editar o borrar un registro se ve al instante en pantalla y no vuelve a leer todo el historial.

CC13. El registro con correo y contraseña, el inicio de sesión, la recuperación por correo y el inicio con Google funcionan en un iPhone (Safari y app instalada) y en un Android (Chrome con la app instalada, y Samsung Internet).

CC14. Cualquier persona con sesión puede leer el documento de parámetros. Quien no tiene sesión no puede. Nadie puede escribirlo desde la app (probado con las reglas).

CC15. Con el documento ausente o mal formado, la app avisa y calcula con la última copia guardada o con las reglas incluidas.

CC16. Agregar una regla con fecha futura no cambia el cálculo de turnos anteriores a esa fecha.

CC17. Subir `avisoVersion` hace que la app pida aceptar el aviso de nuevo antes de continuar.

CC18. La app se instala, abre sin internet y permite iniciar sesión (correo y Google) en un iPhone y en un Android.

CC19. El botón atrás de Android cierra primero una hoja o diálogo abierto y después vuelve a la pantalla anterior. Desde Inicio, sale de la app.

CC20. Un turno de 07:00 a 19:00 se confirma con el texto "07:00" y "19:00", aunque el selector del teléfono muestre p. m.

CC21. El login muestra el reloj de arena animado y todos sus elementos, sin desplazamiento, en una pantalla de 360 x 640. Los botones existentes quedan en el mismo orden.

CC22. Con la sesión resolviéndose en menos de 300 ms no aparece pantalla de carga. Con una espera simulada de 8 s aparece el reloj de arena, luego el mensaje de demora, y la app nunca queda en blanco.

CC23. Con "reducir movimiento" activado en el teléfono, el reloj de arena queda quieto en login y en carga, y las dos pantallas siguen siendo comprensibles.

CC24. Con la app abierta en dos pestañas o dispositivos, un movimiento editado en A aparece en B sin recargar, y guardar otra cosa en B no deshace lo que se hizo en A. Prueba automática con un repositorio de prueba y prueba manual en el emulador (hallazgo 1 de informe-qa-2026-10-27.md).

## 10. Preguntas abiertas

1. El inicio de sesión se reutiliza de Bitácora AIDA v2 (correo y contraseña, o Google, con recuperación por correo), así que no hace falta que todos tengan Google. Hay que portarlo a React y TypeScript.
2. ¿La jefe o coordinación debería ver algo? Por ahora nada. Si algún día se pide, sería decisión de cada persona, compartiendo su extracto en PDF.
3. Los movimientos con fecha futura, ¿deben contar en el saldo actual? Por ahora no.
4. El nombre de la app es Arena (confirmado el 16 de octubre de 2026). Antes de publicar, revisar que no choque con otra app en Play Store y App Store y que `arena.web.app` (o la variante que haya libre) esté disponible en Firebase Hosting. Falta el correo de contacto para el aviso.
5. El proyecto de Firebase va en la cuenta personal de Alejandro, no en la de la clínica, y es un proyecto nuevo, separado de Bitácora AIDA.
6. ¿Las reglas (descansos, nocturna desde las 19:00, 42 horas) son iguales para todos? Se verifica en el piloto. Hoy hay un solo grupo de reglas globales. Si algún grupo necesita reglas distintas, se agregan grupos al documento de parámetros. Lo que cambie por persona se arregla con plantillas y horas semanales propias.
