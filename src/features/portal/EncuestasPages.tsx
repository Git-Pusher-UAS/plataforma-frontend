import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useEncuesta, useEncuestasPendientes, useResponderEncuesta } from '@/features/encuestas/api'
import { Consulta } from '@/shared/ui/Estados'

/** U-14 · Pendientes (encuestas). Redacción neutra. */
export function PendientesUsuariaPage() {
  const q = useEncuestasPendientes()
  return (
    <section className="pila">
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
        const p = e.preguntas[paso]!
        const ultima = paso === e.preguntas.length - 1
        const valor = resp[p.id] ?? ''
        const siguiente = () => {
          if (!ultima) return setPaso(paso + 1)
          responder.mutate({ id: e.id, respuestas: resp }, { onSuccess: () => navegar('/u/pendientes', { replace: true }) })
        }
        return (
          <section className="pila">
            <p className="etiqueta-peque">
              Pregunta {paso + 1} de {e.preguntas.length}
            </p>
            <progress className="avance" max={e.preguntas.length} value={paso + 1} aria-label="Avance" />
            <fieldset className="opciones">
              <legend className="pregunta">{p.texto}</legend>
              {p.tipo === 'abierta' ? (
                <textarea className="area" rows={4} maxLength={1000} value={valor} onChange={(ev) => setResp({ ...resp, [p.id]: ev.target.value })} aria-label="Tu respuesta" />
              ) : (
                <div className={p.tipo === 'escala' ? 'escala' : 'pila-corta'}>
                  {p.opciones?.map((o) => (
                    <label key={o} className={p.tipo === 'escala' ? 'escala-opcion' : 'opcion'}>
                      <input type="radio" name={p.id} value={o} checked={valor === o} onChange={() => setResp({ ...resp, [p.id]: o })} /> {o}
                    </label>
                  ))}
                </div>
              )}
              {p.tipo === 'escala' && <p className="texto-suave escala-leyenda"><span>1 · Nada</span><span>5 · Mucho</span></p>}
            </fieldset>
            <button type="button" className="boton" onClick={siguiente} disabled={(p.tipo !== 'abierta' && !valor) || responder.isPending}>
              {ultima ? 'Enviar' : 'Siguiente'}
            </button>
            {paso > 0 && (
              <button type="button" className="boton-secundario" onClick={() => setPaso(paso - 1)}>
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
