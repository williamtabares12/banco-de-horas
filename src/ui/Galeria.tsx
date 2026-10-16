import { useState } from "react";
import { BarraAvance } from "./componentes/BarraAvance";
import { Boton } from "./componentes/Boton";
import { Campo, Entrada, Seleccion } from "./componentes/Campo";
import { DialogoConfirmacion } from "./componentes/DialogoConfirmacion";
import { Enlace } from "./componentes/Enlace";
import { FilaLista, ListaFilas } from "./componentes/FilaLista";
import { Interruptor } from "./componentes/Interruptor";
import { Pestanas } from "./componentes/Pestanas";

const SECCIONES = [
  { id: "inicio", nombre: "Inicio" },
  { id: "turnos", nombre: "Turnos" },
  { id: "banco", nombre: "Banco" },
  { id: "quincena", nombre: "Quincena" },
  { id: "extracto", nombre: "Extracto" },
  { id: "ajustes", nombre: "Ajustes" },
];

/**
 * Todos los componentes juntos, para revisarlos y medirlos. Solo existe en desarrollo:
 * abre http://localhost:5173/#componentes con `npm run dev`. No entra en el build que se publica.
 */
export default function Galeria() {
  const [activa, setActiva] = useState("inicio");
  const [encendido, setEncendido] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [ultima, setUltima] = useState("(nada todavía)");

  return (
    <main className="galeria">
      <h1>Componentes</h1>
      <p className="galeria__nota">Vista solo de desarrollo. Última acción: {ultima}</p>

      <section className="galeria__seccion">
        <h2>Pestañas</h2>
        <Pestanas elementos={SECCIONES} activa={activa} onCambiar={setActiva} />
      </section>

      <section className="galeria__seccion">
        <h2>Botones</h2>
        <Boton variante="relleno" onClick={() => setUltima("botón relleno")}>
          Registrar turno
        </Boton>
        <div className="galeria__fila">
          <Boton onClick={() => setUltima("botón de contorno")}>Cancelar</Boton>
          <Boton borra onClick={() => setDialogo(true)}>
            Borrar
          </Boton>
          <Boton disabled>Deshabilitado</Boton>
        </div>
        <div className="galeria__fila">
          <Enlace onClick={() => setUltima("enlace")}>Ir a Ajustes</Enlace>
          <Enlace href="#componentes">Enlace con dirección</Enlace>
        </div>
      </section>

      <section className="galeria__seccion">
        <h2>Campos</h2>
        <Campo etiqueta="Fecha">
          <Entrada type="date" defaultValue="2026-10-15" />
        </Campo>
        <Campo etiqueta="Horas">
          <Entrada type="text" inputMode="decimal" placeholder="ej. 4 o 4:30" />
        </Campo>
        <Campo etiqueta="Tipo de turno">
          <Seleccion defaultValue="ordinario">
            <option value="ordinario">Ordinario</option>
            <option value="alquiler">Quirófano de alquiler</option>
          </Seleccion>
        </Campo>
      </section>

      <section className="galeria__seccion">
        <h2>Filas de lista</h2>
        <ListaFilas>
          <FilaLista fecha="2026-10-14" titulo="Capacitación o reunión" detalle={["Curso de bioseguridad"]} valor="-2 h" />
          <FilaLista fecha="2026-10-12" titulo="Pago" detalle={["turno del 2026-10-12, 07:00 a 19:00"]} valor="-3 h" onClick={() => setUltima("fila tocable")} />
          <FilaLista fecha="2026-09-02" titulo="Préstamo" valor="+6 h" />
        </ListaFilas>
      </section>

      <section className="galeria__seccion">
        <h2>Barra de avance</h2>
        <p className="galeria__nota">Esta semana: 27 h / 42 h</p>
        <BarraAvance valor={27 * 60} max={42 * 60} etiqueta="Avance de la semana" />
      </section>

      <section className="galeria__seccion">
        <h2>Interruptor</h2>
        <Interruptor etiqueta="Las horas extra descuentan deuda" activo={encendido} onCambiar={setEncendido} />
        <Interruptor etiqueta="Apagado de ejemplo" activo={false} onCambiar={() => setUltima("interruptor")} />
      </section>

      {dialogo && (
        <DialogoConfirmacion
          titulo="¿Borrar este movimiento?"
          mensaje="Pago del 2026-10-14, -2 h. No se puede deshacer."
          textoConfirmar="Borrar"
          onConfirmar={() => {
            setDialogo(false);
            setUltima("diálogo: confirmado");
          }}
          onCancelar={() => {
            setDialogo(false);
            setUltima("diálogo: cancelado");
          }}
        />
      )}
    </main>
  );
}
