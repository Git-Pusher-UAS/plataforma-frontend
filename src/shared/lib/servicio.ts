import { apiFetch } from '@/api/client'

/**
 * Capa única por la que pasan todas las llamadas de las pantallas.
 *
 * Mientras el backend no publique el endpoint en contract/openapi.yaml, cada servicio
 * responde con datos simulados (ficticios, sin datos reales). Para usar la API real:
 *   VITE_DATOS_SIMULADOS=false npm run dev    (o make dev-mock para el servidor Prism)
 *
 * Cada llamada declara el endpoint que necesitará. La lista completa, marcando cuáles
 * ya existen en el contrato, está en docs/ENDPOINTS_REQUERIDOS_SAI.md.
 */
export const USAR_SIMULADOS = import.meta.env.VITE_DATOS_SIMULADOS !== 'false'

const PREFIJO = '/api/v1'
const LATENCIA_MS = import.meta.env.MODE === 'test' ? 0 : 250

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type Peticion<T> = {
  metodo: Metodo
  ruta: string
  cuerpo?: unknown
  /** Respuesta simulada mientras el endpoint no existe. */
  simulado: () => T
}

export async function pedir<T>({ metodo, ruta, cuerpo, simulado }: Peticion<T>): Promise<T> {
  if (USAR_SIMULADOS) {
    await new Promise((r) => setTimeout(r, LATENCIA_MS))
    // Copia para que la pantalla no modifique los datos simulados compartidos.
    return structuredClone(simulado())
  }
  return apiFetch<T>(`${PREFIJO}${ruta}`, {
    method: metodo,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}

/** Construye la cadena de consulta omitiendo valores vacíos. */
export function consulta(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}
