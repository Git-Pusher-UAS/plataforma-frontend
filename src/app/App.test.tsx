import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'

// El módulo virtual del service worker no existe en las pruebas.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('rutas', () => {
  it('muestra el panel en la raíz', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Panel' })).toBeInTheDocument()
  })

  it('siempre muestra el botón de salida rápida', () => {
    renderAt('/')
    expect(screen.getByRole('button', { name: /salida rápida/i })).toBeInTheDocument()
  })

  it('muestra página no encontrada en rutas desconocidas', () => {
    renderAt('/no-existe')
    expect(screen.getByRole('heading', { name: /no encontrada/i })).toBeInTheDocument()
  })
})
