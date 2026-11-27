import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { BriefcaseBusiness, CalendarDays, HandHeart, House, LogOut, UserRound } from 'lucide-react'
import { quickExit } from '@/features/ayuda/quickExit'
import { useQuickExitShortcut } from '@/features/ayuda/useQuickExitShortcut'
import { useSesion } from '@/features/identidad/sesion'
import { Logo } from '@/shared/ui/Logo'

/** Destino de «Salir» en el portal: U-17, página neutra. replace() evita volver con «atrás». */
export const SALIDA_PORTAL = '/recetas'
const salir = () => quickExit(SALIDA_PORTAL)

const MENU = [
  { to: '/u/inicio', texto: 'Inicio', icono: House },
  { to: '/u/foro', texto: 'Foro', icono: CalendarDays },
  { to: '/u/empleo', texto: 'Empleo', icono: BriefcaseBusiness },
  { to: '/u/perfil', texto: 'Perfil', icono: UserRound },
]

/** Marco del portal de usuarias: primero celular (360 px), texto de 17 px, Salir siempre visible. */
export function PortalLayout({ children }: { children?: ReactNode }) {
  useQuickExitShortcut(salir)
  const { usuaria } = useSesion()
  const { pathname } = useLocation()
  const enAyuda = pathname.startsWith('/u/ayuda')
  const mostrarFlotante = usuaria && !enAyuda && pathname !== '/u/inicio'

  return (
    <div className="portal">
      <header className="portal-barra">
        <span className="marca-grupo">
          <Logo />
          <Link to={usuaria ? '/u/inicio' : '/u'} className="marca" aria-label="Inicio">
            SAI
          </Link>
        </span>
        <button type="button" className="boton-salir" onClick={salir} aria-label="Salida rápida">
          <LogOut size={18} aria-hidden="true" /> Salir
        </button>
      </header>
      <main className="portal-pagina">
        {children ?? <Outlet />}
      </main>
      {mostrarFlotante && (
        <Link to="/u/ayuda" className="ayuda-flotante" aria-label="Necesito ayuda">
          <HandHeart size={28} aria-hidden="true" />
        </Link>
      )}
      {usuaria && !enAyuda && (
        <nav className="portal-menu" aria-label="Portal">
          {MENU.map(({ to, texto, icono: Icono }) => (
            <NavLink key={to} to={to} className="portal-menu-item">
              <Icono size={22} aria-hidden="true" />
              <span>{texto}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

/** Protege las pantallas que necesitan sesión de usuaria. */
export function RequiereUsuaria() {
  const { usuaria } = useSesion()
  if (!usuaria) return <Navigate to="/u/entrar" replace />
  return <Outlet />
}
