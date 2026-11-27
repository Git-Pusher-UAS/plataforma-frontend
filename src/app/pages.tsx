import { Navigate, Outlet } from 'react-router'
import { Layout } from '@/app/Layout'
import { InicioAdministracionPage } from '@/features/administracion/pages'
import { InicioCapacitacionPage } from '@/features/capacitacion/pages'
import { InicioAtencionPage } from '@/features/expedientes/Borradores'
import { useSesion, type Rol } from '@/features/identidad/sesion'
import { BienvenidaPage } from '@/features/portal/AccesoUsuaria'
import { PortalLayout } from '@/features/portal/PortalLayout'
import { esMovil } from '@/shared/lib/dispositivo'
import { NoDisponible } from '@/shared/ui/NoDisponible'

/**
 * Raíz `/`, punto de entrada. Con sesión de personal: su panel.
 * Sin sesión, según el dispositivo (cabeceras User-Agent / Sec-CH-UA-Mobile):
 * celular → Bienvenida del portal de usuarias (PWA); escritorio → acceso del personal.
 */
export function RaizPage() {
  const { personal, usuaria } = useSesion()
  if (personal) return <Layout><HomePage /></Layout>
  if (usuaria) return <Navigate to="/u/inicio" replace />
  if (!esMovil()) return <Navigate to="/acceso" replace />
  return (
    <PortalLayout>
      <BienvenidaPage />
    </PortalLayout>
  )
}

/** Inicio según el rol: P-05 (atención), K-01 (Capacitación) o D-01 (Administración). */
export function HomePage() {
  const { personal } = useSesion()
  if (personal?.rol === 'capacitacion') return <InicioCapacitacionPage />
  if (personal?.rol === 'administracion') return <InicioAdministracionPage />
  return <InicioAtencionPage />
}

/** Muestra P-90 si el rol no corresponde. El servidor vuelve a decidir en cada petición. */
export function RequiereRol({ roles }: { roles: Rol[] }) {
  const { personal } = useSesion()
  if (!personal || !roles.includes(personal.rol)) return <NoDisponible />
  return <Outlet />
}

export function NotFoundPage() {
  return <NoDisponible />
}
