import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider, type Personal } from '@/features/identidad/sesion'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

function renderEnRuta(entry: InitialEntry, opts?: { personal?: Personal; usuaria?: { alias: string } }) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{ personal: opts?.personal, usuaria: opts?.usuaria }}>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
}

describe('botones de volver en pantallas secundarias', () => {
  it('ComprobarCurpPage (/expedientes/nuevo) muestra enlace de regreso a /expedientes', async () => {
    renderEnRuta('/expedientes/nuevo', {
      personal: { usuario: 'demo', nombre: 'Persona Demo', rol: 'trabajo-social' },
    })
    expect(await screen.findByRole('heading', { name: /Comprobar CURP/i })).toBeInTheDocument()
    const main = screen.getByRole('main')
    const volver = within(main).getByRole('link', { name: '← Expedientes' })
    expect(volver).toHaveAttribute('href', '/expedientes')
    expect(volver).toHaveClass('enlace-volver')
  })

  it('NuevoCursoPage (/capacitacion/cursos/nuevo) muestra enlace de regreso a /capacitacion/cursos', async () => {
    renderEnRuta('/capacitacion/cursos/nuevo', {
      personal: { usuario: 'demo', nombre: 'Persona Demo', rol: 'capacitacion' },
    })
    expect(await screen.findByRole('heading', { name: /Nuevo curso/i })).toBeInTheDocument()
    const main = screen.getByRole('main')
    const volver = within(main).getByRole('link', { name: '← Cursos' })
    expect(volver).toHaveAttribute('href', '/capacitacion/cursos')
    expect(volver).toHaveClass('enlace-volver')
  })

  it('PendientesUsuariaPage (/u/pendientes) muestra enlace superior Inicio hacia /u/inicio', async () => {
    renderEnRuta('/u/pendientes', { usuaria: { alias: 'María' } })
    expect(await screen.findByRole('heading', { name: /Tus pendientes/i })).toBeInTheDocument()
    const main = screen.getByRole('main')
    const volver = within(main).getByRole('link', { name: 'Inicio' })
    expect(volver).toHaveAttribute('href', '/u/inicio')
    expect(volver).toHaveClass('enlace-volver')
  })

  it('CrearCuentaPage (/u/crear-cuenta) muestra enlace Volver hacia /u', async () => {
    renderEnRuta('/u/crear-cuenta')
    expect(await screen.findByRole('heading', { name: /Crear mi cuenta/i })).toBeInTheDocument()
    const volver = screen.getByRole('link', { name: 'Volver' })
    expect(volver).toHaveAttribute('href', '/u')
    expect(volver).toHaveClass('enlace-discreto')
  })

  it('CodigoPage (/u/codigo) muestra enlace Volver hacia /u/entrar', async () => {
    renderEnRuta({
      pathname: '/u/codigo',
      state: { challengeId: 'c1', telefonoMascara: '•• •••• 67' },
    })
    expect(await screen.findByRole('heading', { name: /Escribe tu código/i })).toBeInTheDocument()
    const volver = screen.getByRole('link', { name: 'Volver' })
    expect(volver).toHaveAttribute('href', '/u/entrar')
    expect(volver).toHaveClass('enlace-discreto')
  })

  it('MantenerPage (/u/ayuda) muestra enlace discreto para volver a /u/inicio', async () => {
    renderEnRuta('/u/ayuda', { usuaria: { alias: 'María' } })
    expect(await screen.findByRole('heading', { name: /Necesito ayuda/i })).toBeInTheDocument()
    const volver = screen.getByRole('link', { name: 'Volver al inicio' })
    expect(volver).toHaveAttribute('href', '/u/inicio')
    expect(volver).toHaveClass('enlace-discreto')
  })
})
