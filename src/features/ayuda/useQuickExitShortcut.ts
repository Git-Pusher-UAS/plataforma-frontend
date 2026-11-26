import { useEffect } from 'react'
import { QUICK_EXIT_ESC_WINDOW_MS } from '@/features/ayuda/config'
import { quickExit } from '@/features/ayuda/quickExit'

/** Activa la salida rápida al pulsar Esc dos veces seguidas. */
export function useQuickExitShortcut(onExit: () => void = quickExit): void {
  useEffect(() => {
    let last = 0
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const now = Date.now()
      if (now - last <= QUICK_EXIT_ESC_WINDOW_MS) {
        last = 0
        onExit()
      } else {
        last = now
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onExit])
}
