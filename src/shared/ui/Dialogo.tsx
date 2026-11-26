import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Diálogo modal nativo: atrapa el foco, se cierra con Esc y devuelve el foco al cerrar. */
export function Dialogo({
  abierto,
  titulo,
  onCerrar,
  children,
}: {
  abierto: boolean
  titulo: string
  onCerrar: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    }
    if (!abierto && d.open) {
      if (typeof d.close === 'function') d.close()
      else d.removeAttribute('open')
    }
  }, [abierto])

  // Se monta en <body> para no heredar estilos del lugar donde se abre (por ejemplo, la barra superior).
  return createPortal(
    <dialog ref={ref} className="dialogo" aria-labelledby={id} onClose={onCerrar} onCancel={onCerrar}>
      {abierto && (
        <>
          <div className="dialogo-cabeza">
            <h2 id={id}>{titulo}</h2>
            <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>,
    document.body,
  )
}
