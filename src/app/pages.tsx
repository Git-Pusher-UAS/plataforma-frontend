import { Navigate, Outlet } from 'react-router'
import { Layout } from '@/app/Layout'
import { InicioAdministracionPage } from '@/features/administracion/pages'
import { InicioCapacitacionPage } from '@/features/capacitacion/pages'
import { InicioAtencionPage } from '@/features/expedientes/Borradores'
import { useSesion, type Rol } from '@/features/identidad/sesion'
import { BienvenidaPage } from '@/features/portal/AccesoUsuaria'
import { PortalLayout } from '@/features/portal/PortalLayout'
import { esDispositivoMovil } from '@/shared/lib/dispositivo'
import { Cargando } from '@/shared/ui/Estados'
import { NoDisponible } from '@/shared/ui/NoDisponible'

/** Raíz `/`: panel del personal si hay sesión; si no, `/acceso` en PC o Bienvenida en móvil. */
export function RaizPage() {
  const { personal, cargandoSesion } = useSesion()
  if (cargandoSesion) {
    return (
      <main className="pagina">
        <Cargando />
      </main>
    )
  }
  if (personal) return <Layout><HomePage /></Layout>
  if (!esDispositivoMovil()) return <Navigate to="/acceso" replace />
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
