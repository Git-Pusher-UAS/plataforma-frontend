import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch, onUnauthorized, setCsrfToken } from '@/api/client'
import { esModoSimulado, prefijoApi } from '@/shared/lib/servicio'

export type Rol = 'trabajo-social' | 'psicologia' | 'juridico' | 'capacitacion' | 'administracion'

export const ROLES: { valor: Rol; texto: string; clase: string }[] = [
  { valor: 'trabajo-social', texto: 'Trabajo social', clase: 'etiqueta-trabajo-social' },
  { valor: 'psicologia', texto: 'Psicología', clase: 'etiqueta-psicologia' },
  { valor: 'juridico', texto: 'Jurídico', clase: 'etiqueta-juridico' },
  { valor: 'capacitacion', texto: 'Capacitación', clase: 'etiqueta-capacitacion' },
  { valor: 'administracion', texto: 'Administración', clase: 'etiqueta-administracion' },
]

export const ROL_BACKEND_POR_FRONT: Record<Rol, string> = {
  'trabajo-social': 'TrabajoSocial',
  psicologia: 'Psicología',
  juridico: 'Jurídico',
  capacitacion: 'Capacitación',
  administracion: 'AdministradorTI',
}

export function mapRolBackend(codigo: string): Rol {
  const norm = codigo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim()
  if (norm === 'trabajosocial') return 'trabajo-social'
  if (norm === 'psicologia') return 'psicologia'
  if (norm === 'juridico') return 'juridico'
  if (norm === 'capacitacion') return 'capacitacion'
  return 'administracion'
}

export function mapEstadoEmpresaBackend(estado: string): EmpresaSesion['estado'] {
  const e = estado.trim().toLowerCase()
  if (e === 'approved' || e === 'aprobada') return 'aprobada'
  if (e === 'rejected' || e === 'rechazada') return 'rechazada'
  if (e === 'suspended' || e === 'suspendida') return 'suspendida'
  return 'en_revision'
}

export const textoRol = (rol: Rol) => ROLES.find((r) => r.valor === rol)?.texto ?? rol
export const esAtencion = (rol: Rol) => rol === 'trabajo-social' || rol === 'psicologia' || rol === 'juridico'

export type Personal = {
  usuario: string
  nombre: string
  rol: Rol
  id?: string
  departmentId?: string
  rolCodigo?: string
  permisos?: string[]
}
export type Usuaria = { alias: string }
/** Empresa aliada en el portal /e (bolsa de trabajo). Si no está aprobada, solo ve su solicitud. */
export type EmpresaSesion = { id: string; nombre: string; estado: 'en_revision' | 'aprobada' | 'rechazada' | 'suspendida' }

type Sesion = {
  personal: Personal | null
  usuaria: Usuaria | null
  empresa: EmpresaSesion | null
  /** Usuario que pasó la contraseña y aún no el segundo factor (nunca entra a pantallas de negocio). */
  preautenticado: string | null
  cargandoSesion: boolean
  iniciarPreautenticacion: (usuario: string | null) => void
  iniciarPersonal: (p: Personal) => void
  iniciarUsuaria: (u: Usuaria) => void
  iniciarEmpresa: (e: EmpresaSesion) => void
  cerrar: () => void
}

const Contexto = createContext<Sesion | null>(null)

type RawUsersMe = {
  actor: {
    id: string
    rol: string
    departmentId: string
    displayName: string
    permissions: string[]
  }
}

type RawAuthMe = {
  usuario: string
  nombre_laboral: string
}

type RawPortalMe = {
  alias: string
}

type RawEmployerMe = {
  id: string
  nombre: string
  estado: string
}

type RawCsrfResult = {
  csrf_token?: string
  csrfToken?: string
}

