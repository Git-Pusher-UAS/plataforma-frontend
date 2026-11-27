import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { CalendarClock, FileText, Plus, Trash2 } from 'lucide-react'
import {
  ESCOLARIDADES,
  FINALES,
  HABILIDADES,
  INICIOS,
  OPCIONES_VACANTE,
  TIEMPOS,
  useGuardarCv,
  useMiCv,
  useMiPostulacion,
  useMisPostulaciones,
  usePostularme,
  useResponderEntrevista,
  useRetirarPostulacion,
  useVacante,
  useVacantes,
  type Cv,
  type Escolaridad,
  type Experiencia,
  type FiltrosVacantes,
  type Postulacion,
} from '@/features/bolsa/api'
import { AvancePostulacion, ChipPostulacion, OpcionesMultiples, OpcionesUnicas, Volver } from '@/features/bolsa/componentes'
import { fechaCorta, fechaLarga, hora12 } from '@/features/capacitacion/api'
import { Dialogo } from '@/shared/ui/Dialogo'
import { Consulta } from '@/shared/ui/Estados'
import { Pestanas } from '@/shared/ui/Pestanas'
import { fecha } from '@/shared/lib/formato'

const PESTANAS = [
  { to: '/u/empleo', texto: 'Vacantes' },
  { to: '/u/empleo/postulaciones', texto: 'Postulaciones', fin: false },
  { to: '/u/empleo/cv', texto: 'Mi CV', fin: false },
]

function Cabecera({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <>
      <div>
        <p className="etiqueta-peque">Empleo</p>
        <h1>{titulo}</h1>
        {texto && <p className="texto-suave">{texto}</p>}
      </div>
      <Pestanas items={PESTANAS} etiqueta="Bolsa de trabajo" />
    </>
  )
}

function Aviso() {
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  return aviso ? (
    <p className="estado estado-exito" role="status">
      {aviso}
    </p>
  ) : null
}

/** Hay una entrevista esperando que la usuaria responda. */
export const entrevistaPorConfirmar = (p: Postulacion) => p.estado === 'entrevista' && p.entrevista?.respuesta === null

