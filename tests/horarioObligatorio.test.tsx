// T44 / RF16 / CA28 a CA32: el horario del turno es obligatorio. En pantalla la "plantilla" se llama "horario"; en el
// código el término sigue siendo plantilla. No cambia el cálculo ni los datos guardados.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormularioTurno } from "../src/ui/componentes/FormularioTurno";
import { Turnos } from "../src/ui/pantallas/Turnos";
import { copiarPlantillas, CONFIG_POR_DEFECTO } from "../src/dominio/config";
import { calculoDe } from "../src/dominio/parametros";
import { OTRO_HORARIO, plantillaElegida, validarHorarioDeTurno, valoresDePlantilla } from "../src/dominio/plantillas";
import { necesitaRevisarDescanso } from "../src/dominio/turnos";
import type { EntradaTurno } from "../src/dominio/turnos";
import type { Datos } from "../src/almacenamiento/repositorio";
import type { Turno } from "../src/dominio/tipos";

const html = renderToStaticMarkup;
const noop = () => {};
const H = 60;
const plantillas = copiarPlantillas();
const dia12 = plantillas.find((p) => p.nombre === "Día 12 h")!;

/** Un turno ya guardado, listo para la lista del historial. */
function turno(parcial: Partial<Turno> = {}): Turno {
  return {
    id: `t-${Math.random()}`,
    inicio: "2026-10-20T07:00",
    fin: "2026-10-20T16:00",
    descansoMin: 0,
    minutosProgramados: 9 * H,
    tipo: "ordinario",
    creadoEn: "2026-10-20T17:00:00",
    modificadoEn: "2026-10-20T17:00:00",
    ...parcial,
  };
}

describe("CA28: sin elegir un horario no se puede guardar", () => {
  it("el mensaje dice 'Elige un horario'", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: "", descanso: "", programadas: "" });
    expect(r).toEqual({ ok: false, campo: "horario", mensaje: "Elige un horario" });
  });
  it("aunque el descanso y las horas programadas estén escritos, sin horario no pasa", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: "", descanso: "60", programadas: "8" });
    expect(r).toMatchObject({ ok: false, campo: "horario", mensaje: "Elige un horario" });
  });
  it("lo primero que se ve en el formulario de un turno nuevo es '¿Qué horario hiciste?', antes del tipo de turno", () => {
    const m = html(<FormularioTurno plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).toContain("¿Qué horario hiciste?");
    expect(m.indexOf("¿Qué horario hiciste?")).toBeLessThan(m.indexOf("Tipo de turno"));
  });
  it("el horario son botones grandes y visibles, no una lista desplegable: uno por plantilla y 'Otro horario'", () => {
    const m = html(<FormularioTurno plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).toMatch(/role="radiogroup"/);
    for (const nombre of ["Día 8 h", "Día 12 h", "Noche 12 h", "Otro horario"]) {
      expect(m, nombre).toMatch(new RegExp(`<button[^>]*role="radio"[^>]*>${nombre}</button>`));
    }
    expect(m).not.toContain("Plantilla (opcional)");
    expect(m).not.toContain("Sin plantilla");
    expect(m.match(/<select/g)).toHaveLength(1); // solo queda el tipo de turno
  });
  it("las plantillas que crea la persona también salen como botones", () => {
    const propia = { id: "p1", nombre: "Guardia corta", inicio: "08:00", fin: "14:00", descansoMin: 0 };
    const m = html(<FormularioTurno plantillas={[...plantillas, propia]} onContinuar={noop} onCancelar={noop} />);
    expect(m).toMatch(/<button[^>]*role="radio"[^>]*>Guardia corta<\/button>/);
  });
  it("sin plantillas creadas, queda al menos 'Otro horario'", () => {
    const m = html(<FormularioTurno plantillas={[]} onContinuar={noop} onCancelar={noop} />);
    expect(m).toMatch(/<button[^>]*role="radio"[^>]*>Otro horario<\/button>/);
  });
  it("antes de elegir no hay valores por defecto ni campos de horas: ni descanso en 0 ni horas programadas", () => {
    const m = html(<FormularioTurno plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).not.toContain('type="time"');
    expect(m).not.toContain("Descanso (minutos)");
    expect(m).not.toContain("Horas programadas");
    expect(m).toContain("Revisar"); // el botón sigue ahí: al tocarlo sin elegir, avisa
    expect(m).not.toMatch(/aria-checked="true"/);
  });
});

