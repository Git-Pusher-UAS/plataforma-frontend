import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCatalogos } from '@/api/catalogos'
import { setCsrfToken } from '@/api/client'
import { useLoginPersonal, useMisSesiones } from '@/features/identidad/api'
import { mapRolBackend, SesionProvider } from '@/features/identidad/sesion'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{}}>{children}</SesionProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  setCsrfToken(null)
})

describe('mapRolBackend', () => {
  it('mapea todos los roles semilla del backend a roles del frontend', () => {
    expect(mapRolBackend('TrabajoSocial')).toBe('trabajo-social')
    expect(mapRolBackend('Psicología')).toBe('psicologia')
    expect(mapRolBackend('Jurídico')).toBe('juridico')
    expect(mapRolBackend('Capacitación')).toBe('capacitacion')
    expect(mapRolBackend('admin')).toBe('administracion')
    expect(mapRolBackend('Coordinación')).toBe('administracion')
    expect(mapRolBackend('Dirección')).toBe('administracion')
    expect(mapRolBackend('AdministradorTI')).toBe('administracion')
    expect(mapRolBackend('AdministraciónAnalítica')).toBe('administracion')
  })
})

describe('identidad y catálogos en modo API real', () => {
  it('useLoginPersonal maneja respuesta 202 con desafío MFA', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challengeId: 'ch-real-1', next: 'totp' }), { status: 202 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useLoginPersonal(), { wrapper })
    const res = await result.current.mutateAsync({ usuario: 'lmendez', contrasena: 'secret' })

    expect(res).toEqual({ kind: 'challenge', challengeId: 'ch-real-1', next: 'totp' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'lmendez', password: 'secret' }),
      }),
    )
  })

  it('useLoginPersonal maneja respuesta 200 directa sin MFA e hidrata departmentId', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            csrf_token: 'csrf-200',
            usuario: {
              id: 'u-1',
              usuario: 'admin',
              nombre_laboral: 'Admin Inicial',
              rol: 'admin',
              permisos: ['admin'],
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            actor: { id: 'u-1', rol: 'admin', departmentId: 'dep-sis', displayName: 'Admin Inicial', permissions: ['admin'] },
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useLoginPersonal(), { wrapper })
    const res = await result.current.mutateAsync({ usuario: 'admin', contrasena: 'secret' })

    expect(res).toEqual({
      kind: 'authenticated',
      personal: {
        id: 'u-1',
        usuario: 'admin',
        nombre: 'Admin Inicial',
        rol: 'administracion',
        rolCodigo: 'admin',
        departmentId: 'dep-sis',
        permisos: ['admin'],
      },
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/users/me', expect.objectContaining({ method: 'GET' }))
  })

  it('useMisSesiones desenvuelve { items, nextCursor }', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 's-1',
              deviceLabel: 'Navegador web',
              lastActivityAt: '2026-11-26T17:40:00Z',
              current: true,
            },
          ],
          nextCursor: null,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useMisSesiones(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]).toMatchObject({
      id: 's-1',
      dispositivo: 'Navegador web',
      actual: true,
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/users/me/sessions', expect.objectContaining({ method: 'GET' }))
  })

  it('useCatalogos consulta GET /api/catalogs', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const payload = {
      departamentos: [{ id: 'd1', codigo: 'TRABAJO_SOCIAL', nombre: 'Trabajo social' }],
      roles: [{ id: 'r1', codigo: 'TrabajoSocial', nombre: 'Trabajo Social' }],
      sectores: [{ id: 's1', nombre: 'Sector 12', tipo: 'sector' }],
      origenesContacto: [{ codigo: 'presencial', nombre: 'Presencial' }],
      propositosConsentimiento: [{ id: 'p1', codigo: 'atencion', descripcion: 'Atención', opcional: false }],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCatalogos(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith('/api/catalogs', expect.objectContaining({ method: 'GET' }))
  })
})
