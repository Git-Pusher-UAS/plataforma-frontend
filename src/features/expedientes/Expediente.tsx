import { useEffect, useState, type FormEvent } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router'
import { ArrowRightLeft, Eye } from 'lucide-react'
import {
  areaDeRol,
  ESTADOS,
  useCambiarEstado,
  useConsentimientos,
  useCrearNota,
  useExpediente,
  useLineaTiempo,
  useNotas,
  useRevelarDato,
  useRevocarConsentimiento,
  type Area,
  type CampoOculto,
  type EstadoExpediente,
  type Expediente,
  type Nota,
} from '@/features/expedientes/api'
import { EtiquetaEstado } from '@/features/expedientes/ExpedientesPage'
import { textoArea, useCanalizacionesDeExpediente } from '@/features/canalizacion/api'
import { useSesion } from '@/features/identidad/sesion'
import { Consulta } from '@/shared/ui/Estados'
import { Dialogo } from '@/shared/ui/Dialogo'
import { NoDisponible } from '@/shared/ui/NoDisponible'
import { Pestanas } from '@/shared/ui/Pestanas'
import { fecha, fechaHora } from '@/shared/lib/formato'

type Ctx = { exp: Expediente; area: Area; autor: string; esTS: boolean }
const useExp = () => useOutletContext<Ctx>()

/** P-14 · Expediente: encabezado común y pestañas juntas (Resumen, Línea de tiempo, Notas, Consentimientos, Canalizaciones). */
export function ExpedienteLayout() {
  const { expedienteId = '' } = useParams()
  const { personal } = useSesion()
  const area = areaDeRol(personal!.rol)
  const q = useExpediente(expedienteId, personal!.rol)
  if (!area) return <NoDisponible />
  return (
    <Consulta q={q}>
      {(exp) => {
        if (!exp) return <NoDisponible />
        const base = `/expedientes/${exp.id}`
        return (
          <section className="pila">
            <Link to="/expedientes" className="enlace-volver">
              ← Expedientes
            </Link>
            <header className="encabezado">
              <div>
                <p className="etiqueta-peque">{exp.id}</p>
                <h1>{exp.alias}</h1>
                <p className="fila-chips">
                  <EtiquetaEstado estado={exp.estado} />
                  <span className="texto-suave">Abierto el {fecha(exp.abierto)}</span>
                </p>
              </div>
              <div className="encabezado-acciones">
                <Link to={`${base}/canalizar`} className="boton">
                  <ArrowRightLeft size={18} aria-hidden="true" /> Canalizar
                </Link>
              </div>
            </header>
            <Pestanas
              etiqueta="Secciones del expediente"
              items={[
                { to: base, texto: 'Resumen' },
                { to: `${base}/linea-de-tiempo`, texto: 'Línea de tiempo' },
                { to: `${base}/notas`, texto: `Notas de ${textoArea(area)}` },
                { to: `${base}/consentimientos`, texto: 'Consentimientos' },
                { to: `${base}/canalizaciones`, texto: 'Canalizaciones' },
              ]}
            />
            {/* Aviso genérico e igual para todos: no lista ni cuenta las secciones de otras áreas. */}
            <p className="aviso-areas texto-suave">Solo ves la información de las áreas en las que participas.</p>
            <Outlet context={{ exp, area, autor: personal!.nombre, esTS: personal!.rol === 'trabajo-social' } satisfies Ctx} />
          </section>
        )
      }}
    </Consulta>
  )
}

const ETIQUETA_OCULTO: Record<CampoOculto, string> = { curp: 'CURP', domicilio: 'Domicilio', telefono: 'Teléfono' }
const MOTIVOS_RAPIDOS = ['Contactar para una cita', 'Trámite o canalización', 'Verificar identidad en ventanilla']
const SEGUNDOS_VISIBLE = 20

