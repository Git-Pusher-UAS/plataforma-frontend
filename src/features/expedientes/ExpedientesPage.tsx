import { useState } from 'react'
import { Link } from 'react-router'
import { UserPlus } from 'lucide-react'
import { ESTADOS, textoEstado, useExpedientes, type FiltrosExpedientes, type EstadoExpediente } from '@/features/expedientes/api'
import { textoArea } from '@/features/canalizacion/api'
import { useSesion } from '@/features/identidad/sesion'
import { Consulta } from '@/shared/ui/Estados'
import { Encabezado } from '@/shared/ui/Encabezado'
import { fecha } from '@/shared/lib/formato'

export function EtiquetaEstado({ estado }: { estado: EstadoExpediente }) {
  return <span className={`estado-chip estado-chip-${estado}`}>{textoEstado(estado)}</span>
}

/** P-10 · Expedientes asignados. Sin buscador por nombre o CURP, a propósito. */
export function ExpedientesPage() {
  const { personal } = useSesion()
  const [f, setF] = useState<FiltrosExpedientes>({})
  const q = useExpedientes(personal!.rol, f)
  return (
    <section className="pila">
      <Encabezado
        antetitulo="Atención"
        titulo="Expedientes"
        acciones={
          personal!.rol === 'trabajo-social' && (
            <Link to="/expedientes/nuevo" className="boton">
              <UserPlus size={18} aria-hidden="true" /> Nuevo expediente
            </Link>
          )
        }
      >
        Solo ves los expedientes que tienes asignados.
      </Encabezado>
      <div className="filtros tarjeta-lila tarjeta">
        <div className="campo campo-chico">
          <label htmlFor="f-estado">Estado</label>
          <select id="f-estado" value={f.estado ?? ''} onChange={(e) => setF({ ...f, estado: (e.target.value || undefined) as EstadoExpediente | undefined })}>
            <option value="">Todos</option>
            {ESTADOS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.texto}
              </option>
            ))}
          </select>
        </div>
        <div className="campo campo-chico">
          <label htmlFor="f-desde">Abierto desde</label>
          <input id="f-desde" type="date" value={f.desde ?? ''} onChange={(e) => setF({ ...f, desde: e.target.value || undefined })} />
        </div>
        <div className="campo campo-chico">
          <label htmlFor="f-hasta">Hasta</label>
          <input id="f-hasta" type="date" value={f.hasta ?? ''} onChange={(e) => setF({ ...f, hasta: e.target.value || undefined })} />
        </div>
      </div>
      <Consulta q={q} vacio="No tienes expedientes asignados con estos filtros.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Expediente</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Áreas</th>
                  <th scope="col">Abierto</th>
                  <th scope="col">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/expedientes/${e.id}`} className="enlace-fuerte">
                        {e.alias}
                      </Link>
                      <div className="texto-suave texto-chico">{e.id}</div>
                    </td>
                    <td>
                      <EtiquetaEstado estado={e.estado} />
                    </td>
                    <td>{e.areas.map(textoArea).join(', ')}</td>
                    <td>{fecha(e.abierto)}</td>
                    <td>{fecha(e.actualizado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Consulta>
    </section>
  )
}
