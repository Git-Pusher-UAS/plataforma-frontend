import type { ReactNode } from 'react'

export function Encabezado({
  antetitulo,
  titulo,
  children,
  acciones,
}: {
  antetitulo?: string
  titulo: string
  children?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <header className="encabezado">
      <div>
        {antetitulo && <p className="etiqueta-peque">{antetitulo}</p>}
        <h1>{titulo}</h1>
        {children && <p className="texto-suave encabezado-texto">{children}</p>}
      </div>
      {acciones && <div className="encabezado-acciones">{acciones}</div>}
    </header>
  )
}