/** P-14 · Resumen, con P-14b (mostrar dato oculto con motivo rápido). */
export function ResumenPage() {
  const { exp, esTS } = useExp()
  const [revelar, setRevelar] = useState<CampoOculto | null>(null)
  const [visible, setVisible] = useState<{ campo: CampoOculto; valor: string } | null>(null)
  const [reabrir, setReabrir] = useState(false)
  const cambiar = useCambiarEstado(exp.id)

  // El valor revelado no se guarda: se borra de la pantalla a los pocos segundos.
  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(() => setVisible(null), SEGUNDOS_VISIBLE * 1000)
    return () => window.clearTimeout(t)
  }, [visible])

  const siguiente: Partial<Record<EstadoExpediente, EstadoExpediente>> = { abierto: 'en_seguimiento', en_seguimiento: 'cerrado' }
  const proximo = siguiente[exp.estado]

  return (
    <div className="rejilla-resumen">
      <div className="tarjeta pila-corta">
        <h2 className="subtitulo">Datos generales</h2>
        <dl className="datos">
          <dt>Edad</dt>
          <dd>{exp.edad !== null ? `${exp.edad} años` : '—'}</dd>
          <dt>Sector</dt>
          <dd>{exp.sector}</dd>
          <dt>Origen</dt>
          <dd>{exp.origen}</dd>
          <dt>Última actividad</dt>
          <dd>{fecha(exp.actualizado)}</dd>
        </dl>
      </div>
      <div className="tarjeta pila-corta">
        <h2 className="subtitulo">Datos protegidos</h2>
        <p className="texto-suave texto-chico">Mostrar un dato pide un motivo y queda en la bitácora.</p>
        <ul className="lista-simple">
          {(Object.keys(ETIQUETA_OCULTO) as CampoOculto[]).map((c) => (
            <li key={c} className="fila-accion">
              <span>
                <span className="etiqueta-peque">{ETIQUETA_OCULTO[c]}</span>
                <br />
                <span className={visible?.campo === c ? 'dato-revelado' : ''}>{visible?.campo === c ? visible.valor : exp.ocultos[c]}</span>
              </span>
              <button type="button" className="boton-secundario boton-chico" onClick={() => setRevelar(c)} disabled={visible?.campo === c}>
                <Eye size={16} aria-hidden="true" /> Mostrar
              </button>
            </li>
          ))}
        </ul>
      </div>
      {esTS && (
        <div className="tarjeta pila-corta">
          <h2 className="subtitulo">Estado del expediente</h2>
          <p>
            Ahora: <EtiquetaEstado estado={exp.estado} />
          </p>
          {proximo && (
            <button type="button" className="boton" disabled={cambiar.isPending} onClick={() => cambiar.mutate({ estado: proximo, version: exp.version })}>
              Pasar a «{ESTADOS.find((s) => s.valor === proximo)!.texto}»
            </button>
          )}
          {exp.estado === 'cerrado' && (
            <button type="button" className="boton-secundario" onClick={() => setReabrir(true)}>
              Reabrir expediente
            </button>
          )}
        </div>
      )}

      <DialogoRevelar expedienteId={exp.id} campo={revelar} onCerrar={() => setRevelar(null)} onRevelado={(campo, valor) => setVisible({ campo, valor })} />
      <DialogoMotivo
        abierto={reabrir}
        titulo="Reabrir expediente"
        boton="Reabrir"
        onCerrar={() => setReabrir(false)}
        onConfirmar={(motivo) => cambiar.mutate({ estado: 'abierto', version: exp.version, motivo }, { onSuccess: () => setReabrir(false) })}
      />
    </div>
  )
}

