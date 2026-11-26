import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, setCsrfToken } from '@/api/client'

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

describe('apiFetch', () => {
  it('no envía el token CSRF en peticiones de lectura', async () => {
    setCsrfToken('abc')
    const fn = mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await apiFetch('/api/v1/health')
    const init = fn.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).has('X-CSRF-Token')).toBe(false)
  })

  it('envía el token CSRF en peticiones que modifican datos', async () => {
    setCsrfToken('abc')
    const fn = mockFetch(new Response(JSON.stringify({}), { status: 200 }))
    await apiFetch('/api/v1/algo', { method: 'POST', body: '{}' })
    const init = fn.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('abc')
  })

  it('usa credenciales solo del mismo origen', async () => {
    const fn = mockFetch(new Response('{}', { status: 200 }))
    await apiFetch('/api/v1/health')
    const init = fn.mock.calls[0]?.[1] as RequestInit
    expect(init.credentials).toBe('same-origin')
  })

  it('normaliza los errores sin exponer detalles internos', async () => {
    mockFetch(
      new Response(JSON.stringify({ code: 'sin_acceso', correlation_id: 'c-1', stack: 'secreto' }), {
        status: 404,
      }),
    )
    const error = await apiFetch('/api/v1/expedientes/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).code).toBe('sin_acceso')
    expect((error as ApiError).correlationId).toBe('c-1')
    expect((error as ApiError).message).not.toContain('secreto')
  })

  it('usa un código genérico si el cuerpo del error no es JSON', async () => {
    mockFetch(new Response('<html>boom</html>', { status: 500 }))
    const error = await apiFetch('/api/v1/health').catch((e: unknown) => e)
    expect((error as ApiError).code).toBe('error')
  })

  it('devuelve undefined con 204', async () => {
    mockFetch(new Response(null, { status: 204 }))
    await expect(apiFetch('/api/v1/algo', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
