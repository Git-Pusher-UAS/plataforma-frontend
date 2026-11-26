import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consulta, pedir } from '@/shared/lib/servicio'
import type { Rol } from '@/features/identidad/sesion'

// ---------- Solicitudes de acceso (D-04) ----------
export type Solicitud = { id: string; expedienteId: string; solicitante: string; departamento: string; motivo: string; fecha: string; estado: 'pendiente' | 'asignada' | 'rechazada' }

const solicitudes: Solicitud[] = [
  { id: 'sol-7', expedienteId: 'EXP-0399', solicitante: 'Ana Castro', departamento: 'Psicología', motivo: 'La persona acudió a cita y pidió continuar la atención psicológica.', fecha: '2026-11-25', estado: 'pendiente' },
  { id: 'sol-6', expedienteId: 'EXP-0418', solicitante: 'Laura Méndez', departamento: 'Trabajo social', motivo: 'Persona ya registrada; se presentó de nuevo en ventanilla.', fecha: '2026-11-24', estado: 'pendiente' },
  { id: 'sol-5', expedienteId: 'EXP-0412', solicitante: 'Rosa Inzunza', departamento: 'Jurídico', motivo: 'Canalización por medidas de protección.', fecha: '2026-11-20', estado: 'asignada' },
]

/** GET /case-access-requests?status= — solo metadatos, nunca datos de identidad ni notas. */
export function useSolicitudes(estado?: Solicitud['estado']) {
  return useQuery({
    queryKey: ['solicitudes', estado ?? 'todas'],
    queryFn: () => pedir<Solicitud[]>({ metodo: 'GET', ruta: `/case-access-requests${consulta({ status: estado })}`, simulado: () => solicitudes.filter((s) => !estado || s.estado === estado) }),
  })
}

/** POST /case-files/{recordId}/assignments (asignar) o POST /case-access-requests/{id}/rejection (rechazar; falta en el contrato). */
export function useResolverSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { solicitud: Solicitud; decision: 'asignar' | 'rechazar'; staffId?: string; motivo: string }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: c.decision === 'asignar' ? `/case-files/${c.solicitud.expedienteId}/assignments` : `/case-access-requests/${c.solicitud.id}/rejection`,
        cuerpo: c.decision === 'asignar' ? { staffId: c.staffId, linkRequestId: c.solicitud.id, motivo: c.motivo } : { motivo: c.motivo },
        simulado: () => {
          const s = solicitudes.find((x) => x.id === c.solicitud.id)
          if (s) s.estado = c.decision === 'asignar' ? 'asignada' : 'rechazada'
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  })
}

// ---------- Personal (D-06) ----------
export type Cuenta = { id: string; usuario: string; nombre: string; rol: Rol; estado: 'activa' | 'suspendida'; ultimoAcceso: string }

const cuentas: Cuenta[] = [
  { id: 'u1', usuario: 'lmendez', nombre: 'Laura Méndez', rol: 'trabajo-social', estado: 'activa', ultimoAcceso: '2026-11-25' },
  { id: 'u2', usuario: 'acastro', nombre: 'Ana Castro', rol: 'psicologia', estado: 'activa', ultimoAcceso: '2026-11-25' },
  { id: 'u3', usuario: 'rinzunza', nombre: 'Rosa Inzunza', rol: 'juridico', estado: 'activa', ultimoAcceso: '2026-11-24' },
  { id: 'u4', usuario: 'evaldez', nombre: 'Elena Valdez', rol: 'capacitacion', estado: 'activa', ultimoAcceso: '2026-11-22' },
  { id: 'u5', usuario: 'cruiz', nombre: 'Carmen Ruiz', rol: 'administracion', estado: 'activa', ultimoAcceso: '2026-11-25' },
  { id: 'u6', usuario: 'pfelix', nombre: 'Paula Félix', rol: 'psicologia', estado: 'suspendida', ultimoAcceso: '2026-09-30' },
]

/** GET /users?q=&role= */
export function useCuentas(texto = '', rol?: Rol) {
  return useQuery({
    queryKey: ['cuentas', texto, rol ?? 'todos'],
    queryFn: () =>
      pedir<Cuenta[]>({
        metodo: 'GET',
        ruta: `/users${consulta({ q: texto, role: rol })}`,
        simulado: () => cuentas.filter((c) => (!rol || c.rol === rol) && `${c.usuario} ${c.nombre}`.toLowerCase().includes(texto.toLowerCase())),
      }),
  })
}

/** POST /users — la respuesta trae la activación de un solo uso. */
export function useCrearCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: Pick<Cuenta, 'usuario' | 'nombre' | 'rol'>) =>
      pedir<{ cuenta: Cuenta; activacion: string }>({
        metodo: 'POST',
        ruta: '/users',
        cuerpo: c,
        simulado: () => {
          const cuenta: Cuenta = { ...c, id: `u${cuentas.length + 1}`, estado: 'activa', ultimoAcceso: '—' }
          cuentas.push(cuenta)
          return { cuenta, activacion: 'K7P2-9QX4' }
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas'] }),
  })
}

/** PATCH /users/{userId} — cambiar rol o suspender cierra sus sesiones. */
export function useEditarCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { id: string; cambios: Partial<Pick<Cuenta, 'rol' | 'estado'>> }) =>
      pedir<void>({ metodo: 'PATCH', ruta: `/users/${c.id}`, cuerpo: c.cambios, simulado: () => void Object.assign(cuentas.find((x) => x.id === c.id) ?? {}, c.cambios) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas'] }),
  })
}