/** P-14b · Mostrar dato oculto: motivos rápidos o uno escrito (supuesto 7). */
function DialogoRevelar({ expedienteId, campo, onCerrar, onRevelado }: { expedienteId: string; campo: CampoOculto | null; onCerrar: () => void; onRevelado: (c: CampoOculto, v: string) => void }) {
  const revelar = useRevelarDato(expedienteId)
  const [motivo, setMotivo] = useState('')
  const cerrar = () => {
    setMotivo('')
    revelar.reset()
    onCerrar()
  }
  return (
    <Dialogo abierto={campo !== null} titulo={`Mostrar ${campo === 'curp' ? 'CURP' : campo ? ETIQUETA_OCULTO[campo].toLowerCase() : ''}`} onCerrar={cerrar}>
      <form
        className="pila"
        onSubmit={(e) => {
          e.preventDefault()
          if (!campo) return
          revelar.mutate({ campo, motivo }, { onSuccess: (r) => (onRevelado(campo, r.valor), cerrar()) })
        }}
      >
        <p className="texto-suave">El dato se verá {SEGUNDOS_VISIBLE} segundos. Esta acción queda registrada.</p>
        <div className="chips" role="group" aria-label="Motivos rápidos">
          {MOTIVOS_RAPIDOS.map((m) => (
            <button key={m} type="button" className="chip chip-boton" aria-pressed={motivo === m} onClick={() => setMotivo(m)}>
              {m}
            </button>
          ))}
        </div>
        <div className="campo">
          <label htmlFor="motivo-revelar">Motivo</label>
          <textarea id="motivo-revelar" className="area" rows={2} minLength={10} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        </div>
        {revelar.isError && (
          <p className="texto-error" role="alert">
            No tienes permiso para esta acción.
          </p>
        )}
        <button className="boton" disabled={revelar.isPending}>
          Mostrar dato
        </button>
      </form>
    </Dialogo>
  )
}

/** Diálogo genérico que pide un motivo de 10 a 500 caracteres. */
export function DialogoMotivo({
  abierto,
  titulo,
  boton,
  texto,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean
  titulo: string
  boton: string
  texto?: string
  onCerrar: () => void
  onConfirmar: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <Dialogo
      abierto={abierto}
      titulo={titulo}
      onCerrar={() => {
        setMotivo('')
        onCerrar()
      }}
    >
      <form
        className="pila"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          onConfirmar(motivo)
          setMotivo('')
        }}
      >
        {texto && <p className="texto-suave">{texto}</p>}
        <div className="campo">
          <label htmlFor="motivo-dialogo">Motivo</label>
          <textarea id="motivo-dialogo" className="area" rows={3} minLength={10} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          <span className="campo-ayuda">{motivo.length}/500</span>
        </div>
        <button className="boton">{boton}</button>
      </form>
    </Dialogo>
  )
}

