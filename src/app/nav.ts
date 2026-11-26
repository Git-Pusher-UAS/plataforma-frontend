import {
  ArrowRightLeft,
  BriefcaseBusiness,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FolderOpen,
  House,
  Inbox,
  Map as MapIcon,
  MapPinned,
  MessageSquareHeart,
  Phone,
  ScrollText,
  UserPlus,
  UserRound,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import type { Rol } from '@/features/identidad/sesion'

export type ItemMenu = {
  to: string
  label: string
  icon: LucideIcon
  /**
   * Posición en la barra inferior del celular (1 = izquierda, 2 = centro, 3 = derecha).
   * Si falta, la opción solo aparece en el menú lateral.
   */
  inferior?: 1 | 2 | 3
}

const INICIO: ItemMenu = { to: '/', label: 'Inicio', icon: House, inferior: 1 }
const CUENTA: ItemMenu = { to: '/cuenta', label: 'Mi cuenta', icon: UserRound }
const AYUDA: ItemMenu = { to: '/ayuda', label: 'Ayuda', icon: Phone, inferior: 3 }

const ATENCION: ItemMenu[] = [
  INICIO,
  { to: '/expedientes', label: 'Expedientes', icon: FolderOpen, inferior: 2 },
  { to: '/canalizaciones', label: 'Canalizaciones', icon: ArrowRightLeft },
  { to: '/pendientes', label: 'Pendientes', icon: WifiOff },
  AYUDA,
  CUENTA,
]

// El menú se deriva del rol, pero quien autoriza es siempre el servidor.
export const MENU_POR_ROL: Record<Rol, ItemMenu[]> = {
  'trabajo-social': [ATENCION[0]!, ATENCION[1]!, { to: '/expedientes/nuevo', label: 'Nuevo', icon: UserPlus }, ...ATENCION.slice(2)],
  psicologia: ATENCION,
  juridico: ATENCION,
  capacitacion: [
    INICIO,
    { to: '/capacitacion/cursos', label: 'Cursos y charlas', icon: CalendarDays, inferior: 2 },
    { to: '/capacitacion/calendario', label: 'Calendario', icon: ClipboardList },
    { to: '/capacitacion/visitas', label: 'Visitas', icon: MapPinned },
    { to: '/capacitacion/bolsa', label: 'Bolsa de trabajo', icon: BriefcaseBusiness },
    AYUDA,
    CUENTA,
  ],
  administracion: [
    INICIO,
    { to: '/administracion/reportes', label: 'Reportes', icon: ChartColumn },
    { to: '/administracion/mapa', label: 'Mapa de calor', icon: MapIcon, inferior: 2 },
    { to: '/administracion/solicitudes', label: 'Solicitudes', icon: Inbox },
    { to: '/administracion/bitacora', label: 'Bitácora', icon: ScrollText },
    { to: '/administracion/personal', label: 'Personal', icon: Users },
    { to: '/administracion/opinion', label: 'Opinión', icon: MessageSquareHeart },
    AYUDA,
    CUENTA,
  ],
}

/** Las opciones de la barra inferior del celular, de izquierda a derecha. */
export const barraInferior = (items: ItemMenu[]) => items.filter((n) => n.inferior).sort((a, b) => (a.inferior ?? 0) - (b.inferior ?? 0))
