import { useRegisterSW } from 'virtual:pwa-register/react'

// Anuncia que hay una versión nueva y la aplica solo cuando la persona lo confirma.
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div className="aviso" role="status">
      <span>Hay una actualización disponible.</span>
      <span>
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </button>{' '}
        <button type="button" onClick={() => setNeedRefresh(false)}>
          Después
        </button>
      </span>
    </div>
  )
}
