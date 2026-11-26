import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Check } from 'lucide-react'
import {
  OPCIONES_VACANTE,
  TIPOS_EVENTO,
  fechaLarga,
  hora12,
  partesFecha,
  useCurso,
  useCursos,
  useInscribirme,
  usePostularme,
  useVacante,
  useVacantes,
  type Curso,
  type FiltrosVacantes,
  type TipoEvento,
} from '@/features/capacitacion/api'
import { Consulta } from '@/shared/ui/Estados'
import { Segmentos } from '@/shared/ui/Pestanas'

export function EtiquetaEvento({ tipo }: { tipo: TipoEvento }) {
  const t = TIPOS_EVENTO.find((x) => x.valor === tipo)!
  return <span className={`etiqueta ${t.clase}`}>{t.texto}</span>
}

export function TarjetaEvento({ c, a, accion }: { c: Curso; a: string; accion?: React.ReactNode }) {
  const f = partesFecha(c.fecha)
  return (
    <li className="tarjeta evento">
      <div className="evento-fecha" aria-hidden="true">
        <span className="cifra">{f.dia}</span>
        <span>{f.mes}</span>
      </div>
      <div className="evento-cuerpo">
        <EtiquetaEvento tipo={c.tipo} />
        <h3>
          <Link to={a}>{c.titulo}</Link>
        </h3>
        <p className="texto-suave">
          {hora12(c.hora)} · {c.lugar}
        </p>
        {accion}
      </div>
    </li>
  )
}

function Volver({ a, texto }: { a: string; texto: string }) {
  return (
    <Link to={a} className="enlace-volver">
      <ArrowLeft size={18} aria-hidden="true" /> {texto}
    </Link>
  )
}

const FILTRO_TIPOS = [{ valor: 'todos' as const, texto: 'Todos' }, ...TIPOS_EVENTO.map((t) => ({ valor: t.valor, texto: `${t.texto}s` }))]

/** U-10 · Cursos y charlas */
export function ForoPage() {
  const [tipo, setTipo] = useState<'todos' | TipoEvento>('todos')
  const q = useCursos(tipo === 'todos' ? undefined : tipo)
  return (
    <section className="pila">
      <div>
        <p className="etiqueta-peque">Foro</p>
        <h1>Cursos, charlas y conferencias</h1>
      </div>
      <Segmentos opciones={FILTRO_TIPOS} valor={tipo} onCambio={setTipo} etiqueta="Tipo de evento" />
      <Consulta q={q} vacio="Por ahora no hay eventos de este tipo.">
        {(cursos) => (
          <ul className="lista-eventos">
            {cursos.map((c) => (
              <TarjetaEvento
                key={c.id}
                c={c}
                a={`/u/foro/${c.id}`}
                accion={
                  c.inscrita ? (
                    <span className="etiqueta etiqueta-capacitacion">
                      <Check size={14} aria-hidden="true" /> Inscrita
                    </span>
                  ) : (
                    <Link to={`/u/foro/${c.id}`} className="boton boton-chico">
                      Ver e inscribirme
                    </Link>
                  )
                }
              />
            ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

/** U-11 · Detalle del curso */
export function DetalleCursoPage() {
  const { cursoId = '' } = useParams()
  const q = useCurso(cursoId)
  const inscribir = useInscribirme()
  return (
    <section className="pila">
      <Volver a="/u/foro" texto="Foro" />
      <Consulta q={q} vacio="Este evento ya no está disponible." esVacio={(c) => c === null}>
        {(c) =>
          c && (
            <>
              <EtiquetaEvento tipo={c.tipo} />
              <h1>{c.titulo}</h1>
              <dl className="datos">
                <dt>Cuándo</dt>
                <dd>
                  {fechaLarga(c.fecha)}, {hora12(c.hora)}
                </dd>
                <dt>Dónde</dt>
                <dd>{c.lugar}</dd>
                <dt>Lugares</dt>
                <dd>{Math.max(0, c.cupo - c.inscritas)} disponibles</dd>
              </dl>
              <p>{c.descripcion}</p>
              {c.inscrita ? (
                <p className="estado estado-exito" role="status">
                  Ya estás inscrita. Te mandaremos un recordatorio neutro un día antes.
                </p>
              ) : c.inscritas >= c.cupo ? (
                <p className="estado estado-aviso">El cupo está lleno.</p>
              ) : (
                <button type="button" className="boton" disabled={inscribir.isPending} onClick={() => inscribir.mutate(c.id)}>
                  Inscribirme
                </button>
              )}
            </>
          )
        }
      </Consulta>
    </section>
  )
}

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
      <div>
        <p className="etiqueta-peque">Empleo</p>
        <h1>Bolsa de trabajo</h1>
        <p className="texto-suave">Vacantes de empresas aliadas. La Secretaría te acompaña en la postulación.</p>
      </div>
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
          <>
            <ul className="lista-simple pila-corta">
              {vacantes.map((v) => (
                <li key={v.id} className="tarjeta vacante">
                  <h3>
                    <Link to={`/u/empleo/${v.id}`}>{v.puesto}</Link>
                  </h3>
                  <p className="texto-suave">
                    {v.empresa} · {v.ubicacion}
                  </p>
                  <p className="chips">
                    <span className="chip">{v.horario}</span>
                    <span className="chip">{v.tipoEmpleo}</span>
                    <span className="chip">{v.sector}</span>
                  </p>
                  {v.postulada && <span className="etiqueta etiqueta-capacitacion">Postulada</span>}
                </li>
              ))}
            </ul>
            <p className="texto-suave nota">Actualizada el {vacantes[0] && fechaLarga(vacantes.map((v) => v.actualizada).sort().at(-1)!)}.</p>
          </>
        )}
      </Consulta>
    </section>
  )
}

/** U-13 · Detalle de vacante */
export function DetalleVacantePage() {
  const { vacanteId = '' } = useParams()
  const q = useVacante(vacanteId)
  const postular = usePostularme()
  return (
    <section className="pila">
      <Volver a="/u/empleo" texto="Bolsa de trabajo" />
      <Consulta q={q} vacio="Esta vacante ya no está disponible." esVacio={(v) => v === null}>
        {(v) =>
          v && (
            <>
              <h1>{v.puesto}</h1>
              <p className="texto-suave">{v.empresa}</p>
              <p className="chips">
                <span className="chip">{v.horario}</span>
                <span className="chip">{v.tipoEmpleo}</span>
                <span className="chip">{v.ubicacion}</span>
              </p>
              <p>{v.descripcion}</p>
              <h2 className="subtitulo">Requisitos</h2>
              <ul>
                {v.requisitos.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {v.postulada ? (
                <p className="estado estado-exito" role="status">
                  Listo. Personal de la Secretaría te contactará para el siguiente paso.
                </p>
              ) : (
                <button type="button" className="boton" disabled={postular.isPending} onClick={() => postular.mutate(v.id)}>
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
