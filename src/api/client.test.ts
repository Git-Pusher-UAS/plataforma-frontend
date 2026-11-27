import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, onUnauthorized, setCsrfToken } from '@/api/client'

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

function clearCookies() {
  for (const name of ['csrf_token', 'portal_csrf_token', 'employer_csrf_token']) {
    document.cookie = `${name}=; Max-Age=0; path=/`
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
  clearCookies()
})

describe('apiFetch', () => {
  it('no envía el token CSRF en peticiones de lectura', async () => {
    setCsrfToken('abc')
    const fn = mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await apiFetch('/api/health')
    const init = fn.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).has('X-CSRF-Token')).toBe(false)
  })

  it('envía el token CSRF en peticiones que modifican datos', async () => {
    setCsrfToken('abc')
    const fn = mockFetch(new Response(JSON.stringify({}), { status: 200 }))
    await apiFetch('/api/algo', { method: 'POST', body: '{}' })
    const init = fn.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('abc')
  })

  it('selecciona el token CSRF de portal o empresa según la ruta', async () => {
    setCsrfToken('staff-tok')
    document.cookie = 'portal_csrf_token=portal-tok; path=/'
    document.cookie = 'employer_csrf_token=emp-tok; path=/'

    const fn = mockFetch(new Response(JSON.stringify({}), { status: 200 }))
    await apiFetch('/api/portal/me', { method: 'PATCH', body: '{}' })
    expect(new Headers((fn.mock.calls[0]?.[1] as RequestInit).headers).get('X-CSRF-Token')).toBe('portal-tok')

    fn.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    await apiFetch('/api/employer/jobs', { method: 'POST', body: '{}' })
    expect(new Headers((fn.mock.calls[1]?.[1] as RequestInit).headers).get('X-CSRF-Token')).toBe('emp-tok')

    fn.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    await apiFetch('/api/surveys/results', { method: 'POST', body: '{}' })
    expect(new Headers((fn.mock.calls[2]?.[1] as RequestInit).headers).get('X-CSRF-Token')).toBe('staff-tok')
  })

  it('usa credenciales solo del mismo origen', async () => {
    const fn = mockFetch(new Response('{}', { status: 200 }))
    await apiFetch('/api/health')
    const init = fn.mock.calls[0]?.[1] as RequestInit
    expect(init.credentials).toBe('same-origin')
  })

  it('normaliza los errores sin exponer detalles internos', async () => {
    mockFetch(
      new Response(JSON.stringify({ code: 'sin_acceso', correlation_id: 'c-1', stack: 'secreto' }), {
        status: 404,
      }),
    )
    const error = await apiFetch('/api/case-files/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).code).toBe('sin_acceso')
    expect((error as ApiError).correlationId).toBe('c-1')
    expect((error as ApiError).message).not.toContain('secreto')
  })

  it('extrae fields y extra del sobre httpx.Write del backend', async () => {
    mockFetch(
      new Response(
        JSON.stringify({
          error: { code: 'PERSON_EXISTS', message: 'detalle interno', requestId: 'req-9', fields: { curp: 'invalida' } },
          code: 'PERSON_EXISTS',
          correlation_id: 'req-9',
          linkToken: 'lt_123',
          department: 'Trabajo social',
        }),
        { status: 409 },
      ),
    )
    const error = (await apiFetch('/api/case-files', { method: 'POST', body: '{}' }).catch((e: unknown) => e)) as ApiError
    expect(error.status).toBe(409)
    expect(error.code).toBe('PERSON_EXISTS')
    expect(error.correlationId).toBe('req-9')
    expect(error.fields).toEqual({ curp: 'invalida' })
    expect(error.extra).toEqual({ linkToken: 'lt_123', department: 'Trabajo social' })
    expect(error.message).not.toContain('detalle interno')
  })

  it('notifica 401 a los listeners salvo cuando skipUnauthorizedHandler es true', async () => {
    const listener = vi.fn()
    const unsub = onUnauthorized(listener)

    mockFetch(new Response(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 }))
    await apiFetch('/api/case-files').catch(() => undefined)
    expect(listener).toHaveBeenCalledWith('/api/case-files')

    listener.mockClear()
    mockFetch(new Response(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 }))
    await apiFetch('/api/users/me', { skipUnauthorizedHandler: true }).catch(() => undefined)
    expect(listener).not.toHaveBeenCalled()

    unsub()
  })

  it('usa un código genérico si el cuerpo del error no es JSON', async () => {
    mockFetch(new Response('<html>boom</html>', { status: 500 }))
    const error = await apiFetch('/api/health').catch((e: unknown) => e)
    expect((error as ApiError).code).toBe('error')
  })

  it('devuelve undefined con 204', async () => {
    mockFetch(new Response(null, { status: 204 }))
    await expect(apiFetch('/api/algo', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
