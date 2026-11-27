import { useQuery } from '@tanstack/react-query'
import { consulta, pedir } from '@/shared/lib/servicio'

export type EventoBitacora = { id: string; fecha: string; actor: string; rol: string; accion: string; expediente?: string; detalle: string }
export type FiltrosBitacora = { actor?: string; expediente?: string; accion?: string; desde?: string; hasta?: string }

export const ACCIONES = ['Consulta', 'Modificación', 'Dato revelado', 'Nota agregada', 'Canalización', 'Inicio de sesión', 'Consulta de bitácora']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RawAuditEntry = {
  id: string
  fecha: string
  actor?: { id?: string; nombreLaboral?: string } | string | null
  rol?: string | null
  accion: string
  expediente?: string | null
  detalle?: string | null
}

const eventos: EventoBitacora[] = [
  { id: 'b1', fecha: '2026-11-25T16:42', actor: 'acastro', rol: 'Psicología', accion: 'Nota agregada', expediente: 'EXP-0412', detalle: 'Nota del área de Psicología' },
  { id: 'b2', fecha: '2026-11-25T16:30', actor: 'lmendez', rol: 'Trabajo social', accion: 'Dato revelado', expediente: 'EXP-0418', detalle: 'Teléfono · motivo: contactar para cita' },
  { id: 'b3', fecha: '2026-11-25T15:58', actor: 'lmendez', rol: 'Trabajo social', accion: 'Consulta', expediente: 'EXP-0421', detalle: 'Resumen del expediente' },
  { id: 'b4', fecha: '2026-11-25T12:10', actor: 'rinzunza', rol: 'Jurídico', accion: 'Canalización', expediente: 'EXP-0399', detalle: 'Externa · Centro de Justicia para las Mujeres' },
  { id: 'b5', fecha: '2026-11-25T09:01', actor: 'cruiz', rol: 'Administración', accion: 'Consulta de bitácora', detalle: 'Filtro: últimas 24 horas' },
  { id: 'b6', fecha: '2026-11-24T18:22', actor: 'lmendez', rol: 'Trabajo social', accion: 'Modificación', expediente: 'EXP-0418', detalle: 'Estado: abierto → en seguimiento' },
  { id: 'b7', fecha: '2026-11-24T08:00', actor: 'acastro', rol: 'Psicología', accion: 'Inicio de sesión', detalle: 'Navegador de escritorio' },
]

/** GET /audit-logs?actorId=&recordId=&action=&from=&to= (la consulta también queda registrada). */
export function useBitacora(f: FiltrosBitacora) {
  const actorParam = f.actor && UUID_RE.test(f.actor.trim()) ? f.actor.trim() : undefined
  const recordParam = f.expediente && UUID_RE.test(f.expediente.trim()) ? f.expediente.trim() : undefined
  return useQuery({
    queryKey: ['bitacora', f],
    queryFn: () =>
      pedir<EventoBitacora[]>({
        metodo: 'GET',
        ruta: `/audit-logs${consulta({ actorId: actorParam, recordId: recordParam, action: f.accion, from: f.desde, to: f.hasta })}`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawAuditEntry[])
            : ((raw as { items?: RawAuditEntry[] } | null)?.items ?? [])
          const mapped: EventoBitacora[] = items.map((e) => ({
            id: e.id,
            fecha: e.fecha,
            actor: typeof e.actor === 'string' ? e.actor : (e.actor?.nombreLaboral ?? 'Sistema'),
            rol: e.rol ?? '',
            accion: e.accion,
            expediente: e.expediente ?? undefined,
            detalle: e.detalle ?? '',
          }))
          // TODO(backend): remove client-side text filter once GET /audit-logs supports non-UUID actor/record search
          return mapped.filter(
            (e) =>
              (!f.actor || actorParam || e.actor.toLowerCase().includes(f.actor.toLowerCase())) &&
              (!f.expediente || recordParam || e.expediente?.toUpperCase().includes(f.expediente.toUpperCase())),
          )
        },
        simulado: () =>
          eventos.filter(
            (e) =>
              (!f.actor || e.actor.includes(f.actor)) &&
              (!f.expediente || e.expediente?.includes(f.expediente.toUpperCase())) &&
              (!f.accion || e.accion === f.accion) &&
              (!f.desde || e.fecha.slice(0, 10) >= f.desde) &&
              (!f.hasta || e.fecha.slice(0, 10) <= f.hasta),
          ),
      }),
  })
}
