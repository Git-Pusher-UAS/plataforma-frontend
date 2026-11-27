import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pedir } from '@/shared/lib/servicio'
import type { Personal, Rol } from '@/features/identidad/sesion'

// ---------- Personal ----------
export type RespuestaLogin = { challengeId: string; next: 'totp' | 'enroll' }

/** POST /auth/login (antes, GET /auth/csrf-token). */
export function useLoginPersonal() {
  return useMutation({
    mutationFn: (c: { usuario: string; contrasena: string }) =>
      pedir<RespuestaLogin>({ metodo: 'POST', ruta: '/auth/login', cuerpo: { username: c.usuario, password: c.contrasena }, simulado: () => ({ challengeId: 'ch-1', next: 'totp' }) }),
  })
}

/** POST /auth/mfa/verify y después GET /users/me. */
export function useVerificarCodigo() {
  return useMutation({
    mutationFn: (c: { challengeId: string; codigo: string; usuario: string; rolDemo: Rol }) =>
      pedir<Personal>({
        metodo: 'POST',
        ruta: '/auth/mfa/verify',
        cuerpo: { challengeId: c.challengeId, code: c.codigo },
        simulado: () => ({ usuario: c.usuario, nombre: NOMBRES_DEMO[c.rolDemo], rol: c.rolDemo }),
      }),
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
  return useMutation({ mutationFn: () => pedir<void>({ metodo: 'POST', ruta: '/auth/logout', simulado: () => undefined }) })
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
    mutationFn: (c: EntradaUsuaria) =>
      pedir<{ challengeId: string; telefonoMascara: string }>({
        metodo: 'POST',
        ruta: '/portal/auth/login',
        cuerpo: c,
        simulado: () => ({ challengeId: 'uch-1', telefonoMascara: `•• •••• ${c.tipo === 'telefono' ? c.telefono.slice(-2) : '42'}` }),
      }),
  })
}

/** POST /portal/auth/verify */
export function useVerificarUsuaria() {
  return useMutation({
    mutationFn: (c: { challengeId: string; codigo: string }) =>
      pedir<{ alias: string }>({ metodo: 'POST', ruta: '/portal/auth/verify', cuerpo: { challengeId: c.challengeId, code: c.codigo }, simulado: () => ({ alias: 'María' }) }),
  })
}

/** POST /portal/accounts — autorregistro (origen "autorregistro" en RF-01). */
export function useCrearCuentaUsuaria() {
  return useMutation({
    mutationFn: (c: { nombre: string; curp: string; telefono: string; correo?: string; aceptaAviso: boolean }) =>
      pedir<{ challengeId: string; telefonoMascara: string }>({
        metodo: 'POST',
        ruta: '/portal/accounts',
        cuerpo: c,
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
  return useQuery({ queryKey: ['perfil'], queryFn: () => pedir({ metodo: 'GET', ruta: '/portal/me', simulado: () => perfil }) })
}

/** PATCH /portal/me */
export function useActualizarPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cambios: Partial<Pick<PerfilUsuaria, 'silenciarAvisos' | 'compartirUbicacion'>>) =>
      pedir<PerfilUsuaria>({ metodo: 'PATCH', ruta: '/portal/me', cuerpo: cambios, simulado: () => Object.assign(perfil, cambios) }),
    onSuccess: (p) => qc.setQueryData(['perfil'], p),
  })
}
