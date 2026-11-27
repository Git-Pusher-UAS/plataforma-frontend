import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mapRolBackend, ROL_BACKEND_POR_FRONT, type Rol } from '@/features/identidad/sesion'
import { consulta, formatIfMatch, pedir } from '@/shared/lib/servicio'

// ---------- Solicitudes de acceso (D-04) ----------
export type Solicitud = {
  id: string
  expedienteId: string
  solicitante: string
  solicitanteId?: string
  departamento: string
  motivo: string
  fecha: string
  estado: 'pendiente' | 'asignada' | 'rechazada'
}

type RawSolicitud = {
  id: string
  expedienteId: string
  solicitante?: { id?: string; nombreLaboral?: string } | string
  departamento: string
  motivo: string
  fecha: string
  estado: 'pendiente' | 'aprobada' | 'asignada' | 'rechazada'
}

const solicitudes: Solicitud[] = [
  { id: 'sol-7', expedienteId: 'EXP-0399', solicitante: 'Ana Castro', departamento: 'Psicología', motivo: 'La persona acudió a cita y pidió continuar la atención psicológica.', fecha: '2026-11-25', estado: 'pendiente' },
  { id: 'sol-6', expedienteId: 'EXP-0418', solicitante: 'Laura Méndez', departamento: 'Trabajo social', motivo: 'Persona ya registrada; se presentó de nuevo en ventanilla.', fecha: '2026-11-24', estado: 'pendiente' },
  { id: 'sol-5', expedienteId: 'EXP-0412', solicitante: 'Rosa Inzunza', departamento: 'Jurídico', motivo: 'Canalización por medidas de protección.', fecha: '2026-11-20', estado: 'asignada' },
]

function adaptarSolicitud(r: RawSolicitud): Solicitud {
  const nombre = typeof r.solicitante === 'string' ? r.solicitante : (r.solicitante?.nombreLaboral ?? '')
  const solicitanteId = typeof r.solicitante === 'object' ? r.solicitante?.id : undefined
  return {
    id: r.id,
    expedienteId: r.expedienteId,
    solicitante: nombre,
    solicitanteId,
    departamento: r.departamento,
    motivo: r.motivo,
    fecha: r.fecha.slice(0, 10),
    estado: r.estado === 'aprobada' ? 'asignada' : r.estado,
  }
}

/** GET /case-access-requests?status= — solo metadatos, nunca datos de identidad ni notas. */
export function useSolicitudes(estado?: Solicitud['estado']) {
  const statusQuery = estado === 'asignada' ? 'aprobada' : estado
  return useQuery({
    queryKey: ['solicitudes', estado ?? 'todas'],
    queryFn: () =>
      pedir<Solicitud[]>({
        metodo: 'GET',
        ruta: `/case-access-requests${consulta({ status: statusQuery })}`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawSolicitud[])
            : ((raw as { items?: RawSolicitud[] } | null)?.items ?? [])
          return items.map(adaptarSolicitud)
        },
        simulado: () => solicitudes.filter((s) => !estado || s.estado === estado),
      }),
  })
}

/** POST /case-files/{recordId}/assignments (asignar) o POST /case-access-requests/{id}/rejection (rechazar). */
export function useResolverSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { solicitud: Solicitud; decision: 'asignar' | 'rechazar'; staffId?: string; departamentoId?: string; motivo: string }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: c.decision === 'asignar' ? `/case-files/${c.solicitud.expedienteId}/assignments` : `/case-access-requests/${c.solicitud.id}/rejection`,
        cuerpo:
          c.decision === 'asignar'
            ? {
                personalId: c.staffId,
                departamentoId: c.departamentoId,
                motivo: c.motivo,
                solicitudId: c.solicitud.id,
              }
            : { motivo: c.motivo },
        simulado: () => {
          const s = solicitudes.find((x) => x.id === c.solicitud.id)
          if (s) s.estado = c.decision === 'asignar' ? 'asignada' : 'rechazada'
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  })
}

// ---------- Personal (D-06) ----------
export type Cuenta = {
  id: string
  usuario: string
  nombre: string
  rol: Rol
  estado: 'activa' | 'suspendida'
  ultimoAcceso: string
  departamentoId?: string
  versionTag?: string
  rolCodigo?: string
}

type RawStaffSummary = {
  id: string
  usuario: string
  nombreLaboral: string
  rol: string
  departamentoId?: string
  estado: 'activo' | 'suspendido' | 'activa' | 'suspendida'
  versionTag?: string
  ultimoAcceso?: string | null
}

