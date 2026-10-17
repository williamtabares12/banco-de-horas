import { useState } from "react";
import type { AvisoPrivacidad } from "../../dominio/aviso";
import { PASOS, errorDelPaso, puedeContinuar, respuestasPorDefecto, type Respuestas } from "../../dominio/bienvenida";
import { parsearDuracion } from "../../dominio/tiempo";
import { Aviso } from "../componentes/Aviso";
import { BarraAvance } from "../componentes/BarraAvance";
import { Boton } from "../componentes/Boton";
import { Campo, Entrada } from "../componentes/Campo";
import { Interruptor } from "../componentes/Interruptor";
import { Plantillas } from "../pantallas/Ajustes";
import { TextoAviso } from "./TextoAviso";
import { aTextoHoras } from "../utilidades";

type Props = {
  aviso: AvisoPrivacidad;
  /** Hoy, AAAA-MM-DD: fecha que se propone para el saldo inicial. */
  hoy: string;
  /** Guarda la cuenta. Si falla, se muestra el error y se puede reintentar. */
  alTerminar: (respuestas: Respuestas) => Promise<void>;
};

/** Primer ingreso en cuatro pasos (RF-C2): aviso, saldo inicial, jornada y plantillas. */
export function Bienvenida({ aviso, hoy, alTerminar }: Props) {
  const [paso, setPaso] = useState(0);
  const [base, setBase] = useState<Respuestas>(() => respuestasPorDefecto(hoy));
  const [saldoTexto, setSaldoTexto] = useState("0");
  const [semanaTexto, setSemanaTexto] = useState(() => aTextoHoras(respuestasPorDefecto(hoy).minutosSemana));
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  // Lo que se escribe como texto ("4:30") se convierte a minutos; si no se entiende queda NaN y el paso lo rechaza.
  const respuestas: Respuestas = {
    ...base,
    saldoMinutos: parsearDuracion(saldoTexto) ?? NaN,
    minutosSemana: parsearDuracion(semanaTexto) ?? NaN,
  };
  const actual = PASOS[paso];
  const error = errorDelPaso(actual, respuestas);
  const ultimo = paso === PASOS.length - 1;

  async function seguir() {
    if (!puedeContinuar(actual, respuestas)) return;
    if (!ultimo) return setPaso(paso + 1);
    setGuardando(true);
    setFalla(null);
    try {
      await alTerminar(respuestas);
    } catch {
      setFalla("No se pudo guardar tu cuenta. Revisa la conexión e intenta de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <main className="aplicacion">
      <header className="encabezado">
        <h1 className="titulo-app">Banco de horas</h1>
      </header>
      <section className="pantalla">
        <div className="seccion">
          <p className="texto-suave">
            Paso {paso + 1} de {PASOS.length}
          </p>
          <BarraAvance valor={paso + 1} max={PASOS.length} etiqueta="Avance de la bienvenida" />
        </div>

        {actual === "aviso" && (
          <div className="seccion">
            <TextoAviso aviso={aviso} />
            <Interruptor
              etiqueta={aviso.textoAutorizacion}
              activo={base.avisoAceptado}
              onCambiar={(avisoAceptado) => setBase({ ...base, avisoAceptado })}
            />
          </div>
        )}

        {actual === "saldo" && (
          <div className="formulario">
            <h2 className="titulo-seccion">Saldo inicial</h2>
            <p>¿Cuántas horas le debes hoy a la clínica? Si no debes nada, deja 0.</p>
            <Campo etiqueta="Fecha del saldo">
              <Entrada type="date" value={base.saldoFecha} onChange={(e) => setBase({ ...base, saldoFecha: e.target.value })} />
            </Campo>
            <Campo etiqueta="Horas que debes">
              <Entrada type="text" inputMode="decimal" placeholder="ej. 4 o 4:30" value={saldoTexto} onChange={(e) => setSaldoTexto(e.target.value)} />
            </Campo>
          </div>
        )}

        {actual === "jornada" && (
          <div className="formulario">
            <h2 className="titulo-seccion">Tu jornada</h2>
            <Campo etiqueta="Horas por semana">
              <Entrada type="text" inputMode="decimal" value={semanaTexto} onChange={(e) => setSemanaTexto(e.target.value)} />
            </Campo>
            <Campo etiqueta="La noche empieza a las">
              <Entrada type="time" value={base.nocturnoDesde} onChange={(e) => setBase({ ...base, nocturnoDesde: e.target.value })} />
            </Campo>
          </div>
        )}

        {actual === "plantillas" && (
          <Plantillas plantillas={base.plantillas} onCambiar={(plantillas) => setBase({ ...base, plantillas })} />
        )}

        {actual !== "aviso" && error && <p className="texto-suave">{error}</p>}
        {falla && <Aviso tipo="error">{falla}</Aviso>}

        <div className="acciones">
          <Boton variante="relleno" onClick={seguir} disabled={!puedeContinuar(actual, respuestas) || guardando}>
            {guardando ? "Guardando…" : ultimo ? "Terminar" : "Continuar"}
          </Boton>
          {paso > 0 && (
            <Boton onClick={() => setPaso(paso - 1)} disabled={guardando}>
              Atrás
            </Boton>
          )}
        </div>
      </section>
    </main>
  );
}
