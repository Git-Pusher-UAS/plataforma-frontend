import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, setCsrfToken } from '@/api/client'
import { mapRolBackend, type Personal, type Rol } from '@/features/identidad/sesion'
import { fechaHora } from '@/shared/lib/formato'
import { esModoSimulado, pedir, prefijoApi } from '@/shared/lib/servicio'

// ---------- Personal ----------
export type RespuestaLogin =
  | { kind: 'challenge'; challengeId: string; next: 'totp' | 'enroll' }
  | { kind: 'authenticated'; personal: Personal }

type RawLoginChallenge = {
  challengeId: string
  next?: string
}

type RawUsuarioLogin = {
  id: string
  usuario: string
  nombre_laboral: string
  rol: string
  permisos?: string[]
}

type RawLoginSuccess = {
  csrf_token?: string
  usuario: RawUsuarioLogin
}

type RawVerifyMFA = {
  id: string
  usuario: string
  nombre?: string
  nombre_laboral?: string
  rol: string
  permisos?: string[]
  csrf_token?: string
}

type RawUsersMe = {
  actor?: {
    departmentId?: string
  }
}

type RawSessionSummary = {
  id: string
  deviceLabel?: string
  dispositivo?: string
  lastActivityAt?: string
  ultimoUso?: string
  current?: boolean
  actual?: boolean
}

async function fetchDepartmentId(): Promise<string | undefined> {
  try {
    const me = await apiFetch<RawUsersMe>(`${prefijoApi()}/users/me`, { skipUnauthorizedHandler: true })
    return me.actor?.departmentId
  } catch {
    return undefined
  }
}

/** POST /auth/login (202 challenge o 200 sesión directa si aún no tiene MFA). */
export function useLoginPersonal() {
  return useMutation({
    mutationFn: async (c: { usuario: string; contrasena: string }): Promise<RespuestaLogin> => {
      if (esModoSimulado()) {
        return { kind: 'challenge', challengeId: 'ch-1', next: 'totp' }
      }
      const raw = await pedir<RawLoginChallenge | RawLoginSuccess>({
        metodo: 'POST',
        ruta: '/auth/login',
        cuerpo: { username: c.usuario, password: c.contrasena },
        skipUnauthorizedHandler: true,
        simulado: () => ({ challengeId: 'ch-1', next: 'totp' }),
      })
      if ('challengeId' in raw && raw.challengeId) {
        return {
          kind: 'challenge',
          challengeId: raw.challengeId,
          next: raw.next === 'enroll' ? 'enroll' : 'totp',
        }
      }
      const ok = raw as RawLoginSuccess
      setCsrfToken(ok.csrf_token ?? null)
      const departmentId = await fetchDepartmentId()
      return {
        kind: 'authenticated',
        personal: {
          id: ok.usuario.id,
          usuario: ok.usuario.usuario,
          nombre: ok.usuario.nombre_laboral,
          rol: mapRolBackend(ok.usuario.rol),
          rolCodigo: ok.usuario.rol,
          departmentId,
          permisos: ok.usuario.permisos,
        },
      }
    },
  })
}

/** POST /auth/mfa/verify y después GET /users/me para departmentId. */
export function useVerificarCodigo() {
  return useMutation({
    mutationFn: async (c: { challengeId: string; codigo: string; usuario: string; rolDemo: Rol }): Promise<Personal> => {
      if (esModoSimulado()) {
        return { usuario: c.usuario, nombre: NOMBRES_DEMO[c.rolDemo], rol: c.rolDemo }
      }
      const raw = await pedir<RawVerifyMFA>({
        metodo: 'POST',
        ruta: '/auth/mfa/verify',
        cuerpo: { challengeId: c.challengeId, code: c.codigo },
        skipUnauthorizedHandler: true,
        simulado: () => ({ id: 'demo', usuario: c.usuario, nombre: NOMBRES_DEMO[c.rolDemo], rol: c.rolDemo }),
      })
      setCsrfToken(raw.csrf_token ?? null)
      const departmentId = await fetchDepartmentId()
      return {
        id: raw.id,
        usuario: raw.usuario,
        nombre: raw.nombre_laboral ?? raw.nombre ?? raw.usuario,
        rol: mapRolBackend(raw.rol),
        rolCodigo: raw.rol,
        departmentId,
        permisos: raw.permisos,
      }
    },
  })
}

const NOMBRES_DEMO: Record<Rol, string> = {
  'trabajo-social': 'Laura Méndez',
  psicologia: 'Ana Castro',
  juridico: 'Rosa Inzunza',
  capacitacion: 'Elena Valdez',
  administracion: 'Carmen Ruiz',
}

/** POST /auth/logout */
export function useCerrarSesion() {
  return useMutation({
    mutationFn: () =>
      pedir<void>({
        metodo: 'POST',
        ruta: '/auth/logout',
        skipUnauthorizedHandler: true,
        simulado: () => undefined,
      }),
    onSettled: () => setCsrfToken(null),
  })
}

export type SesionActiva = { id: string; dispositivo: string; ultimoUso: string; actual: boolean }
/** GET /users/me/sessions */
export function useMisSesiones() {
  return useQuery({
    queryKey: ['mis-sesiones'],
    queryFn: () =>
      pedir<SesionActiva[]>({
        metodo: 'GET',
        ruta: '/users/me/sessions',
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawSessionSummary[])
            : ((raw as { items?: RawSessionSummary[] } | null)?.items ?? [])
          return items.map((s) => {
            const fecha = s.ultimoUso ?? s.lastActivityAt ?? ''
            return {
              id: s.id,
              dispositivo: s.dispositivo ?? s.deviceLabel ?? 'Navegador web',
              ultimoUso: fecha ? fechaHora(fecha) : '—',
              actual: Boolean(s.actual ?? s.current),
            }
          })
        },
        simulado: () => [
          { id: 's1', dispositivo: 'Este navegador', ultimoUso: 'Ahora', actual: true },
          { id: 's2', dispositivo: 'Celular · Android', ultimoUso: 'Ayer, 6:40 pm', actual: false },
        ],
      }),
  })
}

