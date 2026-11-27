import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { setCsrfToken } from '@/api/client'
import { useEditarCuenta } from '@/features/administracion/api'
import { useBitacora } from '@/features/bitacora/api'
import { useTransicion } from '@/features/canalizacion/api'
import { useCambiarEstado, useCrearExpediente, useCrearNota, useRevocarConsentimiento } from '@/features/expedientes/api'
import { SesionProvider } from '@/features/identidad/sesion'
import { useMapaCalor } from '@/features/tablero/api'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <SesionProvider
        inicial={{
          personal: {
            id: 'staff-1',
            usuario: 'acastro',
            nombre: 'Ana Castro',
            rol: 'psicologia',
            departmentId: '11111111-1111-1111-1111-111111111111',
          },
        }}
      >
        {children}
      </SesionProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  setCsrfToken(null)
})

describe('adaptadores del panel de personal en modo API real', () => {
  it('POST /case-files envía X-Operation-Id en cabecera y el DTO estricto sin operationId en el cuerpo', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    setCsrfToken('csrf-staff')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'rec-1' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCrearExpediente(), { wrapper })
    const res = await result.current.mutateAsync({
      alias: 'Caso Olivo',
      nombre: 'María López',
      curp: 'XEXX010101MSLXXX07',
      fechaNacimiento: '1995-03-10',
      telefono: '6681234567',
      sectorId: 'sec-12',
      origenContacto: 'presencial',
      propositoIds: ['prop-1'],
      consentimiento: 'aceptado',
      operationId: 'op-uuid-1',
    })

    expect(res).toEqual({ id: 'rec-1' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/case-files')
    expect(init.method).toBe('POST')
    const headers = new Headers(init.headers)
    expect(headers.get('X-Operation-Id')).toBe('op-uuid-1')
    expect(headers.get('X-CSRF-Token')).toBe('csrf-staff')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('operationId')
    expect(body).toMatchObject({
      alias: 'Caso Olivo',
      nombre: 'María López',
      curp: 'XEXX010101MSLXXX07',
      fechaNacimiento: '1995-03-10',
      telefono: '6681234567',
      sectorId: 'sec-12',
      origenContacto: 'presencial',
    })
    expect(body.consentimiento).toMatchObject({
      decision: 'aceptado',
      modalidad: 'presencial',
      propositoIds: ['prop-1'],
    })
  })

  it('PATCH /case-files/:id envía If-Match entre comillas y { estado, motivo }', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'rec-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCambiarEstado('rec-1'), { wrapper })
    await result.current.mutateAsync({ estado: 'abierto', version: 'v3.sig', motivo: 'Reapertura solicitada por la persona' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/case-files/rec-1')
    expect(init.method).toBe('PATCH')
    expect(new Headers(init.headers).get('If-Match')).toBe('"v3.sig"')
    expect(JSON.parse(String(init.body))).toEqual({ estado: 'abierto', motivo: 'Reapertura solicitada por la persona' })
  })

  it('POST /case-files/:id/departments/:depUUID/notes usa departmentId UUID y X-Operation-Id', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            departamentos: [],
            roles: [],
            sectores: [],
            origenesContacto: [],
            propositosConsentimiento: [],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'note-1',
            episodioId: 'ep-1',
            autorId: 'staff-1',
            texto: 'Seguimiento semanal',
            ocurridoEn: '2026-11-26T16:00:00.000Z',
            createdAt: '2026-11-26T16:05:00.000Z',
          }),
          { status: 201 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCrearNota('rec-1', 'psicologia'), { wrapper })
    const note = await result.current.mutateAsync({
      texto: 'Seguimiento semanal',
      horaDeclarada: '2026-11-26T16:00',
      autor: 'Ana Castro',
    })

    const noteCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/notes')) as [string, RequestInit]
    expect(noteCall[0]).toBe('/api/case-files/rec-1/departments/11111111-1111-1111-1111-111111111111/notes')
    expect(new Headers(noteCall[1].headers).get('X-Operation-Id')).toBeTruthy()
    expect(JSON.parse(String(noteCall[1].body))).toEqual({
      texto: 'Seguimiento semanal',
      ocurridoEn: new Date('2026-11-26T16:00').toISOString(),
    })
    expect(note).toMatchObject({ id: 'note-1', autor: 'Ana Castro', texto: 'Seguimiento semanal' })
  })

  it('POST /case-files/:id/consents/:consentId/revocations envía propositoIds', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useRevocarConsentimiento('rec-1'), { wrapper })
    await result.current.mutateAsync({ consentId: 'con-1', propositoId: 'prop-2' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/case-files/rec-1/consents/con-1/revocations')
    expect(JSON.parse(String(init.body))).toEqual({ propositoIds: ['prop-2'] })
  })

  it('POST /referrals/:id/transitions envía If-Match', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'ref-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useTransicion(), { wrapper })
    await result.current.mutateAsync({ id: 'ref-1', accion: 'reject', versionTag: 'tag-7', motivo: 'No corresponde al área' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/referrals/ref-1/transitions')
    expect(new Headers(init.headers).get('If-Match')).toBe('"tag-7"')
    expect(JSON.parse(String(init.body))).toEqual({ action: 'reject', motivo: 'No corresponde al área' })
  })

  it('PATCH /users/:id envía If-Match y valores de rol/estado del backend', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'u-2' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useEditarCuenta(), { wrapper })
    await result.current.mutateAsync({
      id: 'u-2',
      versionTag: 'etag-u2',
      departamentoId: 'dep-jur',
      cambios: { rol: 'juridico', estado: 'suspendida' },
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/users/u-2')
    expect(init.method).toBe('PATCH')
    expect(new Headers(init.headers).get('If-Match')).toBe('"etag-u2"')
    expect(JSON.parse(String(init.body))).toEqual({
      rol: 'Jurídico',
      departamentoId: 'dep-jur',
      estado: 'suspendido',
    })
  })

  it('GET /analytics/heatmap adapta niveles 1-5 y celdas suprimidas', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { sectorId: '2500100010123', nivel: 4, count: 18, suppressed: false },
          { sectorId: '2500100010999', count: null, suppressed: true },
        ]),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useMapaCalor(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      '2500100010123': 4,
      '2500100010999': 'suprimido',
    })
  })

  it('GET /audit-logs omite actorId/recordId no-UUID y adapta actor.nombreLaboral', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'log-1',
            fecha: '2026-11-26T17:00:00Z',
            actor: { id: 'u-1', nombreLaboral: 'Ana Castro' },
            rol: 'Psicología',
            accion: 'Consulta',
            expediente: null,
            detalle: null,
          },
        ]),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useBitacora({ actor: 'ana' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchMock).toHaveBeenCalledWith('/api/audit-logs', expect.objectContaining({ method: 'GET' }))
    expect(result.current.data).toEqual([
      {
        id: 'log-1',
        fecha: '2026-11-26T17:00:00Z',
        actor: 'Ana Castro',
        rol: 'Psicología',
        accion: 'Consulta',
        expediente: undefined,
        detalle: '',
      },
    ])
  })
})
