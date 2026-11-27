import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  useEmpresas,
  useEntregarContacto,
  useGuardarCv,
  useMiCv,
  usePostularme,
  useRegistrarEmpresa,
  useRevisarVacante,
  useVacantesAdmin,
  useVerificarEmpresa,
} from '@/features/bolsa/api'
import { useCrearCuentaUsuaria, useEntrarUsuaria, usePerfil } from '@/features/identidad/api'
import { SesionProvider } from '@/features/identidad/sesion'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{ usuaria: { alias: 'María' } }}>{children}</SesionProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('portal de usuarias y bolsa de trabajo en modo API real', () => {
  it('POST /portal/auth/login envía estrictamente { identificador }', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challengeId: 'ch-p1', telefonoMascara: '••••••67' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useEntrarUsuaria(), { wrapper })
    await result.current.mutateAsync({ tipo: 'curp', curp: 'XEXX010101MSLXXX07' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/portal/auth/login')
    expect(JSON.parse(String(init.body))).toEqual({ identificador: 'XEXX010101MSLXXX07' })
  })

  it('POST /portal/accounts omite correo y envía solo los campos permitidos', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challengeId: 'ch-p2', telefonoMascara: '••••••67' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCrearCuentaUsuaria(), { wrapper })
    await result.current.mutateAsync({
      nombre: 'María López',
      curp: 'XEXX010101MSLXXX07',
      telefono: '6681234567',
      correo: 'maria@ejemplo.mx',
      aceptaAviso: true,
    })

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('correo')
    expect(body).toEqual({
      nombre: 'María López',
      curp: 'XEXX010101MSLXXX07',
      telefono: '6681234567',
      aceptaAviso: true,
    })
  })

  it('GET /portal/me normaliza nombreDiscreto booleano a "Agenda"', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          alias: 'Usuaria-123456',
          telefonoMascara: '••••••67',
          contactosConfianza: [],
          silenciarAvisos: false,
          compartirUbicacion: true,
          nombreDiscreto: true,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePerfil(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.nombreDiscreto).toBe('Agenda')
  })

  it('GET /portal/me/cv devuelve null ante 404 y PUT /portal/me/cv serializa al formato del backend', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'RESOURCE_NOT_FOUND' }), { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            perfil: {
              nombre: 'María',
              titular: JSON.stringify({ horarios: ['Matutino'], inicio: 'De inmediato' }),
              resumen: 'Puntual',
              contacto: '',
            },
            experiencia: [{ empresa: '', puesto: 'Cajera', inicio: '1 a 3 años', fin: '', descripcion: '' }],
            estudios: [{ institucion: '', grado: 'Preparatoria', inicio: '', fin: '' }],
            habilidades: ['Atención a clientes'],
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result: cvQuery } = renderHook(() => useMiCv(), { wrapper })
    await waitFor(() => expect(cvQuery.current.isSuccess).toBe(true))
    expect(cvQuery.current.data).toBeNull()

    const { result: saveCv } = renderHook(() => useGuardarCv(), { wrapper })
    const saved = await saveCv.current.mutateAsync({
      escolaridad: 'Preparatoria',
      experiencia: [{ puesto: 'Cajera', tiempo: '1 a 3 años' }],
      habilidades: ['Atención a clientes'],
      horarios: ['Matutino'],
      inicio: 'De inmediato',
      sobreMi: 'Puntual',
    })

    const putBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body)) as {
      perfil: { nombre: string; titular: string }
    }
    expect(putBody.perfil.nombre).toBe('María')
    expect(saved.escolaridad).toBe('Preparatoria')
    expect(saved.experiencia).toEqual([{ puesto: 'Cajera', tiempo: '1 a 3 años' }])
    expect(saved.horarios).toEqual(['Matutino'])
  })

  it('POST /jobs/:id/applications maneja 204 consultando /portal/me/applications', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'app-99',
              vacanteId: 'job-1',
              puesto: 'Cajera',
              empresa: 'Comercial A',
              estado: 'submitted',
              creadoEn: '2026-11-27T12:00:00Z',
            },
          ]),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePostularme(), { wrapper })
    const postulacion = await result.current.mutateAsync('job-1')

    expect(postulacion.id).toBe('app-99')
    expect(postulacion.estado).toBe('enviada')
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/jobs/job-1/applications', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/portal/me/applications', expect.objectContaining({ method: 'GET' }))
  })

  it('POST /employers/registrations empaqueta rfc/sector/contacto en descripcion y POST /employers/auth/verify encadena /me/registration', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'emp-1', estado: 'pending_review' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ employerId: 'emp-1' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'emp-1',
            nombre: 'Comercial Norte',
            correo: 'rh@norte.test',
            telefono: '6681002000',
            descripcion: 'RFC: CNO010101AA1 | Sector: Comercio | Contacto: Laura',
            estado: 'approved',
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result: reg } = renderHook(() => useRegistrarEmpresa(), { wrapper })
    const created = await reg.current.mutateAsync({
      nombre: 'Comercial Norte',
      rfc: 'CNO010101AA1',
      sector: 'Comercio',
      contacto: 'Laura',
      correo: 'rh@norte.test',
      telefono: '6681002000',
      aceptaAviso: true,
    })

    expect(created).toEqual({ id: 'emp-1', estado: 'en_revision' })
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      nombre: 'Comercial Norte',
      correo: 'rh@norte.test',
      telefono: '6681002000',
      descripcion: 'RFC: CNO010101AA1 | Sector: Comercio | Contacto: Laura',
    })

    const { result: verify } = renderHook(() => useVerificarEmpresa(), { wrapper })
    const session = await verify.current.mutateAsync({ challengeId: 'ech-1', codigo: '123456' })
    expect(session).toEqual({ id: 'emp-1', nombre: 'Comercial Norte', estado: 'aprobada' })
  })

  it('GET /admin/jobs y GET /admin/employers normalizan structs PascalCase y filtran por estado', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              ID: 'v-1',
              EmpleadorID: 'e-1',
              Puesto: 'Recepcionista',
              Empresa: 'Clínica',
              Sector: 'Salud',
              Horario: 'Matutino',
              TipoEmpleo: 'Tiempo completo',
              Ubicacion: 'Los Mochis',
              Descripcion: 'Atención',
              Requisitos: 'Preparatoria\nComputación',
              Estado: 'pending_review',
              PublicadaEn: '2026-11-26T10:00:00Z',
              ActualizadaEn: '2026-11-26T10:00:00Z',
            },
            {
              ID: 'v-2',
              Puesto: 'Cajera',
              Empresa: 'Tienda',
              Sector: 'Comercio',
              Horario: 'Vespertino',
              TipoEmpleo: 'Medio tiempo',
              Ubicacion: 'Ahome',
              Descripcion: 'Cobro',
              Requisitos: '',
              Estado: 'published',
              PublicadaEn: '2026-11-25T10:00:00Z',
              ActualizadaEn: '2026-11-25T10:00:00Z',
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              ID: 'e-1',
              Nombre: 'Clínica',
              Correo: 'rh@clinica.test',
              Telefono: '6681000001',
              Descripcion: 'RFC: CLI010101AA1 | Sector: Salud | Contacto: Ana',
              Estado: 'pending_review',
              CreadoEn: '2026-11-25T09:00:00Z',
            },
          ]),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { result: jobs } = renderHook(() => useVacantesAdmin('en_revision'), { wrapper })
    await waitFor(() => expect(jobs.current.isSuccess).toBe(true))
    expect(jobs.current.data).toHaveLength(1)
    expect(jobs.current.data?.[0]).toMatchObject({
      id: 'v-1',
      puesto: 'Recepcionista',
      estado: 'en_revision',
      requisitos: ['Preparatoria', 'Computación'],
    })

    const { result: emps } = renderHook(() => useEmpresas('en_revision'), { wrapper })
    await waitFor(() => expect(emps.current.isSuccess).toBe(true))
    expect(emps.current.data?.[0]).toMatchObject({
      id: 'e-1',
      nombre: 'Clínica',
      rfc: 'CLI010101AA1',
      sector: 'Salud',
      contacto: 'Ana',
      estado: 'en_revision',
    })
  })

  it('POST /admin/jobs/:id/review y /admin/applications/:id/contact-release envían los cuerpos del backend', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result: review } = renderHook(() => useRevisarVacante('v-1'), { wrapper })
    await review.current.mutateAsync({ aprobar: false, motivo: 'Quitar requisito de edad' })
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      decision: 'reject',
      motivo: 'Quitar requisito de edad',
    })

    const { result: release } = renderHook(() => useEntregarContacto(), { wrapper })
    await release.current.mutateAsync('app-1')
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({
      motivo: 'Confirmación telefónica con la usuaria',
      campos: ['telefono'],
    })
  })
})
