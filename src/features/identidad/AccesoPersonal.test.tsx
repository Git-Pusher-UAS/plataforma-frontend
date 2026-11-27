import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider } from '@/features/identidad/sesion'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

function renderAcceso(path = '/acceso') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SesionProvider>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
}

describe('acceso del personal', () => {
  it('muestra el título institucional de Secretaría de Mujeres y agrupa el pie junto a la tarjeta', async () => {
    renderAcceso('/acceso')
    expect(await screen.findByText('Personal de la Secretaría de Mujeres')).toBeInTheDocument()

    const tarjeta = screen.getByRole('main')
    const pie = screen.getByRole('link', { name: 'Directorio de ayuda' }).closest('p')
    expect(pie).toBeInTheDocument()
    expect(tarjeta.parentElement).toBe(pie?.parentElement)
    expect(tarjeta.parentElement).toHaveClass('acceso-contenido')
    expect(screen.getByRole('link', { name: 'Portal de usuarias' })).toHaveAttribute('href', '/u')
  })

  it('alterna la visibilidad de la contraseña de forma accesible', async () => {
    const u = userEvent.setup()
    renderAcceso('/acceso')

    const input = await screen.findByLabelText('Contraseña')
    const boton = screen.getByRole('button', { name: 'Mostrar contraseña' })

    expect(input).toHaveAttribute('type', 'password')
    expect(boton).toHaveAttribute('aria-pressed', 'false')

    await u.click(boton)
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true')

    await u.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveAttribute('aria-pressed', 'false')
  })
})
