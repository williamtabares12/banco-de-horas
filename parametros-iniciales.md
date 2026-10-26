# Parámetros globales: valores iniciales

Documento de Firestore: colección `configuracion`, documento `parametros`. Lo leen todas las personas con sesión y nadie lo escribe desde la app. Alejandro lo crea y lo edita desde la consola de Firebase. Ver plan-nube.md, sección 6b.

## Contenido inicial

```json
{
  "version": 1,
  "avisoVersion": 1,
  "reglas": {
    "2026-01-01": {
      "nocturnoDesde": "19:00",
      "nocturnoHasta": "06:00",
      "minutosSemana": 2520,
      "inicioSemana": 0,
      "desfaseQuincenas": 1,
      "extrasDescuentanDeuda": true
    }
  },
  "festivosAgregados": [],
  "festivosQuitados": [],
  "plantillasPorDefecto": {
    "dia8": { "nombre": "Día 8 h", "inicio": "07:00", "fin": "16:00", "descansoMin": 60 },
    "dia12": { "nombre": "Día 12 h", "inicio": "07:00", "fin": "19:00", "descansoMin": 120 },
    "noche12": { "nombre": "Noche 12 h", "inicio": "19:00", "fin": "07:00", "descansoMin": 120 }
  }
}
```

## Qué significa cada campo

- `version`: número entero. Súbelo en uno cada vez que edites el documento.
- `avisoVersion`: versión vigente del aviso de privacidad. Si la subes, la app pide aceptar el aviso de nuevo.
- `reglas`: un mapa cuya clave es la fecha desde la que rige la regla (año-mes-día). `minutosSemana` son minutos: 2520 = 42 horas. `desfaseQuincenas` es 1: lo trabajado en una quincena se cobra en la colilla de la siguiente.
- `festivosAgregados` y `festivosQuitados`: listas de fechas ("2026-12-31") que se suman o se restan a los festivos que la app calcula sola.
- `plantillasPorDefecto`: las plantillas que se copian a una persona nueva en su primer ingreso. Los horarios de las de 12 horas son un ejemplo: ajústalos antes del piloto.

## Cómo cambiar una regla

No edites una regla vieja. Agrega una nueva con su fecha de inicio, para que los turnos anteriores sigan calculándose con la regla con la que se trabajaron. Ejemplo, si la hora nocturna pasara a las 21:00 desde el 1 de enero de 2027, `reglas` tendría dos claves:

```json
"reglas": {
  "2026-01-01": { "nocturnoDesde": "19:00", "nocturnoHasta": "06:00", "minutosSemana": 2520, "inicioSemana": 0, "desfaseQuincenas": 1, "extrasDescuentanDeuda": true },
  "2027-01-01": { "nocturnoDesde": "21:00", "nocturnoHasta": "06:00", "minutosSemana": 2520, "inicioSemana": 0, "desfaseQuincenas": 1, "extrasDescuentanDeuda": true }
}
```

Solo se corrige una regla vieja si tiene un error de tipeo.

## Cómo crearlo en la consola de Firebase

1. Firebase Console, tu proyecto, Firestore Database, pestaña Datos.
2. Iniciar colección: `configuracion`. ID del documento: `parametros`.
3. Campos de primer nivel: `version` (number), `avisoVersion` (number), `reglas` (map), `festivosAgregados` (array vacío), `festivosQuitados` (array vacío), `plantillasPorDefecto` (map).
4. Dentro de `reglas`: un campo `2026-01-01` de tipo map, con `nocturnoDesde` (string), `nocturnoHasta` (string), `minutosSemana` (number), `inicioSemana` (number, 0 = domingo), `desfaseQuincenas` (number) y `extrasDescuentanDeuda` (boolean).
5. Dentro de `plantillasPorDefecto`: tres campos de tipo map (`dia8`, `dia12`, `noche12`), cada uno con `nombre`, `inicio`, `fin` (string) y `descansoMin` (number).

Los tipos importan: un `minutosSemana` guardado como texto hace que la app lo rechace con un aviso y use sus reglas incluidas.

## Antes de que otros abran la app

Después de cada edición, abre la app con tu cuenta y confirma que no muestra el aviso de parámetros inválidos y que Ajustes muestra las reglas que esperas. Los cambios llegan a todos de inmediato.
