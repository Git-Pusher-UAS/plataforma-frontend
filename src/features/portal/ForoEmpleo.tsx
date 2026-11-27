import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Check } from 'lucide-react'
import {
  TIPOS_EVENTO,
  fechaLarga,
  hora12,
  partesFecha,
  useCurso,
  useCursos,
  useInscribirme,
  type Curso,
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
