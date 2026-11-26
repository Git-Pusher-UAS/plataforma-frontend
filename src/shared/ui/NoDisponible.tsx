import { Link } from 'react-router'

/** P-90 · Recurso no disponible. Mismo texto para lo ajeno y lo inexistente (no se distinguen). */
export function NoDisponible() {
  return (
    <section className="pila centrada no-disponible">
      <h1>Recurso no disponible</h1>
      <p className="texto-suave">No encontramos lo que buscas o no está disponible para tu cuenta.</p>
      <Link to="/" className="boton">
        Ir al inicio
      </Link>
    </section>
  )
}
