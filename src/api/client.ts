// Cliente HTTP mínimo. Reglas:
// - Las credenciales viajan solo por cookie de sesión del mismo origen (HttpOnly).
// - El token anti-CSRF vive solo en memoria: nunca en localStorage ni sessionStorage.
// - Los errores se normalizan y no exponen detalles internos.

let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId: string | undefined

  constructor(status: number, code: string, correlationId?: string) {
    super(`Error ${status}: ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.correlationId = correlationId
  }
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (MUTATING.has(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken)

  const response = await fetch(path, { ...init, method, headers, credentials: 'same-origin' })

  if (!response.ok) {
    let code = 'error'
    let correlationId: string | undefined
    try {
      const body = (await response.json()) as { code?: string; correlation_id?: string }
      code = body.code ?? code
      correlationId = body.correlation_id
    } catch {
      // cuerpo no JSON: se conserva el código genérico
    }
    throw new ApiError(response.status, code, correlationId)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
