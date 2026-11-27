import { useCallback, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { BriefcaseBusiness, CalendarDays, HandHeart, House, LogOut, UserRound } from 'lucide-react'
import { quickExit } from '@/features/ayuda/quickExit'
import { useQuickExitShortcut } from '@/features/ayuda/useQuickExitShortcut'
import { useCerrarSesionUsuaria } from '@/features/identidad/api'
import { useSesion } from '@/features/identidad/sesion'
import { Cargando } from '@/shared/ui/Estados'

/** Destino de «Salir» en el portal: una búsqueda neutra en Wikipedia. replace() evita volver con «atrás». */
export const SALIDA_PORTAL = 'https://es.wikipedia.org/w/index.php?search=M%C3%A9xico&fulltext=1'
/** La salida es rápida: si el servidor tarda, no se espera más que esto para irse. */
const ESPERA_LOGOUT_MS = 1500

const MENU = [
  { to: '/u/inicio', texto: 'Inicio', icono: House },
  { to: '/u/foro', texto: 'Foro', icono: CalendarDays },
  { to: '/u/empleo', texto: 'Empleo', icono: BriefcaseBusiness },
  { to: '/u/perfil', texto: 'Perfil', icono: UserRound },
]

/** Marco del portal de usuarias: primero celular (360 px), texto de 17 px, Salir siempre visible. */
export function PortalLayout({ children }: { children?: ReactNode }) {
  const { usuaria, cerrar } = useSesion()
  const { mutateAsync: cerrarSesion } = useCerrarSesionUsuaria()
  // Con sesión, «Salir» la cierra en el backend (POST /portal/auth/logout) y luego sale.
  const salir = useCallback(() => {
    if (!usuaria) return quickExit(SALIDA_PORTAL)
    const espera = new Promise((listo) => setTimeout(listo, ESPERA_LOGOUT_MS))
    void Promise.race([cerrarSesion().catch(() => undefined), espera]).then(() => {
      cerrar()
      quickExit(SALIDA_PORTAL)
    })
  }, [usuaria, cerrar, cerrarSesion])
  useQuickExitShortcut(salir)
  const { pathname } = useLocation()
  const enAyuda = pathname.startsWith('/u/ayuda')
  const mostrarFlotante = usuaria && !enAyuda && pathname !== '/u/inicio'

  return (
    <div className="portal">
      <header className="portal-barra">
        <Link to={usuaria ? '/u/inicio' : '/u'} className="marca" aria-label="Inicio">
          SAI
        </Link>
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
  const { usuaria, cargandoSesion } = useSesion()
  if (cargandoSesion) return <Cargando />
  if (!usuaria) return <Navigate to="/u/entrar" replace />
  return <Outlet />
}
