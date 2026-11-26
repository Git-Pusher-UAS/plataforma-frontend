import {
  House,
  FolderOpen,
  UserPlus,
  ArrowRightLeft,
  ScrollText,
  ChartColumn,
  Map as MapIcon,
  Settings,
  Phone,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ElementoNav = {
  to: string
  label: string
  icon: LucideIcon
  /**
   * Posición en la barra inferior del celular (1 = izquierda, 2 = centro, 3 = derecha).
   * Si falta, la opción solo aparece en el menú lateral.
   */
  inferior?: 1 | 2 | 3
}

export const NAV: ElementoNav[] = [
  { to: '/', label: 'Inicio', icon: House, inferior: 1 },
  { to: '/expedientes', label: 'Expedientes', icon: FolderOpen },
  { to: '/expedientes/nuevo', label: 'Nuevo', icon: UserPlus },
  { to: '/canalizaciones', label: 'Canalizaciones', icon: ArrowRightLeft },
  { to: '/bitacora', label: 'Bitácora', icon: ScrollText },
  { to: '/tablero', label: 'Tablero', icon: ChartColumn },
  { to: '/analitica/mapa', label: 'Mapa de calor', icon: MapIcon, inferior: 2 },
  { to: '/administracion', label: 'Personal', icon: Settings },
  { to: '/ayuda', label: 'Ayuda', icon: Phone, inferior: 3 },
]

/** Las opciones de la barra inferior, ordenadas de izquierda a derecha. */
export const BARRA_INFERIOR = NAV.filter((n) => n.inferior).sort(
  (a, b) => (a.inferior ?? 0) - (b.inferior ?? 0),
)