describe("CA29: elegir un horario rellena todo y esconde los campos detrás de 'Cambiar horas'", () => {
  it("'Día 12 h' deja inicio 07:00, fin 19:00, descanso 120 y 10 h programadas", () => {
    expect(valoresDePlantilla(dia12)).toEqual({ horaInicio: "07:00", horaFin: "19:00", descansoMin: 120, minutosProgramados: 10 * H });
  });
  const entradaDia12: EntradaTurno = { inicio: "2026-10-20T07:00", fin: "2026-10-20T19:00", descansoMin: 120, minutosProgramados: 10 * H, tipo: "ordinario" };

  it("un turno con esos valores se reconoce como 'Día 12 h'; con otros valores, como 'Otro horario'", () => {
    expect(plantillaElegida(entradaDia12, plantillas)).toBe(dia12.id);
    expect(plantillaElegida({ ...entradaDia12, descansoMin: 60, minutosProgramados: 11 * H }, plantillas)).toBe(OTRO_HORARIO);
    expect(plantillaElegida({ ...entradaDia12, fin: "2026-10-20T18:00" }, plantillas)).toBe(OTRO_HORARIO);
  });
  it("con el horario elegido, el botón queda marcado, los campos no se ven y aparece 'Cambiar horas'", () => {
    const m = html(<FormularioTurno inicial={entradaDia12} plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).toMatch(/<button[^>]*aria-checked="true"[^>]*>Día 12 h<\/button>/);
    expect(m).toMatch(/<button[^>]*>Cambiar horas<\/button>/);
    expect(m).not.toContain('type="time"');
    expect(m).not.toContain("Descanso (minutos)");
    expect(m).not.toContain("Horas programadas");
  });
  it("en vez de los campos, un resumen dice lo que quedó rellenado", () => {
    const m = html(<FormularioTurno inicial={entradaDia12} plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    const texto = m.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    expect(texto).toContain("07:00 a 19:00");
    expect(texto).toContain("descanso 2 h");
    expect(texto).toContain("10 h programadas");
  });
  it("con 'Otro horario' los campos se ven y no hay 'Cambiar horas'", () => {
    const otro: EntradaTurno = { inicio: "2026-10-20T08:30", fin: "2026-10-20T16:30", descansoMin: 30, minutosProgramados: 7 * H + 30, tipo: "ordinario" };
    const m = html(<FormularioTurno inicial={otro} plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).toMatch(/<button[^>]*aria-checked="true"[^>]*>Otro horario<\/button>/);
    expect(m).toContain('type="time"');
    expect(m).toContain("Descanso (minutos)");
    expect(m).toContain("Horas programadas");
    expect(m).not.toContain("Cambiar horas");
  });
  it("una plantilla elegida que se edita a mano sigue valiendo: los valores rellenados pasan la validación", () => {
    const v = valoresDePlantilla(dia12);
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: dia12.id, descanso: String(v.descansoMin), programadas: "10" });
    expect(r).toEqual({ ok: true, descansoMin: 120, minutosProgramados: 10 * H });
  });
});

describe("CA30: con 'Otro horario' el descanso y las horas programadas son obligatorios", () => {
  it("el descanso vacío no se toma como 0: 'Escribe 0 si no tuviste descanso'", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: OTRO_HORARIO, descanso: "", programadas: "8" });
    expect(r).toEqual({ ok: false, campo: "descanso", mensaje: "Escribe 0 si no tuviste descanso" });
  });
  it("un descanso de solo espacios cuenta como vacío", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: OTRO_HORARIO, descanso: "   ", programadas: "8" });
    expect(r).toMatchObject({ ok: false, campo: "descanso", mensaje: "Escribe 0 si no tuviste descanso" });
  });
  it("las horas programadas vacías tampoco se guardan", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: OTRO_HORARIO, descanso: "0", programadas: "" });
    expect(r).toMatchObject({ ok: false, campo: "programadas" });
    if (!r.ok) expect(r.mensaje).toMatch(/^Horas programadas: /);
  });
  it("unas horas ambiguas como 7.30 se rechazan igual que en T41, con el campo que falla", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: OTRO_HORARIO, descanso: "0", programadas: "7.30" });
    expect(r).toMatchObject({ ok: false, campo: "programadas" });
    if (!r.ok) expect(r.mensaje).toContain("¿Quisiste decir 7:30?");
  });
  it("con el descanso escrito, aunque sea 0, y las horas programadas, se guarda", () => {
    expect(validarHorarioDeTurno({ tipo: "ordinario", horario: OTRO_HORARIO, descanso: "0", programadas: "8" })).toEqual({
      ok: true,
      descansoMin: 0,
      minutosProgramados: 8 * H,
    });
    expect(validarHorarioDeTurno({ tipo: "ordinario", horario: OTRO_HORARIO, descanso: "45", programadas: "7:30" })).toEqual({
      ok: true,
      descansoMin: 45,
      minutosProgramados: 7 * H + 30,
    });
  });
  it("también con una plantilla elegida: si se borra el descanso en 'Cambiar horas', pide el 0", () => {
    const r = validarHorarioDeTurno({ tipo: "ordinario", horario: dia12.id, descanso: "", programadas: "10" });
    expect(r).toMatchObject({ ok: false, campo: "descanso", mensaje: "Escribe 0 si no tuviste descanso" });
  });
  it("el formulario nuevo no trae el descanso en 0 escrito de antemano", () => {
    const m = html(<FormularioTurno plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).not.toMatch(/value="0"/);
  });
});

