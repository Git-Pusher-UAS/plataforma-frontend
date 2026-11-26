import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consulta, pedir } from '@/shared/lib/servicio'
import type { Area } from '@/features/expedientes/api'

export type EstadoCanalizacion = 'pendiente' | 'aceptada' | 'rechazada' | 'completada' | 'cancelada'
export type Canalizacion = {
  id: string
  expedienteId: string
  alias: string
  tipo: 'interna' | 'externa'
  origen: string
  destino: string
  resumen: string
  estado: EstadoCanalizacion
  fecha: string
  versionTag: string
}
export type Direccion = 'incoming' | 'outgoing'
export type Accion = 'accept' | 'reject' | 'complete' | 'cancel'

export const INSTITUCIONES_EXTERNAS = ['Fiscalía Especializada', 'Centro de Justicia para las Mujeres', 'DIF Ahome', 'Sector salud', 'Refugio temporal']

const AREAS_TEXTO: Record<Area, string> = { 'trabajo-social': 'Trabajo social', psicologia: 'Psicología', juridico: 'Jurídico' }
export const textoArea = (a: Area) => AREAS_TEXTO[a]

// ---------- Datos simulados ----------
type Interna = Canalizacion & { para: Area[]; de: Area[] }
/** Quita los campos internos del simulado (a quién va y de quién viene). */
const publica = (c: Interna): Canalizacion => {
  const { para, de, ...resto } = c
  void para
  void de
  return resto
}
const lista: Interna[] = [
  { id: 'ca1', expedienteId: 'EXP-0418', alias: 'Caso Bugambilia', tipo: 'interna', origen: 'Trabajo social', destino: 'Psicología', resumen: 'Requiere acompañamiento psicológico inicial.', estado: 'pendiente', fecha: '2026-11-24', versionTag: 'r1', para: ['psicologia'], de: ['trabajo-social'] },
  { id: 'ca2', expedienteId: 'EXP-0412', alias: 'Caso Jacaranda', tipo: 'interna', origen: 'Trabajo social', destino: 'Jurídico', resumen: 'Orientación sobre medidas de protección.', estado: 'pendiente', fecha: '2026-11-23', versionTag: 'r1', para: ['juridico'], de: ['trabajo-social'] },
  { id: 'ca3', expedienteId: 'EXP-0412', alias: 'Caso Jacaranda', tipo: 'interna', origen: 'Trabajo social', destino: 'Psicología', resumen: 'Seguimiento semanal.', estado: 'aceptada', fecha: '2026-10-05', versionTag: 'r2', para: ['psicologia'], de: ['trabajo-social'] },
  { id: 'ca4', expedienteId: 'EXP-0399', alias: 'Caso Guamúchil', tipo: 'externa', origen: 'Jurídico', destino: 'Centro de Justicia para las Mujeres', resumen: 'Acompañamiento a denuncia. Seguimiento manual.', estado: 'completada', fecha: '2026-10-20', versionTag: 'r3', para: [], de: ['juridico'] },
]

/** GET /referrals?direction=&status= */
export function useCanalizaciones(area: Area, direccion: Direccion, estado?: EstadoCanalizacion) {
  return useQuery({
    queryKey: ['canalizaciones', area, direccion, estado ?? 'todas'],
    queryFn: () =>
      pedir<Canalizacion[]>({
        metodo: 'GET',
        ruta: `/referrals${consulta({ direction: direccion, status: estado })}`,
        simulado: () =>
          lista
            .filter((c) => (direccion === 'incoming' ? c.para.includes(area) : c.de.includes(area)))
            .filter((c) => !estado || c.estado === estado)
            .map(publica),
      }),
  })
}

/** GET /referrals?recordId= — las del expediente (pestaña Canalizaciones de P-14). */
export function useCanalizacionesDeExpediente(expedienteId: string) {
  return useQuery({
    queryKey: ['canalizaciones', 'expediente', expedienteId],
    queryFn: () =>
      pedir<Canalizacion[]>({
        metodo: 'GET',
        ruta: `/referrals${consulta({ recordId: expedienteId })}`,
        simulado: () => lista.filter((c) => c.expedienteId === expedienteId).map(publica),
      }),
  })
}

const SIGUIENTE: Record<Accion, EstadoCanalizacion> = { accept: 'aceptada', reject: 'rechazada', complete: 'completada', cancel: 'cancelada' }

/** POST /referrals/{referralId}/transitions con If-Match = versionTag. */
export function useTransicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { id: string; accion: Accion; versionTag: string; motivo?: string }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/referrals/${c.id}/transitions`,
        cuerpo: { action: c.accion, motivo: c.motivo },
        simulado: () => {
          const x = lista.find((r) => r.id === c.id)
          if (x) {
            x.estado = SIGUIENTE[c.accion]
            x.versionTag = `r${Number(x.versionTag.slice(1)) + 1}`
          }
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canalizaciones'] }),
  })
}

/** POST /case-files/{recordId}/referrals — interna (a un área) o externa (institución, supuesto 6). */
export function useCanalizar(expedienteId: string, alias: string, area: Area) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { tipo: 'interna' | 'externa'; destino: string; resumen: string }) =>
      pedir<{ id: string }>({
        metodo: 'POST',
        ruta: `/case-files/${expedienteId}/referrals`,
        cuerpo: { ...c, operationId: crypto.randomUUID() },
        simulado: () => {
          const id = `ca${lista.length + 1}`
          const destinoArea = (Object.entries(AREAS_TEXTO).find(([, t]) => t === c.destino)?.[0] ?? null) as Area | null
          lista.unshift({ id, expedienteId, alias, ...c, origen: textoArea(area), estado: 'pendiente', fecha: new Date().toISOString().slice(0, 10), versionTag: 'r1', para: destinoArea ? [destinoArea] : [], de: [area] })
          return { id }
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canalizaciones'] }),
  })
}
