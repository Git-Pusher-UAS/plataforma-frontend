import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Check, Phone, Plus } from 'lucide-react'
import {
  TEXTO_POSTULACION,
  useContrataciones,
  useCrearVacanteAdmin,
  useEmpresas,
  useEntregarContacto,
  useRevisarEmpresa,
  useRevisarVacante,
  useVacanteAdmin,
  useVacantesAdmin,
  type Empresa,
  type EstadoPostulacion,
} from '@/features/bolsa/api'
import { ChipEmpresa, ChipVacante, FormVacante, Volver } from '@/features/bolsa/componentes'
import { Dialogo } from '@/shared/ui/Dialogo'
import { Encabezado } from '@/shared/ui/Encabezado'
import { Consulta } from '@/shared/ui/Estados'
import { Pestanas } from '@/shared/ui/Pestanas'
import { fecha } from '@/shared/lib/formato'

function CabeceraBolsa() {
  const vacantes = useVacantesAdmin('en_revision')
  const empresas = useEmpresas('en_revision')
  const contratos = useContrataciones()
  const porRevisar = (vacantes.data?.length ?? 0) + (empresas.data?.length ?? 0)
  const porLlamar = contratos.data?.filter((c) => !c.contactoEntregado).length ?? 0
  return (
    <>
      <Encabezado
        antetitulo="Capacitación"
        titulo="Bolsa de trabajo"
        acciones={
          <Link to="/capacitacion/bolsa/nueva" className="boton">
            <Plus size={18} aria-hidden="true" /> Nueva vacante
          </Link>
        }
      >
        Aprueba empresas y vacantes, y entrega el contacto de las usuarias aceptadas.
      </Encabezado>
      <Pestanas
        etiqueta="Bolsa de trabajo"
        items={[
          { to: '/capacitacion/bolsa', texto: 'Vacantes' },
          { to: '/capacitacion/bolsa/revisar', texto: `Por revisar${porRevisar ? ` (${porRevisar})` : ''}` },
          { to: '/capacitacion/bolsa/contrataciones', texto: `Contrataciones${porLlamar ? ` (${porLlamar})` : ''}` },
          { to: '/capacitacion/bolsa/empresas', texto: 'Empresas' },
        ]}
      />
    </>
  )
}

