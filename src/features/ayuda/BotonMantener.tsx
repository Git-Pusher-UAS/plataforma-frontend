import { useEffect, useRef, useState } from 'react'

export const MANTENER_MS = 2000

/**
 * Botón que se activa al mantenerlo presionado 2 segundos, con anillo de progreso y
 * vibración. Para quien no puede mantener presionado, Enter o Espacio sostenidos también
 * cuentan, y se ofrece un botón alternativo de confirmación (ver PantallaMantener).
 */
export function BotonMantener({
  texto,
  onActivar,
  className = 'boton-ayuda boton-mantener',
}: {
  texto: string
  onActivar: () => void
  className?: string
}) {
  const [progreso, setProgreso] = useState(0)
  const inicio = useRef<number | null>(null)
  const cuadro = useRef<number | null>(null)

  const detener = () => {
    inicio.current = null
    if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)
    cuadro.current = null
    setProgreso(0)
  }

  const avanzar = (t: number) => {
    if (inicio.current === null) return
    const p = Math.min(1, (t - inicio.current) / MANTENER_MS)
    setProgreso(p)
    if (p >= 1) {
      detener()
      navigator.vibrate?.(80)
      onActivar()
      return
    }
    cuadro.current = requestAnimationFrame(avanzar)
  }

  const empezar = () => {
    if (inicio.current !== null) return
    inicio.current = performance.now()
    navigator.vibrate?.(20)
    cuadro.current = requestAnimationFrame(avanzar)
  }

  useEffect(() => detener, [])

  return (
    <button
      type="button"
      className={className}
      aria-describedby="mantener-ayuda"
      onPointerDown={empezar}
      onPointerUp={detener}
      onPointerLeave={detener}
      onPointerCancel={detener}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          empezar()
        }
      }}
      onKeyUp={detener}
      onContextMenu={(e) => e.preventDefault()}
      style={{ ['--progreso' as string]: `${progreso * 360}deg` }}
    >
      <span className="anillo" aria-hidden="true" />
      <span>{texto}</span>
      <span id="mantener-ayuda" className="sr-only">
        Mantén presionado 2 segundos para activar.
      </span>
    </button>
  )
}