function adaptarCuenta(r: RawStaffSummary): Cuenta {
  return {
    id: r.id,
    usuario: r.usuario,
    nombre: r.nombreLaboral,
    rol: mapRolBackend(r.rol),
    rolCodigo: r.rol,
    departamentoId: r.departamentoId,
    versionTag: r.versionTag,
    estado: r.estado === 'suspendido' || r.estado === 'suspendida' ? 'suspendida' : 'activa',
    // TODO(backend): remove fallback once GET /users returns ultimoAcceso
    ultimoAcceso: r.ultimoAcceso ?? '—',
  }
}

const cuentas: Cuenta[] = [
  { id: 'u1', usuario: 'lmendez', nombre: 'Laura Méndez', rol: 'trabajo-social', estado: 'activa', ultimoAcceso: '2026-11-25' },
  { id: 'u2', usuario: 'acastro', nombre: 'Ana Castro', rol: 'psicologia', estado: 'activa', ultimoAcceso: '2026-11-25' },
  { id: 'u3', usuario: 'rinzunza', nombre: 'Rosa Inzunza', rol: 'juridico', estado: 'activa', ultimoAcceso: '2026-11-24' },
  { id: 'u4', usuario: 'evaldez', nombre: 'Elena Valdez', rol: 'capacitacion', estado: 'activa', ultimoAcceso: '2026-11-22' },
  { id: 'u5', usuario: 'cruiz', nombre: 'Carmen Ruiz', rol: 'administracion', estado: 'activa', ultimoAcceso: '2026-11-25' },
  { id: 'u6', usuario: 'pfelix', nombre: 'Paula Félix', rol: 'psicologia', estado: 'suspendida', ultimoAcceso: '2026-09-30' },
]

/** GET /users?q= (con filtro de rol en cliente mientras el backend soporta ?role=). */
export function useCuentas(texto = '', rol?: Rol) {
  return useQuery({
    queryKey: ['cuentas', texto, rol ?? 'todos'],
    queryFn: () =>
      pedir<Cuenta[]>({
        metodo: 'GET',
        ruta: `/users${consulta({ q: texto })}`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawStaffSummary[])
            : ((raw as { items?: RawStaffSummary[] } | null)?.items ?? [])
          const mapped = items.map(adaptarCuenta)
          // TODO(backend): remove client-side role filter once GET /users supports ?role=
          return rol ? mapped.filter((c) => c.rol === rol) : mapped
        },
        simulado: () => cuentas.filter((c) => (!rol || c.rol === rol) && `${c.usuario} ${c.nombre}`.toLowerCase().includes(texto.toLowerCase())),
      }),
  })
}

/** POST /users — la respuesta trae la activación de un solo uso. */
export function useCrearCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: Pick<Cuenta, 'usuario' | 'nombre' | 'rol'> & { departamentoId?: string }) =>
      pedir<{ cuenta: Cuenta; activacion: string }>({
        metodo: 'POST',
        ruta: '/users',
        cuerpo: {
          usuario: c.usuario,
          nombreLaboral: c.nombre,
          rol: ROL_BACKEND_POR_FRONT[c.rol],
          departamentoId: c.departamentoId ?? '',
        },
        adaptar: (raw) => {
          const r = raw as { cuenta: RawStaffSummary; activacion: string | { codigo: string } }
          return {
            cuenta: adaptarCuenta(r.cuenta),
            activacion: typeof r.activacion === 'string' ? r.activacion : r.activacion.codigo,
          }
        },
        simulado: () => {
          const cuenta: Cuenta = { usuario: c.usuario, nombre: c.nombre, rol: c.rol, id: `u${cuentas.length + 1}`, estado: 'activa', ultimoAcceso: '—' }
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
    mutationFn: (c: { id: string; versionTag?: string; departamentoId?: string; cambios: Partial<Pick<Cuenta, 'rol' | 'estado'>> }) =>
      pedir<void>({
        metodo: 'PATCH',
        ruta: `/users/${c.id}`,
        headers: c.versionTag ? { 'If-Match': formatIfMatch(c.versionTag) } : undefined,
        cuerpo: {
          ...(c.cambios.rol
            ? {
                rol: ROL_BACKEND_POR_FRONT[c.cambios.rol],
                ...(c.departamentoId ? { departamentoId: c.departamentoId } : {}),
              }
            : {}),
          ...(c.cambios.estado
            ? { estado: c.cambios.estado === 'activa' ? 'activo' : 'suspendido' }
            : {}),
        },
        simulado: () => void Object.assign(cuentas.find((x) => x.id === c.id) ?? {}, c.cambios),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas'] }),
  })
}
