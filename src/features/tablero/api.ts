import { useQuery } from '@tanstack/react-query'
import type { NivelSector } from '@/features/tablero/MapaCalorAhome'
import { fecha } from '@/shared/lib/formato'
import { consulta, pedir } from '@/shared/lib/servicio'

export type Periodo = '30d' | '6m' | '12m'
export type Indicador = { clave: string; titulo: string; valor: number | null; detalle: string; suprimido?: boolean }
export type Serie = { etiqueta: string; valor: number | null }
export type Resumen = {
  corte: string
  metodologia: string
  indicadores: Indicador[]
  porMes: Serie[]
  porOrigen: Serie[]
  porArea: Serie[]
}

type RawHeatmapCell = {
  sectorId: string
  nivel?: number
  count: number | null
  suppressed: boolean
}

const MESES = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']

/** GET /analytics/summary?period= — cifras agregadas y anonimizadas; null = suprimido (menos de 5 casos). */
export function useResumen(periodo: Periodo) {
  return useQuery({
    queryKey: ['analitica', 'resumen', periodo],
    queryFn: () =>
      pedir<Resumen>({
        metodo: 'GET',
        ruta: `/analytics/summary${consulta({ period: periodo })}`,
        adaptar: (raw) => {
          const r = raw as Resumen
          return {
            ...r,
            corte: r.corte ? fecha(r.corte) : '',
          }
        },
        simulado: () => {
          const f = periodo === '30d' ? 0.12 : periodo === '6m' ? 0.55 : 1
          const n = (x: number) => Math.round(x * f)
          return {
            corte: '25 de noviembre de 2026',
            metodologia: 'Personas únicas por CURP; cada expediente cuenta una vez. Datos de ejemplo.',
            indicadores: [
              { clave: 'casos', titulo: 'Casos registrados', valor: n(1248), detalle: 'sin duplicados' },
              { clave: 'sectores', titulo: 'Sectores con nivel 4 o 5', valor: 5, detalle: 'de 24 sectores' },
              { clave: 'canalizadas', titulo: 'Atenciones canalizadas', valor: n(812), detalle: 'con seguimiento' },
              { clave: 'alertas', titulo: 'Solicitudes de ayuda', valor: n(96), detalle: 'desde el portal' },
            ],
            porMes: MESES.map((m, i) => ({ etiqueta: m, valor: n([92, 104, 118, 111, 126, 133][i]! * 1.6) })),
            porOrigen: [
              { etiqueta: 'Presencial', valor: n(512) },
              { etiqueta: 'Línea 24/7', valor: n(301) },
              { etiqueta: 'Otra institución', valor: n(214) },
              { etiqueta: 'Patrulla o 911', valor: n(158) },
              { etiqueta: 'Autorregistro', valor: periodo === '30d' ? null : n(63) },
            ],
            porArea: [
              { etiqueta: 'Trabajo social', valor: n(1248) },
              { etiqueta: 'Psicología', valor: n(689) },
              { etiqueta: 'Jurídico', valor: n(437) },
            ],
          }
        },
      }),
  })
}

/** GET /analytics/heatmap — niveles agregados por sector/AGEB con supresión k < 5. */
export function useMapaCalor() {
  return useQuery({
    queryKey: ['analitica', 'heatmap'],
    queryFn: () =>
      pedir<Record<string, NivelSector>>({
        metodo: 'GET',
        ruta: '/analytics/heatmap',
        adaptar: (raw) => {
          const cells = Array.isArray(raw) ? (raw as RawHeatmapCell[]) : []
          const mapa: Record<string, NivelSector> = {}
          for (const c of cells) {
            if (c.suppressed) {
              mapa[c.sectorId] = 'suprimido'
            } else {
              const lvl = Math.min(5, Math.max(1, c.nivel ?? 1)) as 1 | 2 | 3 | 4 | 5
              mapa[c.sectorId] = lvl
            }
          }
          return mapa
        },
        simulado: () => ({}),
      }),
  })
}
