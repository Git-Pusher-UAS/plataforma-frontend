import { quickExit } from '@/features/ayuda/quickExit'
import { useQuickExitShortcut } from '@/features/ayuda/useQuickExitShortcut'

export function QuickExitButton() {
  useQuickExitShortcut(quickExit)
  return (
    <button type="button" onClick={() => quickExit()} aria-label="Salida rápida">
      Salir
    </button>
  )
}
