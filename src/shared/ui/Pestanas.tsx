import { NavLink } from 'react-router'

export type Pestana = { to: string; texto: string; fin?: boolean }

/** Pestañas como enlaces: cada una tiene su ruta, así se pueden compartir y usar "atrás". */
export function Pestanas({ items, etiqueta }: { items: Pestana[]; etiqueta: string }) {
  return (
    <nav className="pestanas" aria-label={etiqueta}>
      {items.map((p) => (
        <NavLink key={p.to} to={p.to} end={p.fin ?? true} className="pestana">
          {p.texto}
        </NavLink>
      ))}
    </nav>
  )
}

/** Selector segmentado con botones (filtros dentro de una misma pantalla). */
export function Segmentos<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onCambio: (v: T) => void
  etiqueta: string
}) {
  return (
    <div className="mapa-vistas segmentos" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => onCambio(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}
