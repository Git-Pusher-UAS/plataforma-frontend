import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SesionProvider } from '@/features/identidad/sesion'

const logout = vi.fn(() => Promise.resolve())
vi.mock('@/features/ayuda/quickExit', () => ({ quickExit: vi.fn() }))
vi.mock('@/features/identidad/api', async (original) => ({
  ...(await original<typeof import('@/features/identidad/api')>()),
  useCerrarSesionUsuaria: () => ({ mutateAsync: logout }),
}))

import { quickExit } from '@/features/ayuda/quickExit'
import { PortalLayout, SALIDA_PORTAL } from '@/features/portal/PortalLayout'

const pintar = (usuaria?: { alias: string }) =>
  render(
    <MemoryRouter initialEntries={['/u/perfil']}>
      <SesionProvider inicial={{ usuaria }}>
        <PortalLayout>contenido</PortalLayout>
      </SesionProvider>
    </MemoryRouter>,
  )

describe('Salir del portal', () => {
  it('con sesión, cierra la sesión en el backend y abre una búsqueda de Wikipedia sobre México', async () => {
    pintar({ alias: 'María' })
    await userEvent.click(screen.getByRole('button', { name: /salida rápida/i }))
    await waitFor(() => expect(quickExit).toHaveBeenCalledWith(SALIDA_PORTAL))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(SALIDA_PORTAL).toMatch(/^https:\/\/es\.wikipedia\.org\/.*search=M%C3%A9xico/)
  })

  it('sin sesión, sale de inmediato sin llamar al backend', async () => {
    logout.mockClear()
    vi.mocked(quickExit).mockClear()
    pintar()
    await userEvent.click(screen.getByRole('button', { name: /salida rápida/i }))
    expect(quickExit).toHaveBeenCalledWith(SALIDA_PORTAL)
    expect(logout).not.toHaveBeenCalled()
  })
})