describe("CA31: un turno de alquiler no pide horario y se guarda con descanso 0", () => {
  it("la validación no exige horario ni mira el descanso ni las horas programadas", () => {
    expect(validarHorarioDeTurno({ tipo: "alquiler", horario: "", descanso: "", programadas: "" })).toEqual({
      ok: true,
      descansoMin: 0,
      minutosProgramados: 0,
    });
  });
  it("aunque haya quedado algo escrito de antes, el alquiler va con descanso 0", () => {
    expect(validarHorarioDeTurno({ tipo: "alquiler", horario: OTRO_HORARIO, descanso: "90", programadas: "8" })).toEqual({
      ok: true,
      descansoMin: 0,
      minutosProgramados: 0,
    });
  });
  it("el formulario de alquiler no muestra '¿Qué horario hiciste?', ni descanso, ni horas programadas, y pide destino", () => {
    const alquiler: EntradaTurno = { inicio: "2026-10-20T08:00", fin: "2026-10-20T16:00", descansoMin: 0, minutosProgramados: 0, tipo: "alquiler", destino: "deuda" };
    const m = html(<FormularioTurno inicial={alquiler} plantillas={plantillas} onContinuar={noop} onCancelar={noop} />);
    expect(m).not.toContain("¿Qué horario hiciste?");
    expect(m).not.toContain("Descanso (minutos)");
    expect(m).not.toContain("Horas programadas");
    expect(m).toContain("Destino de estas horas");
    expect(m).toContain('type="time"'); // pide inicio y fin
  });
});

describe("CA32: 'Revisa el descanso' en el historial", () => {
  it("un turno ordinario con descanso 0 y 9 h netas lo lleva", () => {
    expect(necesitaRevisarDescanso(turno({ inicio: "2026-10-20T07:00", fin: "2026-10-20T16:00", descansoMin: 0 }))).toBe(true);
  });
  it("con descanso 60 no", () => {
    expect(necesitaRevisarDescanso(turno({ inicio: "2026-10-20T07:00", fin: "2026-10-20T16:00", descansoMin: 60 }))).toBe(false);
  });
  it("hace falta que sean MÁS de 6 horas netas: 6 h justas no, 6 h y 1 min sí", () => {
    expect(necesitaRevisarDescanso(turno({ inicio: "2026-10-20T07:00", fin: "2026-10-20T13:00", descansoMin: 0 }))).toBe(false);
    expect(necesitaRevisarDescanso(turno({ inicio: "2026-10-20T07:00", fin: "2026-10-20T13:01", descansoMin: 0 }))).toBe(true);
  });
  it("las horas netas son las de reloj menos el descanso: 7 h de reloj con 90 min de descanso son 5 h 30 min", () => {
    expect(necesitaRevisarDescanso(turno({ inicio: "2026-10-20T07:00", fin: "2026-10-20T14:00", descansoMin: 90 }))).toBe(false);
  });
  it("el turno de alquiler no lo lleva, aunque tenga descanso 0", () => {
    expect(necesitaRevisarDescanso(turno({ tipo: "alquiler", destino: "deuda", minutosProgramados: 0 }))).toBe(false);
  });
  it("un turno de noche que cruza la medianoche también cuenta bien", () => {
    expect(necesitaRevisarDescanso(turno({ inicio: "2026-10-20T19:00", fin: "2026-10-21T07:00", descansoMin: 0 }))).toBe(true);
  });

  const datos = (turnos: Turno[]): Datos => ({ schemaVersion: 3, config: CONFIG_POR_DEFECTO, turnos, movimientos: [] });
  const lista = (turnos: Turno[]) => html(<Turnos datos={datos(turnos)} calculo={calculoDe(CONFIG_POR_DEFECTO)} cambiar={noop} />);

  it("en la lista, solo el turno con descanso 0 y 9 h netas muestra la etiqueta, y es un botón que lleva a editarlo", () => {
    const m = lista([
      turno({ id: "sin-descanso", inicio: "2026-10-20T07:00", fin: "2026-10-20T16:00", descansoMin: 0 }),
      turno({ id: "con-descanso", inicio: "2026-10-19T07:00", fin: "2026-10-19T16:00", descansoMin: 60, minutosProgramados: 8 * H }),
    ]);
    expect(m.match(/Revisa el descanso/g)).toHaveLength(1);
    expect(m).toMatch(/<button[^>]*>Revisa el descanso<\/button>/);
  });
  it("sin turnos que revisar, la etiqueta no aparece en ninguna parte", () => {
    const m = lista([turno({ inicio: "2026-10-20T07:00", fin: "2026-10-20T16:00", descansoMin: 60, minutosProgramados: 8 * H })]);
    expect(m).not.toContain("Revisa el descanso");
  });
});

describe("T44 no toca el cálculo ni los datos guardados", () => {
  it("la etiqueta de la lista no cambia lo que se guarda: el turno sigue igual", () => {
    const t = turno();
    const copia = JSON.stringify(t);
    necesitaRevisarDescanso(t);
    expect(JSON.stringify(t)).toBe(copia);
  });
});