// ---------------------------------------------------------------------
/** U-12 · Bolsa de trabajo */
export function EmpleoPage() {
  const [f, setF] = useState<FiltrosVacantes>({})
  const q = useVacantes(f)
  const filtro = (clave: keyof FiltrosVacantes, texto: string) => (
    <div className="campo campo-chico">
      <label htmlFor={`f-${clave}`}>{texto}</label>
      <select id={`f-${clave}`} value={f[clave] ?? ''} onChange={(e) => setF({ ...f, [clave]: e.target.value || undefined })}>
        <option value="">Todos</option>
        {OPCIONES_VACANTE[clave].map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )
  return (
    <section className="pila">
      <Cabecera titulo="Bolsa de trabajo" texto="Vacantes de empresas aliadas revisadas por la Secretaría." />
      <details className="filtros-plegables">
        <summary>Filtrar vacantes</summary>
        <div className="rejilla-filtros">
          {filtro('sector', 'Sector')}
          {filtro('horario', 'Horario')}
          {filtro('tipoEmpleo', 'Tipo de empleo')}
          {filtro('ubicacion', 'Ubicación')}
        </div>
      </details>
      <Consulta q={q} vacio="No hay vacantes con esos filtros.">
        {(vacantes) => (
          <ul className="lista-simple pila-corta">
            {vacantes.map((v) => (
              <li key={v.id}>
                {/* Toda la tarjeta abre la vacante (más fácil de tocar en el celular). */}
                <Link to={`/u/empleo/${v.id}`} className="tarjeta vacante tarjeta-vacante">
                  <div className="tarjeta-cabecera">
                    <h3>{v.puesto}</h3>
                    {v.publicadaEn && <span className="publicada-tarjeta">Publicada el {fechaCorta(v.publicadaEn)}</span>}
                  </div>
                  <p className="texto-suave">
                    {v.empresa} · {v.ubicacion}
                  </p>
                  <p className="chips">
                    {v.sueldo && <span className="chip chip-sueldo">{v.sueldo}</span>}
                    <span className="chip">{v.horario}</span>
                    <span className="chip">{v.tipoEmpleo}</span>
                  </p>
                  {v.postulada && <span className="etiqueta etiqueta-capacitacion">Ya te postulaste</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

// ---------------------------------------------------------------------
/** U-13 · Detalle de vacante y postularse en un toque. */
export function DetalleVacantePage() {
  const { vacanteId = '' } = useParams()
  const q = useVacante(vacanteId)
  const cv = useMiCv()
  const postular = usePostularme()
  const navegar = useNavigate()
  const [confirmar, setConfirmar] = useState(false)
  const enviar = () =>
    postular.mutate(vacanteId, {
      onSuccess: (p) => navegar(`/u/empleo/postulaciones/${p.id}`, { state: { aviso: 'Listo, tu postulación se envió.' } }),
    })
  return (
    <section className="pila">
      <Volver a="/u/empleo" texto="Vacantes" />
      <Consulta q={q} vacio="Esta vacante ya no está disponible." esVacio={(v) => v === null}>
        {(v) =>
          v && (
            <>
              <div className="detalle-cabecera">
                <div>
                  <h1>{v.puesto}</h1>
                  <p className="texto-suave">{v.empresa}</p>
                </div>
                {v.publicadaEn && <span className="publicada-insignia">Publicada el {fechaCorta(v.publicadaEn)}</span>}
              </div>
              <p className="chips">
                {v.sueldo && <span className="chip chip-sueldo">{v.sueldo}</span>}
                <span className="chip">{v.horario}</span>
                <span className="chip">{v.tipoEmpleo}</span>
                <span className="chip">{v.ubicacion}</span>
              </p>
              <p>{v.descripcion}</p>
              {v.requisitos.length > 0 && (
                <>
                  <h2 className="subtitulo">Lo que piden</h2>
                  <ul>
                    {v.requisitos.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
              {v.postulada ? (
                <div className="estado estado-exito pila-corta" role="status">
                  <span>Ya te postulaste a esta vacante.</span>
                  <Link to="/u/empleo/postulaciones">Ver mis postulaciones</Link>
                </div>
              ) : cv.isPending ? null : !cv.data ? (
                <div className="pila-corta">
                  <Link to={`/u/empleo/cv/editar?postular=${v.id}`} className="boton boton-ancho">
                    Postularme
                  </Link>
                  <p className="texto-suave nota">Primero armamos tu CV: son 4 preguntas y toma unos 2 minutos.</p>
                </div>
              ) : confirmar ? (
                <div className="tarjeta pila-corta">
                  <p>
                    Enviaremos tu CV a <strong>{v.empresa}</strong>.
                  </p>
                  <p className="texto-suave">Tu teléfono y tu dirección no se comparten. Si la empresa te acepta, la Secretaría te llama primero.</p>
                  {postular.isError && (
                    <p className="texto-error" role="alert">
                      No se pudo enviar. Intenta de nuevo.
                    </p>
                  )}
                  <button type="button" className="boton" disabled={postular.isPending} onClick={enviar}>
                    {postular.isPending ? 'Enviando…' : 'Enviar mi postulación'}
                  </button>
                  <Link to="/u/empleo/cv" className="enlace-discreto">
                    Revisar mi CV antes
                  </Link>
                </div>
              ) : (
                <button type="button" className="boton boton-ancho" onClick={() => setConfirmar(true)}>
                  Postularme
                </button>
              )}
              <p className="texto-suave nota">Actualizada el {fechaLarga(v.actualizada)}.</p>
            </>
          )
        }
      </Consulta>
    </section>
  )
}

// ---------------------------------------------------------------------
/** U-18 · Mis postulaciones */
export function MisPostulacionesPage() {
  const q = useMisPostulaciones()
  return (
    <section className="pila">
      <Cabecera titulo="Mis postulaciones" />
      <Consulta
        q={q}
        vacio={
          <>
            Aún no te postulas a ninguna vacante. <Link to="/u/empleo">Ver vacantes</Link>
          </>
        }
      >
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {[...lista]
              .sort((a, b) => Number(FINALES.includes(a.estado)) - Number(FINALES.includes(b.estado)))
              .map((p) => (
                <li key={p.id}>
                  <Link to={`/u/empleo/postulaciones/${p.id}`} className="tarjeta tarjeta-enlace pila-corta">
                    <span className="fila-accion">
                      <strong>{p.puesto}</strong>
                      <ChipPostulacion estado={p.estado} />
                    </span>
                    <span className="texto-suave">
                      {p.empresa} · enviada el {fecha(p.enviada)}
                    </span>
                    {entrevistaPorConfirmar(p) && (
                      <span className="estado estado-aviso texto-chico">
                        <CalendarClock size={16} aria-hidden="true" /> Tienes una entrevista por confirmar
                      </span>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

const MENSAJE: Record<Postulacion['estado'], string> = {
  enviada: 'Tu CV llegó. La empresa aún no lo abre.',
  en_revision: 'La empresa está revisando tu CV.',
  entrevista: 'La empresa quiere conocerte.',
  aceptada: '¡Felicidades! La empresa quiere contratarte.',
  no_seleccionada: 'Esta vez la empresa eligió otro perfil. Hay más vacantes esperándote.',
  retirada: 'Retiraste esta postulación.',
}

/** U-19 · Detalle de mi postulación: avance, entrevista y resultado. */
export function MiPostulacionPage() {
  const { postulacionId = '' } = useParams()
  const q = useMiPostulacion(postulacionId)
  const responder = useResponderEntrevista(postulacionId)
  const retirar = useRetirarPostulacion(postulacionId)
  const [retirando, setRetirando] = useState(false)
  return (
    <section className="pila">
      <Volver a="/u/empleo/postulaciones" texto="Mis postulaciones" />
      <Aviso />
      <Consulta q={q} vacio="No encontramos esta postulación." esVacio={(p) => p === null}>
        {(p) =>
          p && (
            <>
              <div>
                <h1>{p.puesto}</h1>
                <p className="texto-suave">
                  {p.empresa} · folio {p.folio}
                </p>
              </div>
              <AvancePostulacion p={p} />
              <p className={p.estado === 'aceptada' ? 'estado estado-exito' : undefined}>{MENSAJE[p.estado]}</p>

              {p.estado === 'entrevista' && p.entrevista && (
                <div className="tarjeta pila-corta">
                  <p className="etiqueta-peque">Tu entrevista</p>
                  <p className="dato-grande">
                    {fechaLarga(p.entrevista.fecha)}, {hora12(p.entrevista.hora)}
                  </p>
                  <p>
                    {p.entrevista.modalidad} · {p.entrevista.lugar}
                  </p>
                  {p.entrevista.respuesta === null ? (
                    <>
                      <button type="button" className="boton" disabled={responder.isPending} onClick={() => responder.mutate('confirmada')}>
                        Sí, ahí estaré
                      </button>
                      <button type="button" className="boton-secundario" disabled={responder.isPending} onClick={() => responder.mutate('otra_fecha')}>
                        No puedo, pedir otra fecha
                      </button>
                    </>
                  ) : p.entrevista.respuesta === 'confirmada' ? (
                    <p className="estado estado-exito" role="status">
                      Confirmaste tu asistencia. Te mandaremos un recordatorio neutro un día antes.
                    </p>
                  ) : (
                    <p className="estado estado-aviso" role="status">
                      Pediste otra fecha. La empresa te propondrá una nueva y te avisaremos aquí.
                    </p>
                  )}
                </div>
              )}

              {p.estado === 'aceptada' && (
                <p className="texto-suave">
                  {p.contactoEntregado
                    ? `Ya compartimos tu teléfono con ${p.empresa}. Te llamarán para acordar tu inicio.`
                    : 'Personal de la Secretaría te llamará antes de compartir tu teléfono con la empresa.'}
                </p>
              )}
              {(p.estado === 'no_seleccionada' || p.estado === 'retirada') && (
                <Link to="/u/empleo" className="boton-secundario">
                  Ver más vacantes
                </Link>
              )}

              {!FINALES.includes(p.estado) && (
                <button type="button" className="enlace-boton enlace-discreto" onClick={() => setRetirando(true)}>
                  Ya no me interesa esta vacante
                </button>
              )}
              <Dialogo abierto={retirando} titulo="¿Retirar tu postulación?" onCerrar={() => setRetirando(false)}>
                <p>La empresa ya no verá tu CV para este puesto. Podrás postularte a otras vacantes.</p>
                <div className="fila-botones">
                  <button type="button" className="boton-secundario" onClick={() => setRetirando(false)}>
                    No, mantener
                  </button>
                  <button type="button" className="boton" disabled={retirar.isPending} onClick={() => retirar.mutate(undefined, { onSuccess: () => setRetirando(false) })}>
                    Sí, retirar
                  </button>
                </div>
              </Dialogo>
            </>
          )
        }
      </Consulta>
    </section>
  )
}

// ---------------------------------------------------------------------
/** Resumen del CV como lo ve la empresa. */
export function ResumenCv({ cv, nombre }: { cv: Cv; nombre?: string }) {
  return (
    <dl className="datos">
      {nombre && (
        <>
          <dt>Nombre</dt>
          <dd>{nombre}</dd>
        </>
      )}
      <dt>Estudios</dt>
      <dd>{cv.escolaridad}</dd>
      <dt>Experiencia</dt>
      <dd>{cv.experiencia.length === 0 ? 'Primer empleo' : cv.experiencia.map((e) => `${e.puesto} (${e.tiempo.toLowerCase()})`).join(', ')}</dd>
      <dt>Sabe hacer</dt>
      <dd>{cv.habilidades.join(', ')}</dd>
      <dt>Horario</dt>
      <dd>{cv.horarios.join(', ')}</dd>
      <dt>Puede empezar</dt>
      <dd>{cv.inicio}</dd>
      {cv.sobreMi && (
        <>
          <dt>Sobre ella</dt>
          <dd>{cv.sobreMi}</dd>
        </>
      )}
    </dl>
  )
}

/** U-20 · Mi CV */
export function MiCvPage() {
  const q = useMiCv()
  return (
    <section className="pila">
      <Cabecera titulo="Mi CV" />
      <Aviso />
      <Consulta q={q}>
        {(cv) =>
          cv ? (
            <>
              <div className="tarjeta pila-corta">
                <ResumenCv cv={cv} />
                <p className="texto-suave nota">Actualizado el {fecha(cv.actualizado)}.</p>
              </div>
              <p className="texto-suave">Así lo ven las empresas. Nunca ven tu teléfono, tu CURP ni tu dirección.</p>
              <Link to="/u/empleo/cv/editar" className="boton-secundario">
                Editar mi CV
              </Link>
            </>
          ) : (
            <div className="tarjeta pila-corta centrada">
              <FileText size={36} aria-hidden="true" />
              <p className="dato-grande">Aún no tienes CV</p>
              <p className="texto-suave">Son 4 preguntas con opciones para tocar. No necesitas escribir mucho.</p>
              <Link to="/u/empleo/cv/editar" className="boton">
                Armar mi CV
              </Link>
            </div>
          )
        }
      </Consulta>
    </section>
  )
}

type Borrador = { escolaridad: Escolaridad | ''; trabajo: 'si' | 'no' | ''; experiencia: Experiencia[]; habilidades: string[]; otra: string; horarios: string[]; inicio: string; sobreMi: string }
const desdeCv = (cv: Cv | null | undefined): Borrador => ({
  escolaridad: cv?.escolaridad ?? '',
  trabajo: cv ? (cv.experiencia.length > 0 ? 'si' : 'no') : '',
  experiencia: cv?.experiencia.length ? cv.experiencia : [{ puesto: '', tiempo: TIEMPOS[0]! }],
  habilidades: cv?.habilidades ?? [],
  otra: '',
  horarios: cv?.horarios ?? [],
  inicio: cv?.inicio ?? INICIOS[0]!,
  sobreMi: cv?.sobreMi ?? '',
})

const TITULOS = ['¿Hasta dónde estudiaste?', '¿Has trabajado antes?', '¿Qué sabes hacer?', '¿Cuándo puedes trabajar?']

/** U-21 · Armar mi CV en 4 pasos. Con ?postular=<vacante> se postula al terminar. */
export function EditarCvPage() {
  const q = useMiCv()
  return <Consulta q={q}>{(cv) => <AsistenteCv inicial={desdeCv(cv)} />}</Consulta>
}

function AsistenteCv({ inicial }: { inicial: Borrador }) {
  const [paso, setPaso] = useState(0)
  const [b, setB] = useState<Borrador>(inicial)
  const [params] = useSearchParams()
  const postularA = params.get('postular')
  const guardar = useGuardarCv()
  const postular = usePostularme()
  const navegar = useNavigate()
  const ocupado = guardar.isPending || postular.isPending

  const experiencia = b.experiencia.filter((e) => e.puesto.trim())
  const habilidades = [...b.habilidades, ...(b.otra.trim() ? [b.otra.trim()] : [])]
  const listo = [b.escolaridad !== '', b.trabajo === 'no' || (b.trabajo === 'si' && experiencia.length > 0), habilidades.length > 0, b.horarios.length > 0][paso]

  const cambiarExp = (i: number, cambio: Partial<Experiencia>) => setB({ ...b, experiencia: b.experiencia.map((e, j) => (j === i ? { ...e, ...cambio } : e)) })

  const terminar = () => {
    const cv = {
      escolaridad: b.escolaridad as Escolaridad,
      experiencia: b.trabajo === 'si' ? experiencia.map((e) => ({ ...e, puesto: e.puesto.trim() })) : [],
      habilidades,
      horarios: b.horarios,
      inicio: b.inicio,
      sobreMi: b.sobreMi.trim() || undefined,
    }
    guardar.mutate(cv, {
      onSuccess: () => {
        if (!postularA) return navegar('/u/empleo/cv', { state: { aviso: 'Tu CV quedó guardado.' } })
        postular.mutate(postularA, {
          onSuccess: (p) => navegar(`/u/empleo/postulaciones/${p.id}`, { state: { aviso: 'Listo, tu CV quedó guardado y tu postulación se envió.' } }),
        })
      },
    })
  }

  return (
    <section className="pila">
      <Volver a={postularA ? `/u/empleo/${postularA}` : '/u/empleo/cv'} texto={postularA ? 'Vacante' : 'Mi CV'} />
      <div>
        <p className="etiqueta-peque">
          Mi CV · paso {paso + 1} de 4
        </p>
        <h1>{TITULOS[paso]}</h1>
      </div>
      <div className="barra-pista" aria-hidden="true">
        <div className="barra-relleno" style={{ width: `${((paso + 1) / 4) * 100}%` }} />
      </div>

      {paso === 0 && <OpcionesUnicas nombre="escolaridad" leyenda={<span className="sr-only">Último grado de estudios</span>} opciones={ESCOLARIDADES} valor={b.escolaridad} onCambio={(v) => setB({ ...b, escolaridad: v as Escolaridad })} />}

      {paso === 1 && (
        <>
          <fieldset className="grupo-opciones">
            <legend className="sr-only">¿Has trabajado antes?</legend>
            <label className="opcion">
              <input type="radio" name="trabajo" checked={b.trabajo === 'si'} onChange={() => setB({ ...b, trabajo: 'si' })} /> Sí
            </label>
            <label className="opcion">
              <input type="radio" name="trabajo" checked={b.trabajo === 'no'} onChange={() => setB({ ...b, trabajo: 'no' })} /> Aún no, sería mi primer empleo
            </label>
          </fieldset>
          {b.trabajo === 'si' && (
            <div className="pila-corta">
              {b.experiencia.map((e, i) => (
                <div key={i} className="tarjeta pila-corta">
                  <div className="campo">
                    <label htmlFor={`exp-${i}`}>¿En qué trabajaste?</label>
                    <input id={`exp-${i}`} value={e.puesto} onChange={(ev) => cambiarExp(i, { puesto: ev.target.value })} maxLength={60} placeholder="Ej. Ventas en tienda" />
                  </div>
                  <div className="campo">
                    <label htmlFor={`tiempo-${i}`}>¿Cuánto tiempo?</label>
                    <select id={`tiempo-${i}`} value={e.tiempo} onChange={(ev) => cambiarExp(i, { tiempo: ev.target.value })}>
                      {TIEMPOS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {b.experiencia.length > 1 && (
                    <button type="button" className="enlace-boton enlace-discreto" onClick={() => setB({ ...b, experiencia: b.experiencia.filter((_, j) => j !== i) })}>
                      <Trash2 size={16} aria-hidden="true" /> Quitar
                    </button>
                  )}
                </div>
              ))}
              {b.experiencia.length < 3 && (
                <button type="button" className="boton-secundario" onClick={() => setB({ ...b, experiencia: [...b.experiencia, { puesto: '', tiempo: TIEMPOS[0]! }] })}>
                  <Plus size={18} aria-hidden="true" /> Agregar otro trabajo
                </button>
              )}
              <p className="texto-suave nota">También cuenta lo informal: vender por catálogo, cuidar niños, ayudar en un negocio familiar.</p>
            </div>
          )}
        </>
      )}

      {paso === 2 && (
        <>
          <p className="texto-suave">Toca todas las que apliquen.</p>
          <OpcionesMultiples etiqueta="Habilidades" opciones={HABILIDADES} valor={b.habilidades} onCambio={(v) => setB({ ...b, habilidades: v })} />
          <div className="campo">
            <label htmlFor="otra">¿Algo más? (opcional)</label>
            <input id="otra" value={b.otra} onChange={(e) => setB({ ...b, otra: e.target.value })} maxLength={40} />
          </div>
        </>
      )}

      {paso === 3 && (
        <>
          <p className="texto-suave">Horarios en los que puedes trabajar:</p>
          <OpcionesMultiples etiqueta="Horarios" opciones={OPCIONES_VACANTE.horario} valor={b.horarios} onCambio={(v) => setB({ ...b, horarios: v })} />
          <OpcionesUnicas nombre="inicio" leyenda="¿Cuándo podrías empezar?" opciones={INICIOS} valor={b.inicio} onCambio={(v) => setB({ ...b, inicio: v })} />
          <div className="campo">
            <label htmlFor="sobre">Algo sobre ti (opcional)</label>
            <input id="sobre" value={b.sobreMi} onChange={(e) => setB({ ...b, sobreMi: e.target.value })} maxLength={140} placeholder="Ej. Soy puntual y aprendo rápido" />
          </div>
        </>
      )}

      {(guardar.isError || postular.isError) && (
        <p className="texto-error" role="alert">
          No se pudo guardar. Intenta de nuevo.
        </p>
      )}
      <div className="fila-botones">
        {paso > 0 && (
          <button type="button" className="boton-secundario" onClick={() => setPaso(paso - 1)}>
            Atrás
          </button>
        )}
        {paso < 3 ? (
          <button type="button" className="boton" disabled={!listo} onClick={() => setPaso(paso + 1)}>
            Siguiente
          </button>
        ) : (
          <button type="button" className="boton" disabled={!listo || ocupado} onClick={terminar}>
            {ocupado ? 'Guardando…' : postularA ? 'Guardar y postularme' : 'Guardar mi CV'}
          </button>
        )}
      </div>
    </section>
  )
}