// ---------- Usuarias (portal) ----------
/**
 * Cómo se identifica la usuaria al entrar: celular, CURP o correo (RF-02).
 * No se usa el nombre: varias personas pueden llamarse exactamente igual.
 */
export type EntradaUsuaria = { tipo: 'telefono'; telefono: string } | { tipo: 'curp'; curp: string } | { tipo: 'correo'; correo: string }

/**
 * POST /portal/auth/login — envía un código por SMS al celular registrado de la cuenta.
 * Responde 202 aunque no exista la cuenta, para no revelar quién está registrada.
 */
export function useEntrarUsuaria() {
  return useMutation({
    mutationFn: (c: EntradaUsuaria) => {
      // TODO(backend): send structured { tipo, ... } once POST /portal/auth/login supports telefono and correo
      const identificador = c.tipo === 'curp' ? c.curp : c.tipo === 'telefono' ? c.telefono : c.correo
      return pedir<{ challengeId: string; telefonoMascara: string }>({
        metodo: 'POST',
        ruta: '/portal/auth/login',
        cuerpo: { identificador },
        skipUnauthorizedHandler: true,
        simulado: () => ({ challengeId: 'uch-1', telefonoMascara: `•• •••• ${c.tipo === 'telefono' ? c.telefono.slice(-2) : '42'}` }),
      })
    },
  })
}

/** POST /portal/auth/verify */
export function useVerificarUsuaria() {
  return useMutation({
    mutationFn: (c: { challengeId: string; codigo: string }) =>
      pedir<{ alias: string }>({
        metodo: 'POST',
        ruta: '/portal/auth/verify',
        cuerpo: { challengeId: c.challengeId, code: c.codigo },
        skipUnauthorizedHandler: true,
        simulado: () => ({ alias: 'María' }),
      }),
  })
}

/** POST /portal/auth/logout */
export function useCerrarSesionUsuaria() {
  return useMutation({
    mutationFn: () =>
      pedir<void>({
        metodo: 'POST',
        ruta: '/portal/auth/logout',
        skipUnauthorizedHandler: true,
        simulado: () => undefined,
      }),
  })
}

/** POST /portal/accounts — autorregistro (origen "autorregistro" en RF-01). */
export function useCrearCuentaUsuaria() {
  return useMutation({
    mutationFn: (c: { nombre: string; curp: string; telefono: string; correo?: string; aceptaAviso: boolean }) =>
      pedir<{ challengeId: string; telefonoMascara: string }>({
        metodo: 'POST',
        ruta: '/portal/accounts',
        // TODO(backend): include correo once POST /portal/accounts accepts it
        cuerpo: { nombre: c.nombre, curp: c.curp, telefono: c.telefono, aceptaAviso: c.aceptaAviso },
        skipUnauthorizedHandler: true,
        simulado: () => ({ challengeId: 'uch-2', telefonoMascara: `•• •••• ${c.telefono.slice(-2)}` }),
      }),
  })
}

export type PerfilUsuaria = {
  alias: string
  telefonoMascara: string
  contactosConfianza: { id: string; nombre: string; telefonoMascara: string }[]
  silenciarAvisos: boolean
  compartirUbicacion: boolean
  nombreDiscreto: string
}

type RawPerfilUsuaria = Omit<PerfilUsuaria, 'nombreDiscreto' | 'contactosConfianza'> & {
  contactosConfianza?: PerfilUsuaria['contactosConfianza']
  nombreDiscreto?: string | boolean
}

function adaptarPerfil(raw: unknown): PerfilUsuaria {
  const r = raw as RawPerfilUsuaria
  return {
    alias: r.alias,
    telefonoMascara: r.telefonoMascara,
    contactosConfianza: r.contactosConfianza ?? [],
    silenciarAvisos: Boolean(r.silenciarAvisos),
    compartirUbicacion: Boolean(r.compartirUbicacion),
    // TODO(backend): remove boolean fallback once GET /portal/me returns nombreDiscreto string
    nombreDiscreto: typeof r.nombreDiscreto === 'string' ? r.nombreDiscreto : 'Agenda',
  }
}

const perfil: PerfilUsuaria = {
  alias: 'María',
  telefonoMascara: '•• •••• 42',
  contactosConfianza: [{ id: 'ct1', nombre: 'Hermana', telefonoMascara: '•• •••• 17' }],
  silenciarAvisos: false,
  compartirUbicacion: true,
  nombreDiscreto: 'Agenda',
}

/** GET /portal/me */
export function usePerfil() {
  return useQuery({
    queryKey: ['perfil'],
    queryFn: () => pedir({ metodo: 'GET', ruta: '/portal/me', adaptar: adaptarPerfil, simulado: () => perfil }),
  })
}

/** PATCH /portal/me */
export function useActualizarPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cambios: Partial<Pick<PerfilUsuaria, 'silenciarAvisos' | 'compartirUbicacion'>>) =>
      pedir<PerfilUsuaria>({
        metodo: 'PATCH',
        ruta: '/portal/me',
        cuerpo: cambios,
        adaptar: adaptarPerfil,
        simulado: () => Object.assign(perfil, cambios),
      }),
    onSuccess: (p) => qc.setQueryData(['perfil'], p),
  })
}
