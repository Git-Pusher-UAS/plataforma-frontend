import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { ApiError } from '@/api/client'
import { ESCALA_POR_DEFECTO, useEncuesta, useEncuestasPendientes, useResponderEncuesta, type RespuestaValor } from '@/features/encuestas/api'
import { Consulta } from '@/shared/ui/Estados'

/** U-14 · Pendientes (encuestas). Redacción neutra. */
export function PendientesUsuariaPage() {
  const q = useEncuestasPendientes()
  return (
    <section className="pila">
      <Link to="/u/inicio" className="enlace-volver">
        <ArrowLeft size={18} aria-hidden="true" /> Inicio
      </Link>
      <div>
        <p className="etiqueta-peque">Pendientes</p>
        <h1>Tus pendientes</h1>
        <p className="texto-suave">Cuando puedas, contesta. Son breves y puedes dejarlas para después.</p>
      </div>
      <Consulta q={q} vacio="No tienes pendientes. ¡Gracias!">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((e) => (
              <li key={e.id} className="tarjeta fila-accion">
                <div>
                  <h3>{e.titulo}</h3>
                  <p className="texto-suave">
                    {e.preguntas.length} preguntas · {e.minutos} min
                  </p>
                </div>
                <Link to={`/u/pendientes/${e.id}`} className="boton boton-chico">
                  Contestar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

/** U-15 · Pregunta: una por pantalla, con avance visible. */
export function PreguntaPage() {
  const { encuestaId = '' } = useParams()
  const q = useEncuesta(encuestaId)
  const responder = useResponderEncuesta()
  const navegar = useNavigate()
  const [paso, setPaso] = useState(0)
  const [resp, setResp] = useState<Record<string, string>>({})

  return (
    <Consulta q={q} vacio="Esta encuesta ya no está disponible." esVacio={(e) => e === null}>
      {(e) => {
        if (!e) return null
        if (e.preguntas.length === 0) {
          return (
            <section className="pila">
              <p className="texto-suave">Esta encuesta no tiene preguntas disponibles.</p>
              <Link to="/u/pendientes" className="enlace-discreto">
                Volver a pendientes
              </Link>
            </section>
          )
        }
        const indice = Math.min(paso, e.preguntas.length - 1)
        const p = e.preguntas[indice]!
        const ultima = indice === e.preguntas.length - 1
        const valor = resp[p.id] ?? ''
        const opciones = p.tipo === 'escala' && (!p.opciones || p.opciones.length === 0) ? ESCALA_POR_DEFECTO : (p.opciones ?? [])

        const construirRespuestas = (): Record<string, RespuestaValor> => {
          const salida: Record<string, RespuestaValor> = {}
          for (const pregunta of e.preguntas) {
            const raw = resp[pregunta.id]
            if (raw === undefined) continue
            if (pregunta.tipo === 'escala') {
              if (raw === '') continue
              const n = Number(raw)
              if (Number.isFinite(n)) salida[pregunta.id] = n
            } else if (pregunta.tipo === 'abierta') {
              const limpio = raw.trim()
              if (limpio !== '') salida[pregunta.id] = limpio
            } else if (raw !== '') {
              salida[pregunta.id] = raw
            }
          }
          return salida
        }

        const siguiente = () => {
          if (!ultima) return setPaso(indice + 1)
          responder.mutate({ id: e.id, respuestas: construirRespuestas() }, { onSuccess: () => navegar('/u/pendientes', { replace: true }) })
        }

        return (
          <section className="pila">
            <p className="etiqueta-peque">
              Pregunta {indice + 1} de {e.preguntas.length}
            </p>
            <progress className="avance" max={e.preguntas.length} value={indice + 1} aria-label="Avance" />
            <fieldset className="opciones">
              <legend className="pregunta">{p.texto}</legend>
              {p.tipo === 'abierta' ? (
                <textarea className="area" rows={4} maxLength={1000} value={valor} onChange={(ev) => setResp({ ...resp, [p.id]: ev.target.value })} aria-label="Tu respuesta" />
              ) : (
                <div className={p.tipo === 'escala' ? 'escala' : 'pila-corta'}>
                  {opciones.map((o) => (
                    <label key={o} className={p.tipo === 'escala' ? 'escala-opcion' : 'opcion'}>
                      <input type="radio" name={p.id} value={o} checked={valor === o} onChange={() => setResp({ ...resp, [p.id]: o })} /> {o}
                    </label>
                  ))}
                </div>
              )}
              {p.tipo === 'escala' && opciones.length >= 2 && (
                <p className="texto-suave escala-leyenda">
                  <span>{opciones[0]} · Nada</span>
                  <span>{opciones[opciones.length - 1]} · Mucho</span>
                </p>
              )}
            </fieldset>
            {responder.isError && (
              <p className="texto-error" role="alert">
                {responder.error instanceof ApiError && responder.error.status === 409
                  ? 'Esta encuesta ya fue contestada.'
                  : 'No pudimos enviar tus respuestas. Intenta de nuevo.'}
              </p>
            )}
            <button type="button" className="boton" onClick={siguiente} disabled={(p.tipo !== 'abierta' && !valor) || responder.isPending}>
              {ultima ? (responder.isPending ? 'Enviando…' : 'Enviar') : 'Siguiente'}
            </button>
            {indice > 0 && (
              <button type="button" className="boton-secundario" onClick={() => setPaso(indice - 1)}>
                Anterior
              </button>
            )}
            <Link to="/u/pendientes" className="enlace-discreto">
              Contestar después
            </Link>
          </section>
        )
      }}
    </Consulta>
  )
}
