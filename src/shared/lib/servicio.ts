import { apiFetch } from '@/api/client'

/**
 * Capa única por la que pasan todas las llamadas de las pantallas.
 *
 * En desarrollo y producción apunta por defecto a la API real (/api).
 * En modo test (Vitest) usa datos simulados salvo que VITE_DATOS_SIMULADOS='false'.
 * Para trabajar sin backend en desarrollo: VITE_DATOS_SIMULADOS=true npm run dev
 */
export function esModoSimulado(): boolean {
  return (
    import.meta.env.VITE_DATOS_SIMULADOS === 'true' ||
    (import.meta.env.MODE === 'test' && import.meta.env.VITE_DATOS_SIMULADOS !== 'false')
  )
}

export const USAR_SIMULADOS = esModoSimulado()

const PREFIJO = (import.meta.env.VITE_API_PREFIX ?? '/api').replace(/\/$/, '')
const LATENCIA_MS = import.meta.env.MODE === 'test' ? 0 : 250

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type Peticion<T> = {
  metodo: Metodo
  ruta: string
  cuerpo?: unknown
  headers?: Record<string, string>
  skipUnauthorizedHandler?: boolean
  /** Adapta la respuesta real del backend al tipo que consumen las pantallas. */
  adaptar?: (raw: unknown) => T
  /** Respuesta simulada mientras se trabaja sin backend o en pruebas. */
  simulado: () => T
}

export function prefijoApi(): string {
  return PREFIJO
}

export function formatIfMatch(versionTag: string): string {
  const trimmed = versionTag.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed
  if (trimmed.startsWith('W/"') && trimmed.endsWith('"')) return trimmed
  return `"${trimmed}"`
}

export async function pedir<T>({
  metodo,
  ruta,
  cuerpo,
  headers,
  skipUnauthorizedHandler,
  adaptar,
  simulado,
}: Peticion<T>): Promise<T> {
  if (esModoSimulado()) {
    await new Promise((r) => setTimeout(r, LATENCIA_MS))
    // Copia para que la pantalla no modifique los datos simulados compartidos.
    return structuredClone(simulado())
  }
  const raw = await apiFetch<unknown>(`${PREFIJO}${ruta}`, {
    method: metodo,
    headers,
    skipUnauthorizedHandler,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  return adaptar ? adaptar(raw) : (raw as T)
}

/** Construye la cadena de consulta omitiendo valores vacíos. */
export function consulta(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}
