import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { normalizarEncuesta, type Encuesta } from '@/features/encuestas/api'
import { SesionProvider } from '@/features/identidad/sesion'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

const ENCUESTA_SIN_OPCIONES_ESCALA: Encuesta = {
  id: '00000000-0000-0000-0000-000000000101',
  titulo: 'Encuesta de satisfacción',
  minutos: 2,
  preguntas: [
    { id: 'q1', texto: '¿Qué tan clara fue la atención recibida? (1 a 5)', tipo: 'escala' },
    { id: 'q2', texto: '¿Cómo calificas el trato del personal?', tipo: 'opcion', opciones: ['Excelente', 'Buena', 'Regular'] },
    { id: 'q3', texto: '¿Tienes algún comentario o sugerencia?', tipo: 'abierta' },
  ],
}

function renderPortalEn(ruta: string) {
  const router = createMemoryRouter(routes, { initialEntries: [ruta] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{ usuaria: { alias: 'María' } }}>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: status === 204 ? undefined : { 'Content-Type': 'application/json' },
  })
}

describe('encuestas del portal (/u/pendientes)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('normalizarEncuesta rellena las opciones 1..5 cuando escala viene sin opciones', () => {
    const normalizada = normalizarEncuesta(ENCUESTA_SIN_OPCIONES_ESCALA)
    expect(normalizada.preguntas[0]?.opciones).toEqual(['1', '2', '3', '4', '5'])
    expect(normalizada.preguntas[1]?.opciones).toEqual(['Excelente', 'Buena', 'Regular'])
  })

  it('permite contestar una encuesta con escala sin opciones y envía el valor de escala como número', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const envios: Array<{ respuestas: Record<string, unknown>; operationId: string }> = []

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      if (url.endsWith('/surveys/pending')) {
        return jsonResponse(envios.length === 0 ? [ENCUESTA_SIN_OPCIONES_ESCALA] : [])
      }
      if (url.endsWith(`/surveys/${ENCUESTA_SIN_OPCIONES_ESCALA.id}`) && method === 'GET') {
        return jsonResponse(ENCUESTA_SIN_OPCIONES_ESCALA)
      }
      if (url.endsWith(`/surveys/${ENCUESTA_SIN_OPCIONES_ESCALA.id}/responses`) && method === 'POST') {
        envios.push(JSON.parse(String(init?.body)) as { respuestas: Record<string, unknown>; operationId: string })
        return jsonResponse(null, 204)
      }
      return jsonResponse({ code: 'NOT_FOUND' }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    const u = userEvent.setup()
    renderPortalEn('/u/pendientes')

    await u.click(await screen.findByRole('link', { name: 'Contestar' }))

    expect(await screen.findByText('¿Qué tan clara fue la atención recibida? (1 a 5)')).toBeInTheDocument()
    for (const opcion of ['1', '2', '3', '4', '5']) {
      expect(screen.getByRole('radio', { name: opcion })).toBeInTheDocument()
    }
    expect(screen.getByText('1 · Nada')).toBeInTheDocument()
    expect(screen.getByText('5 · Mucho')).toBeInTheDocument()

    const siguiente = screen.getByRole('button', { name: 'Siguiente' })
    expect(siguiente).toBeDisabled()

    await u.click(screen.getByRole('radio', { name: '4' }))
    expect(siguiente).toBeEnabled()
    await u.click(siguiente)

    expect(await screen.findByText('¿Cómo calificas el trato del personal?')).toBeInTheDocument()
    await u.click(screen.getByRole('radio', { name: 'Excelente' }))

    await u.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('radio', { name: '4' })).toBeChecked()
    await u.click(screen.getByRole('button', { name: 'Siguiente' }))
    await u.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(await screen.findByText('¿Tienes algún comentario o sugerencia?')).toBeInTheDocument()
    await u.type(screen.getByLabelText('Tu respuesta'), '  Muy buena atención  ')
    await u.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(envios).toHaveLength(1))
    expect(envios[0]?.respuestas).toEqual({
      q1: 4,
      q2: 'Excelente',
      q3: 'Muy buena atención',
    })
    expect(typeof envios[0]?.respuestas.q1).toBe('number')
    expect(envios[0]?.operationId).toBeTruthy()
    expect(await screen.findByText('No tienes pendientes. ¡Gracias!')).toBeInTheDocument()
  })

  it('permite enviar pregunta abierta en blanco y omite la clave vacía del payload', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    const envios: Array<{ respuestas: Record<string, unknown> }> = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = (init?.method ?? 'GET').toUpperCase()
        if (url.endsWith(`/surveys/${ENCUESTA_SIN_OPCIONES_ESCALA.id}`) && method === 'GET') {
          return jsonResponse(ENCUESTA_SIN_OPCIONES_ESCALA)
        }
        if (url.endsWith(`/surveys/${ENCUESTA_SIN_OPCIONES_ESCALA.id}/responses`) && method === 'POST') {
          envios.push(JSON.parse(String(init?.body)) as { respuestas: Record<string, unknown> })
          return jsonResponse(null, 204)
        }
        if (url.endsWith('/surveys/pending')) {
          return jsonResponse([])
        }
        return jsonResponse({}, 404)
      }),
    )

    const u = userEvent.setup()
    renderPortalEn(`/u/pendientes/${ENCUESTA_SIN_OPCIONES_ESCALA.id}`)

    await u.click(await screen.findByRole('radio', { name: '5' }))
    await u.click(screen.getByRole('button', { name: 'Siguiente' }))
    await u.click(await screen.findByRole('radio', { name: 'Buena' }))
    await u.click(screen.getByRole('button', { name: 'Siguiente' }))

    const enviar = await screen.findByRole('button', { name: 'Enviar' })
    expect(enviar).toBeEnabled()
    await u.click(enviar)

    await waitFor(() => expect(envios).toHaveLength(1))
    expect(envios[0]?.respuestas).toEqual({ q1: 5, q2: 'Buena' })
    expect('q3' in (envios[0]?.respuestas ?? {})).toBe(false)
  })

  it('muestra alerta clara cuando el servidor responde 409 o 500 al enviar', async () => {
    vi.stubEnv('VITE_DATOS_SIMULADOS', 'false')
    let status = 409

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = (init?.method ?? 'GET').toUpperCase()
        if (url.endsWith(`/surveys/${ENCUESTA_SIN_OPCIONES_ESCALA.id}`) && method === 'GET') {
          return jsonResponse({
            ...ENCUESTA_SIN_OPCIONES_ESCALA,
            preguntas: [ENCUESTA_SIN_OPCIONES_ESCALA.preguntas[0]!],
          })
        }
        if (url.endsWith(`/surveys/${ENCUESTA_SIN_OPCIONES_ESCALA.id}/responses`) && method === 'POST') {
          return jsonResponse({ code: status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR' }, status)
        }
        return jsonResponse({}, 404)
      }),
    )

    const u = userEvent.setup()
    renderPortalEn(`/u/pendientes/${ENCUESTA_SIN_OPCIONES_ESCALA.id}`)

    await u.click(await screen.findByRole('radio', { name: '3' }))
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta encuesta ya fue contestada.')

    status = 500
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar tus respuestas. Intenta de nuevo.')
  })
})