/** P-15 · Línea de tiempo (solo eventos de las áreas del actor). */
export function LineaTiempoPage() {
  const { exp, area } = useExp()
  const q = useLineaTiempo(exp.id, area)
  return (
    <Consulta q={q} vacio="Todavía no hay movimientos que mostrar.">
      {(eventos) => (
        <ol className="linea-tiempo">
          {eventos.map((e) => (
            <li key={e.id}>
              <span className={`etiqueta etiqueta-${e.area}`}>{textoArea(e.area)}</span>
              <p>{e.texto}</p>
              <time className="texto-suave texto-chico" dateTime={e.fecha}>
                {fechaHora(e.fecha)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Consulta>
  )
}

const ahoraLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/** P-16 · Notas del área. Inmutables: corregir crea una nota nueva encadenada. */
export function NotasPage() {
  const { exp, area, autor } = useExp()
  const q = useNotas(exp.id, area)
  const crear = useCrearNota(exp.id, area)
  const [texto, setTexto] = useState('')
  const [corrige, setCorrige] = useState<Nota | null>(null)
  const sinConexion = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <div className="rejilla-notas">
      <Consulta q={q} vacio="Aún no hay notas de tu área.">
        {(notas) => (
          <ol className="lista-notas">
            {[...notas].reverse().map((n) => (
              <li key={n.id} className="tarjeta nota">
                {n.corrigeA && <p className="etiqueta-peque">Corrige la nota {n.corrigeA}</p>}
                <p>{n.texto}</p>
                <p className="texto-suave texto-chico">
                  {n.autor} · hora declarada {fechaHora(n.horaDeclarada)} · registrada {fechaHora(n.registrada)}
                </p>
                <button type="button" className="enlace-boton" onClick={() => setCorrige(n)}>
                  Corregir
                </button>
              </li>
            ))}
          </ol>
        )}
      </Consulta>
      <form
        className="tarjeta pila-corta editor-nota"
        onSubmit={(e) => {
          e.preventDefault()
          crear.mutate({ texto, horaDeclarada: ahoraLocal(), corrigeA: corrige?.id, autor }, { onSuccess: () => (setTexto(''), setCorrige(null)) })
        }}
      >
        <h2 className="subtitulo">{corrige ? 'Corrección' : 'Nueva nota'}</h2>
        {corrige && (
          <p className="estado estado-aviso texto-chico">
            Corriges la nota del {fechaHora(corrige.registrada)}. La original se conserva.{' '}
            <button type="button" className="enlace-boton" onClick={() => setCorrige(null)}>
              Cancelar
            </button>
          </p>
        )}
        <div className="campo">
          <label htmlFor="nota">Texto</label>
          <textarea id="nota" className="area" rows={6} maxLength={10000} value={texto} onChange={(e) => setTexto(e.target.value)} required />
          <span className="campo-ayuda">{texto.length}/10 000 · Se guarda con la hora de este dispositivo como «hora declarada».</span>
        </div>
        {sinConexion ? (
          <Link to="/pendientes" className="boton">
            Guardar como borrador sin conexión
          </Link>
        ) : (
          <button className="boton" disabled={crear.isPending || !texto.trim()}>
            Guardar nota
          </button>
        )}
      </form>
    </div>
  )
}

/** P-17 · Consentimientos. La revocación no borra la decisión original. */
export function ConsentimientosPage() {
  const { exp, esTS } = useExp()
  const q = useConsentimientos(exp.id)
  const revocar = useRevocarConsentimiento(exp.id)
  return (
    <Consulta q={q} vacio="No hay consentimientos registrados.">
      {(lista) => (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Finalidad</th>
                <th scope="col">Decisión</th>
                <th scope="col">Fecha</th>
                <th scope="col">Aviso</th>
                {esTS && <th scope="col">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>{c.finalidad}</td>
                  <td>
                    <span className={`estado-chip estado-chip-${c.decision}`}>{c.decision[0]!.toUpperCase() + c.decision.slice(1)}</span>
                  </td>
                  <td>{fecha(c.fecha)}</td>
                  <td>{c.version}</td>
                  {esTS && (
                    <td>
                      {c.revocable && c.decision === 'aceptado' && (
                        <button
                          type="button"
                          className="boton-secundario boton-chico"
                          disabled={revocar.isPending}
                          onClick={() =>
                            revocar.mutate(
                              c.consentId && c.propositoId
                                ? { consentId: c.consentId, propositoId: c.propositoId }
                                : c.id,
                            )
                          }
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Consulta>
  )
}

/** Pestaña Canalizaciones dentro de P-14. */
export function CanalizacionesExpedientePage() {
  const { exp } = useExp()
  const q = useCanalizacionesDeExpediente(exp.id)
  return (
    <Consulta q={q} vacio="Este expediente no tiene canalizaciones.">
      {(lista) => (
        <ul className="lista-simple pila-corta">
          {lista.map((c) => (
            <li key={c.id} className="tarjeta fila-accion">
              <div>
                <p>
                  <strong>{c.origen}</strong> → <strong>{c.destino}</strong> <span className="chip">{c.tipo === 'externa' ? 'Externa' : 'Interna'}</span>
                </p>
                <p className="texto-suave">{c.resumen}</p>
              </div>
              <span className={`estado-chip estado-chip-${c.estado}`}>{c.estado}</span>
            </li>
          ))}
        </ul>
      )}
    </Consulta>
  )
}

export function useExpedienteCtx() {
  return useExp()
}
