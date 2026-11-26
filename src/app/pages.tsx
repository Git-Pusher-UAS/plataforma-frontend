import { Outlet } from 'react-router'
import { InicioAdministracionPage } from '@/features/administracion/pages'
import { InicioCapacitacionPage } from '@/features/capacitacion/pages'
import { InicioAtencionPage } from '@/features/expedientes/Borradores'
import { useSesion, type Rol } from '@/features/identidad/sesion'
import { NoDisponible } from '@/shared/ui/NoDisponible'

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
