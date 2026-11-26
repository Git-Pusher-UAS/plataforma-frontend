import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ApiError } from '@/api/client'

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p className="cargando" role="status" aria-live="polite">
      {texto}
    </p>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio texto-suave">{children}</p>
}

export function ErrorCarga({ error }: { error: unknown }) {
  const id = error instanceof ApiError ? error.correlationId : undefined
  return (
    <p className="estado estado-urgente" role="alert">
      No se pudo cargar la información. Intenta de nuevo en un momento.
      {id && <span className="texto-suave"> Folio para soporte: {id}</span>}
    </p>
  )
}

/** Resuelve los estados comunes de una consulta: cargando, error y vacío. */
export function Consulta<T>({
  q,
  vacio,
  esVacio = (d) => Array.isArray(d) && d.length === 0,
  children,
}: {
  q: UseQueryResult<T>
  vacio?: ReactNode
  esVacio?: (d: T) => boolean
  children: (datos: T) => ReactNode
}) {
  if (q.isPending) return <Cargando />
  if (q.isError) return <ErrorCarga error={q.error} />
  if (vacio && esVacio(q.data)) return <Vacio>{vacio}</Vacio>
  return <>{children(q.data)}</>
}
