import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider, type EmpresaSesion } from '@/features/identidad/sesion'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

const APROBADA: EmpresaSesion = { id: 'em1', nombre: 'Empresa aliada A', estado: 'aprobada' }

function renderEmpresa(path: string, empresa?: EmpresaSesion) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{ empresa }}>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
}

describe('portal de empresas: acceso, registro y navegación', () => {
  it('muestra enlace de volver en /e y en /e/codigo', async () => {
    const u = userEvent.setup()
    renderEmpresa('/e')
    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/')

    await u.type(screen.getByLabelText('Correo de la empresa'), 'rh@aliada-a.test')
    await u.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByRole('heading', { name: 'Escribe tu código' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/e')
  })

  it('normaliza el RFC, abre el aviso de privacidad sin marcar el checkbox y conserva los datos en /e/registro', async () => {
    const u = userEvent.setup()
    renderEmpresa('/e/registro')

    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/e')

    const nombre = screen.getByLabelText('Nombre de la empresa')
    const rfc = screen.getByLabelText('RFC')
    await u.type(nombre, 'Comercial del Norte')
    await u.type(rfc, 'cdn-010203ñ&abc9')

    expect(rfc).toHaveValue('CDN010203ABC9')
    expect(rfc).toHaveAttribute('minlength', '12')
    expect(rfc).toHaveAttribute('maxlength', '13')

    const checkbox = screen.getByRole('checkbox', { name: /Acepto el aviso de privacidad/i })
    expect(checkbox).not.toBeChecked()

    await u.click(screen.getByRole('button', { name: 'aviso de privacidad' }))
    expect(await screen.findByRole('heading', { name: 'Aviso de privacidad' })).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
    expect(nombre).toHaveValue('Comercial del Norte')

    await u.click(screen.getByRole('button', { name: 'Entendido', hidden: true }))
    expect(screen.queryByRole('heading', { name: 'Aviso de privacidad', hidden: true })).not.toBeInTheDocument()
  })

  it('muestra enlace superior a Mis vacantes en /e/vacantes/nueva', async () => {
    renderEmpresa('/e/vacantes/nueva', APROBADA)
    const main = await screen.findByRole('main')
    expect(within(main).getByRole('link', { name: 'Mis vacantes' })).toHaveAttribute('href', '/e/vacantes')
  })
})