// La sesión del servidor vive en cookie HttpOnly; al montar con API real se hidrata desde /me.
export function SesionProvider({
  children,
  inicial,
}: {
  children: ReactNode
  inicial?: Partial<Pick<Sesion, 'personal' | 'usuaria' | 'empresa'>>
}) {
  const debeHidratar = !esModoSimulado() && inicial === undefined
  const [personal, setPersonal] = useState<Personal | null>(inicial?.personal ?? null)
  const [usuaria, setUsuaria] = useState<Usuaria | null>(inicial?.usuaria ?? null)
  const [empresa, setEmpresa] = useState<EmpresaSesion | null>(inicial?.empresa ?? null)
  const [preautenticado, setPre] = useState<string | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState<boolean>(debeHidratar)

  useEffect(() => {
    return onUnauthorized((path) => {
      const clean = path.split('?')[0] ?? path
      if (/\/employers?(\/|$)/.test(clean)) {
        setEmpresa(null)
        return
      }
      const esSurveyPortal = /\/surveys(\/|$)/.test(clean) && !/\/surveys\/results(\/|$)/.test(clean)
      if (
        /\/portal(\/|$)/.test(clean) ||
        /\/help-alerts(\/|$)/.test(clean) ||
        /\/courses\/[^/]+\/enrollments(\/|$)/.test(clean) ||
        /\/jobs\/[^/]+\/applications(\/|$)/.test(clean) ||
        esSurveyPortal
      ) {
        setUsuaria(null)
        return
      }
      setPersonal(null)
      setCsrfToken(null)
    })
  }, [])

  useEffect(() => {
    if (!debeHidratar) return
    let activo = true
    const prefijo = prefijoApi()
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'

    async function hidratar() {
      try {
        if (pathname.startsWith('/e')) {
          const emp = await apiFetch<RawEmployerMe>(`${prefijo}/employers/me/registration`, {
            skipUnauthorizedHandler: true,
          })
          if (activo) {
            setEmpresa({
              id: emp.id,
              nombre: emp.nombre,
              estado: mapEstadoEmpresaBackend(emp.estado),
            })
          }
        } else if (pathname.startsWith('/u')) {
          const me = await apiFetch<RawPortalMe>(`${prefijo}/portal/me`, {
            skipUnauthorizedHandler: true,
          })
          if (activo) setUsuaria({ alias: me.alias })
        } else {
          const [usersMe, authMe, csrfRes] = await Promise.all([
            apiFetch<RawUsersMe>(`${prefijo}/users/me`, { skipUnauthorizedHandler: true }),
            apiFetch<RawAuthMe>(`${prefijo}/auth/me`, { skipUnauthorizedHandler: true }).catch(() => null),
            apiFetch<RawCsrfResult>(`${prefijo}/auth/csrf-token`, { skipUnauthorizedHandler: true }).catch(() => null),
          ])
          if (!activo) return
          const csrf = csrfRes?.csrf_token ?? csrfRes?.csrfToken ?? null
          if (csrf) setCsrfToken(csrf)
          setPersonal({
            id: usersMe.actor.id,
            usuario: authMe?.usuario ?? usersMe.actor.displayName,
            nombre: authMe?.nombre_laboral ?? usersMe.actor.displayName,
            rol: mapRolBackend(usersMe.actor.rol),
            rolCodigo: usersMe.actor.rol,
            departmentId: usersMe.actor.departmentId,
            permisos: usersMe.actor.permissions,
          })
        }
      } catch {
        // Sin sesión activa en cookie: permanece en estado no autenticado.
      } finally {
        if (activo) setCargandoSesion(false)
      }
    }

    void hidratar()
    return () => {
      activo = false
    }
  }, [debeHidratar])

  const valor = useMemo<Sesion>(
    () => ({
      personal,
      usuaria,
      empresa,
      preautenticado,
      cargandoSesion,
      iniciarPreautenticacion: setPre,
      iniciarPersonal: (p) => {
        setPre(null)
        setPersonal(p)
      },
      iniciarUsuaria: setUsuaria,
      iniciarEmpresa: setEmpresa,
      cerrar: () => {
        setPersonal(null)
        setUsuaria(null)
        setEmpresa(null)
        setPre(null)
        setCsrfToken(null)
      },
    }),
    [personal, usuaria, empresa, preautenticado, cargandoSesion],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): Sesion {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return s
}
