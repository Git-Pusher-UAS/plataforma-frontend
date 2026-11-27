import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pedir } from '@/shared/lib/servicio'

export type Pregunta = { id: string; texto: string; tipo: 'escala' | 'opcion' | 'abierta'; opciones?: string[] }
export type RespuestaValor = string | number
// Títulos neutros: nunca nombran el motivo de la atención (RF-07).
export type Encuesta = { id: string; titulo: string; minutos: number; preguntas: Pregunta[] }
export type Resultado = {
  encuestaId: string
  titulo: string
  respuestas: number | null
  preguntas: { id: string; texto: string; tipo: Pregunta['tipo']; promedio?: number; conteo?: { opcion: string; total: number | null }[] }[]
}

export const ESCALA_POR_DEFECTO = ['1', '2', '3', '4', '5']

/** Garantiza que las preguntas de tipo escala tengan opciones cuando el backend las omite. */
export function normalizarEncuesta(raw: unknown): Encuesta {
  const e = raw as Encuesta
  return {
    ...e,
    preguntas: (e.preguntas ?? []).map((p) =>
      p.tipo === 'escala' && (!Array.isArray(p.opciones) || p.opciones.length === 0)
        ? { ...p, opciones: [...ESCALA_POR_DEFECTO] }
        : p,
    ),
  }
}

const pendientes: Encuesta[] = [
  {
    id: 'en1',
    titulo: 'Cuéntanos cómo te fue',
    minutos: 2,
    preguntas: [
      { id: 'p1', texto: '¿Qué tan fácil fue recibir atención?', tipo: 'escala', opciones: ESCALA_POR_DEFECTO },
      { id: 'p2', texto: '¿Te sentiste escuchada?', tipo: 'opcion', opciones: ['Sí', 'Más o menos', 'No'] },
      { id: 'p3', texto: '¿Algo que podamos mejorar? (opcional)', tipo: 'abierta' },
    ],
  },
  {
    id: 'en2',
    titulo: 'Tu opinión sobre el curso',
    minutos: 1,
    preguntas: [
      { id: 'p1', texto: '¿Qué tan útil te pareció el curso?', tipo: 'escala', opciones: ESCALA_POR_DEFECTO },
      { id: 'p2', texto: '¿Lo recomendarías?', tipo: 'opcion', opciones: ['Sí', 'No'] },
    ],
  },
]

const resultados: Resultado[] = [
  {
    encuestaId: 'en1',
    titulo: 'Cuéntanos cómo te fue',
    respuestas: 64,
    preguntas: [
      { id: 'p1', texto: '¿Qué tan fácil fue recibir atención?', tipo: 'escala', promedio: 4.3 },
      { id: 'p2', texto: '¿Te sentiste escuchada?', tipo: 'opcion', conteo: [{ opcion: 'Sí', total: 51 }, { opcion: 'Más o menos', total: 10 }, { opcion: 'No', total: null }] },
    ],
  },
  {
    encuestaId: 'en2',
    titulo: 'Tu opinión sobre el curso',
    respuestas: 38,
    preguntas: [
      { id: 'p1', texto: '¿Qué tan útil te pareció el curso?', tipo: 'escala', promedio: 4.6 },
      { id: 'p2', texto: '¿Lo recomendarías?', tipo: 'opcion', conteo: [{ opcion: 'Sí', total: 35 }, { opcion: 'No', total: null }] },
    ],
  },
]

/** GET /surveys/pending (usuaria) */
export function useEncuestasPendientes() {
  return useQuery({
    queryKey: ['encuestas', 'pendientes'],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: '/surveys/pending',
        adaptar: (raw) => (Array.isArray(raw) ? raw.map(normalizarEncuesta) : []),
        simulado: () => pendientes,
      }),
  })
}

/** GET /surveys/{id} */
export function useEncuesta(id: string) {
  return useQuery({
    queryKey: ['encuesta', id],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: `/surveys/${id}`,
        adaptar: (raw) => (raw ? normalizarEncuesta(raw) : null),
        simulado: () => pendientes.find((e) => e.id === id) ?? null,
      }),
  })
}

/** POST /surveys/{id}/responses */
export function useResponderEncuesta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { id: string; respuestas: Record<string, RespuestaValor> }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/surveys/${c.id}/responses`,
        cuerpo: { respuestas: c.respuestas, operationId: crypto.randomUUID() },
        simulado: () => {
          const i = pendientes.findIndex((e) => e.id === c.id)
          if (i >= 0) pendientes.splice(i, 1)
        },
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['encuestas'] })
      void qc.invalidateQueries({ queryKey: ['encuesta', variables.id] })
    },
  })
}

/** GET /surveys/results — solo cifras agregadas (supuesto 9). */
export function useResultadosEncuestas() {
  return useQuery({ queryKey: ['encuestas', 'resultados'], queryFn: () => pedir({ metodo: 'GET', ruta: '/surveys/results', simulado: () => resultados }) })
}
