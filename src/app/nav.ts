import { House, FolderOpen, UserPlus, ArrowRightLeft, ScrollText, ChartColumn, Settings, Phone } from 'lucide-react'

export const NAV = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/expedientes', label: 'Expedientes', icon: FolderOpen },
  { to: '/expedientes/nuevo', label: 'Nuevo', icon: UserPlus },
  { to: '/canalizaciones', label: 'Canalizaciones', icon: ArrowRightLeft },
  { to: '/bitacora', label: 'Bitácora', icon: ScrollText },
  { to: '/tablero', label: 'Tablero', icon: ChartColumn },
  { to: '/administracion', label: 'Personal', icon: Settings },
  { to: '/ayuda', label: 'Ayuda', icon: Phone },
]