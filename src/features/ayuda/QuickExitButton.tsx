import { LogOut } from 'lucide-react'
import { quickExit } from '@/features/ayuda/quickExit'
import { useQuickExitShortcut } from '@/features/ayuda/useQuickExitShortcut'

export function QuickExitButton() {
  useQuickExitShortcut(quickExit)
  return (
    <button type="button" onClick={() => quickExit()} aria-label="Salida rápida">
      <LogOut size={18} aria-hidden="true" /> Salir
    </button>
  )
}