/** K-07 · Bolsa de trabajo: todas las vacantes. */
export function BolsaPage() {
  const q = useVacantesAdmin()
  return (
    <section className="pila">
      <CabeceraBolsa />
      <Consulta q={q} vacio="No hay vacantes.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Puesto</th>
                  <th scope="col">Empresa</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Postulaciones</th>
                  <th scope="col">Actualizada</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`/capacitacion/bolsa/vacantes/${v.id}`} className="enlace-fuerte">
                        {v.puesto}
                      </Link>
                    </td>
                    <td>{v.empresa}</td>
                    <td>
                      <ChipVacante estado={v.estado} />
                    </td>
                    <td className="cifra">{v.postulaciones ?? 0}</td>
                    <td>{fecha(v.actualizada)}</td>
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

/** Aprobar o rechazar una empresa, con motivo al rechazar o suspender. */
function AccionesEmpresa({ e }: { e: Empresa }) {
  const revisar = useRevisarEmpresa()
  const [motivo, setMotivo] = useState<{ estado: 'rechazada' | 'suspendida'; texto: string } | null>(null)
  return (
    <>
      <div className="fila-botones">
        {e.estado === 'en_revision' && (
          <>
            <button type="button" className="boton-secundario boton-chico" onClick={() => setMotivo({ estado: 'rechazada', texto: '' })}>
              Rechazar
            </button>
            <button type="button" className="boton boton-chico" disabled={revisar.isPending} onClick={() => revisar.mutate({ id: e.id, estado: 'aprobada' })}>
              Aprobar
            </button>
          </>
        )}
        {e.estado === 'aprobada' && (
          <button type="button" className="boton-secundario boton-chico" onClick={() => setMotivo({ estado: 'suspendida', texto: '' })}>
            Suspender
          </button>
        )}
        {(e.estado === 'suspendida' || e.estado === 'rechazada') && (
          <button type="button" className="boton-secundario boton-chico" disabled={revisar.isPending} onClick={() => revisar.mutate({ id: e.id, estado: 'aprobada' })}>
            {e.estado === 'suspendida' ? 'Reactivar' : 'Aprobar'}
          </button>
        )}
      </div>
      <Dialogo abierto={motivo !== null} titulo={motivo?.estado === 'suspendida' ? `Suspender a ${e.nombre}` : `Rechazar a ${e.nombre}`} onCerrar={() => setMotivo(null)}>
        <form
          className="pila"
          onSubmit={(ev) => {
            ev.preventDefault()
            if (motivo) revisar.mutate({ id: e.id, estado: motivo.estado, motivo: motivo.texto.trim() }, { onSuccess: () => setMotivo(null) })
          }}
        >
          <div className="campo">
            <label htmlFor={`motivo-${e.id}`}>Motivo</label>
            <textarea id={`motivo-${e.id}`} className="area" rows={3} value={motivo?.texto ?? ''} onChange={(ev) => setMotivo(motivo && { ...motivo, texto: ev.target.value })} required minLength={5} />
            <span className="campo-ayuda">{motivo?.estado === 'suspendida' ? 'Sus vacantes publicadas se pausan.' : 'Se le envía a la empresa por correo.'}</span>
          </div>
          <button className="boton" disabled={revisar.isPending}>
            Confirmar
          </button>
        </form>
      </Dialogo>
    </>
  )
}

/** K-09 · Por revisar: vacantes y empresas nuevas. */
export function PorRevisarPage() {
  const vacantes = useVacantesAdmin('en_revision')
  const empresas = useEmpresas('en_revision')
  return (
    <section className="pila">
      <CabeceraBolsa />
      <h2 className="subtitulo">Vacantes</h2>
      <Consulta q={vacantes} vacio="No hay vacantes por revisar.">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((v) => (
              <li key={v.id} className="tarjeta fila-accion">
                <span>
                  <strong>{v.puesto}</strong>
                  <span className="texto-suave"> · {v.empresa} · enviada el {fecha(v.actualizada)}</span>
                </span>
                <Link to={`/capacitacion/bolsa/vacantes/${v.id}`} className="boton boton-chico">
                  Revisar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      <h2 className="subtitulo">Empresas</h2>
      <Consulta q={empresas} vacio="No hay empresas por aprobar.">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((e) => (
              <li key={e.id} className="tarjeta pila-corta">
                <span className="fila-accion">
                  <strong>{e.nombre}</strong>
                  <ChipEmpresa estado={e.estado} />
                </span>
                <dl className="datos">
                  <dt>RFC</dt>
                  <dd>{e.rfc}</dd>
                  <dt>Sector</dt>
                  <dd>{e.sector}</dd>
                  <dt>Contacto</dt>
                  <dd>
                    {e.contacto} · {e.telefono} · {e.correo}
                  </dd>
                  <dt>Solicitó</dt>
                  <dd>{fecha(e.solicitada)}</dd>
                </dl>
                <p className="texto-suave texto-chico">Verifica el RFC en el SAT y llama al contacto antes de aprobar.</p>
                <AccionesEmpresa e={e} />
              </li>
            ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

/** K-10 · Empresas aliadas */
export function EmpresasPage() {
  const q = useEmpresas()
  return (
    <section className="pila">
      <CabeceraBolsa />
      <Consulta q={q} vacio="No hay empresas registradas.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Empresa</th>
                  <th scope="col">Sector</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <td className="enlace-fuerte">{e.nombre}</td>
                    <td>{e.sector}</td>
                    <td>
                      {e.contacto}
                      <br />
                      <span className="texto-suave texto-chico">{e.correo}</span>
                    </td>
                    <td>
                      <ChipEmpresa estado={e.estado} />
                    </td>
                    <td>
                      <AccionesEmpresa e={e} />
                    </td>
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

/** K-11 · Contrataciones: llamar a la usuaria y entregar su contacto a la empresa. */
export function ContratacionesPage() {
  const q = useContrataciones()
  const entregar = useEntregarContacto()
  return (
    <section className="pila">
      <CabeceraBolsa />
      <p className="texto-suave">Llama a la usuaria desde su expediente o su cuenta del portal, confirma que quiere el empleo y entonces entrega su contacto.</p>
      <Consulta q={q} vacio="No hay contrataciones pendientes.">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((c) => (
              <li key={c.postulacionId} className="tarjeta fila-accion">
                <span>
                  <strong>{c.nombre}</strong> · {c.puesto}
                  <br />
                  <span className="texto-suave texto-chico">
                    {c.empresa} · aceptada el {fecha(c.fecha)} · folio {c.folio}
                  </span>
                </span>
                {c.contactoEntregado ? (
                  <span className="etiqueta etiqueta-capacitacion">
                    <Check size={14} aria-hidden="true" /> Contacto entregado
                  </span>
                ) : (
                  <button type="button" className="boton boton-chico" disabled={entregar.isPending} onClick={() => entregar.mutate(c.postulacionId)}>
                    <Phone size={16} aria-hidden="true" /> Ya hablé con ella: entregar contacto
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

/** K-08 · Nueva vacante: la Secretaría publica a nombre de una empresa aprobada. */
export function NuevaVacantePage() {
  const crear = useCrearVacanteAdmin()
  const empresas = useEmpresas('aprobada')
  const navegar = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  return (
    <section className="pila angosta">
      <Volver a="/capacitacion/bolsa" texto="Bolsa de trabajo" />
      <Encabezado antetitulo="Capacitación" titulo="Nueva vacante">
        Se publica de inmediato. Úsala cuando la empresa te pasa la vacante por teléfono o correo.
      </Encabezado>
      <FormVacante
        enviando={crear.isPending}
        textoEnviar="Publicar vacante"
        cancelarA="/capacitacion/bolsa"
        antes={
          <div className="campo">
            <label htmlFor="v-empresa">Empresa aliada</label>
            <select id="v-empresa" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} required>
              <option value="">Elige una empresa</option>
              {empresas.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <span className="campo-ayuda">Solo aparecen empresas aprobadas.</span>
          </div>
        }
        onEnviar={(d) => crear.mutate({ ...d, empresaId }, { onSuccess: () => navegar('/capacitacion/bolsa') })}
      />
    </section>
  )
}

const ORDEN: EstadoPostulacion[] = ['enviada', 'en_revision', 'entrevista', 'aceptada', 'no_seleccionada', 'retirada']

/** K-12 · Revisar vacante: aprobar o pedir cambios, y ver cómo va. */
export function RevisarVacantePage() {
  const { vacanteId = '' } = useParams()
  const q = useVacanteAdmin(vacanteId)
  const revisar = useRevisarVacante(vacanteId)
  const [pidiendo, setPidiendo] = useState(false)
  const [motivo, setMotivo] = useState('')
  return (
    <section className="pila angosta">
      <Volver a="/capacitacion/bolsa" texto="Bolsa de trabajo" />
      <Consulta q={q} vacio="Esta vacante no existe." esVacio={(v) => v === null}>
        {(v) =>
          v && (
            <>
              <Encabezado antetitulo={v.empresa} titulo={v.puesto}>
                <ChipVacante estado={v.estado} /> Actualizada el {fecha(v.actualizada)}
              </Encabezado>
              <div className="tarjeta pila-corta">
                <p className="chips">
                  {v.sueldo && <span className="chip">{v.sueldo}</span>}
                  <span className="chip">{v.sector}</span>
                  <span className="chip">{v.horario}</span>
                  <span className="chip">{v.tipoEmpleo}</span>
                  <span className="chip">{v.ubicacion}</span>
                </p>
                <p>{v.descripcion}</p>
                {v.requisitos.length > 0 && (
                  <ul>
                    {v.requisitos.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
              {v.estado === 'cambios' && <p className="estado estado-aviso">Pediste: {v.motivoCambios}</p>}
              {(v.estado === 'en_revision' || v.estado === 'publicada') && (
                <>
                  <p className="texto-suave texto-chico">Revisa que no pida datos sensibles (estado civil, embarazo, fotografía) ni condiciones ilegales.</p>
                  <div className="fila-botones">
                    <button type="button" className="boton-secundario" onClick={() => setPidiendo(true)}>
                      {v.estado === 'publicada' ? 'Retirar y pedir cambios' : 'Pedir cambios'}
                    </button>
                    {v.estado === 'en_revision' && (
                      <button type="button" className="boton" disabled={revisar.isPending} onClick={() => revisar.mutate({ aprobar: true })}>
                        Aprobar y publicar
                      </button>
                    )}
                  </div>
                </>
              )}
              <div className="tarjeta pila-corta">
                <p className="etiqueta-peque">Postulaciones</p>
                <dl className="datos">
                  {ORDEN.map((e) => (
                    <div key={e} className="contents">
                      <dt>{TEXTO_POSTULACION[e]}</dt>
                      <dd className="cifra">{v.porEstado[e]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <Dialogo abierto={pidiendo} titulo="Pedir cambios" onCerrar={() => setPidiendo(false)}>
                <form
                  className="pila"
                  onSubmit={(e) => {
                    e.preventDefault()
                    revisar.mutate({ aprobar: false, motivo: motivo.trim() }, { onSuccess: () => setPidiendo(false) })
                  }}
                >
                  <div className="campo">
                    <label htmlFor="cambios">¿Qué debe corregir la empresa?</label>
                    <textarea id="cambios" className="area" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={5} />
                  </div>
                  <button className="boton" disabled={revisar.isPending}>
                    Enviar a la empresa
                  </button>
                </form>
              </Dialogo>
            </>
          )
        }
      </Consulta>
    </section>
  )
}
