// Cliente HTTP mínimo. Reglas:
// - Las credenciales viajan solo por cookie de sesión del mismo origen (HttpOnly).
// - El token anti-CSRF vive solo en memoria o en cookie legible por dominio de sesión: nunca en localStorage ni sessionStorage.
// - Los errores se normalizan y no exponen detalles internos.

let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      const val = trimmed.slice(prefix.length)
      return val ? decodeURIComponent(val) : null
    }
  }
  return null
}

function csrfParaRuta(path: string): string | null {
  const clean = path.split('?')[0] ?? path
  if (/\/employers?(\/|$)/.test(clean)) {
    return readCookie('employer_csrf_token')
  }
  const esSurveyPortal = /\/surveys(\/|$)/.test(clean) && !/\/surveys\/results(\/|$)/.test(clean)
  if (
    /\/portal(\/|$)/.test(clean) ||
    /\/help-alerts(\/|$)/.test(clean) ||
    /\/courses\/[^/]+\/enrollments(\/|$)/.test(clean) ||
    /\/jobs\/[^/]+\/applications(\/|$)/.test(clean) ||
    esSurveyPortal
  ) {
    return readCookie('portal_csrf_token')
  }
  return csrfToken ?? readCookie('csrf_token')
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId: string | undefined
  readonly fields: Record<string, string> | undefined
  readonly extra: Record<string, unknown> | undefined

  constructor(
    status: number,
    code: string,
    correlationId?: string,
    fields?: Record<string, string>,
    extra?: Record<string, unknown>,
  ) {
    super(`Error ${status}: ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.correlationId = correlationId
    this.fields = fields
    this.extra = extra
  }
}

type UnauthorizedListener = (path: string) => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

export type ApiFetchInit = RequestInit & {
  skipUnauthorizedHandler?: boolean
}

type RawErrorEnvelope = {
  code?: string
  correlation_id?: string
  error?: {
    code?: string
    requestId?: string
    fields?: Record<string, string>
  }
  [key: string]: unknown
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const RESERVED_ERROR_KEYS = new Set(['error', 'code', 'correlation_id', 'stack'])

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { skipUnauthorizedHandler, ...requestInit } = init
  const method = (requestInit.method ?? 'GET').toUpperCase()
  const headers = new Headers(requestInit.headers)
  headers.set('Accept', 'application/json')
  if (requestInit.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (MUTATING.has(method) && !headers.has('X-CSRF-Token')) {
    const token = csrfParaRuta(path)
    if (token) headers.set('X-CSRF-Token', token)
  }

  const response = await fetch(path, { ...requestInit, method, headers, credentials: 'same-origin' })

  if (!response.ok) {
    if (response.status === 401 && !skipUnauthorizedHandler) {
      for (const listener of unauthorizedListeners) listener(path)
    }
    let code = 'error'
    let correlationId: string | undefined
    let fields: Record<string, string> | undefined
    let extra: Record<string, unknown> | undefined
    try {
      const body = (await response.json()) as RawErrorEnvelope
      code = body.code ?? body.error?.code ?? code
      correlationId = body.correlation_id ?? body.error?.requestId
      fields = body.error?.fields
      const rest: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(body)) {
        if (!RESERVED_ERROR_KEYS.has(k)) rest[k] = v
      }
      if (Object.keys(rest).length > 0) extra = rest
    } catch {
      // cuerpo no JSON: se conserva el código genérico
    }
    throw new ApiError(response.status, code, correlationId, fields, extra)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
