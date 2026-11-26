import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider, type Personal, type Rol } from '@/features/identidad/sesion'

// El módulo virtual del service worker no existe en las pruebas.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

const persona = (rol: Rol): Personal => ({ usuario: 'demo', nombre: 'Persona Demo', rol })

function renderAt(path: string, personal?: Personal, usuaria?: { alias: string }) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{ personal, usuaria }}>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
}

describe('rutas', () => {
  it('sin sesión, el panel lleva a la pantalla de acceso con la salida rápida visible', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salida rápida/i })).toBeInTheDocument()
  })

  it('la verificación no se abre sin haber pasado la contraseña', async () => {
    renderAt('/acceso/verificacion')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('muestra el inicio según el rol y siempre la salida rápida', async () => {
    renderAt('/', persona('capacitacion'))
    expect(await screen.findByRole('heading', { name: /hola, persona/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salida rápida/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /necesito ayuda/i })).toBeInTheDocument()
  })

  it('el menú de Capacitación no ofrece expedientes', async () => {
    renderAt('/', persona('capacitacion'))
    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    expect(menu).not.toHaveTextContent('Expedientes')
    expect(menu).toHaveTextContent('Bolsa de trabajo')
  })

  it('una ruta de otro rol muestra el mismo «no disponible» que una inexistente', async () => {
    renderAt('/expedientes', persona('administracion'))
    expect(await screen.findByRole('heading', { name: 'Recurso no disponible' })).toBeInTheDocument()
  })

  it('muestra «no disponible» en rutas desconocidas', async () => {
    renderAt('/no-existe', persona('psicologia'))
    expect(await screen.findByRole('heading', { name: 'Recurso no disponible' })).toBeInTheDocument()
  })

  it('el portal de usuarias abre con ayuda y salida rápida', async () => {
    renderAt('/u')
    expect(await screen.findByRole('heading', { name: /acompañarte/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Necesito ayuda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salida rápida/i })).toBeInTheDocument()
  })

  it('las pantallas de la usuaria piden sesión', async () => {
    renderAt('/u/perfil')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('un expediente ajeno muestra «no disponible»', async () => {
    renderAt('/expedientes/EXP-0421', persona('psicologia'))
    expect(await screen.findByRole('heading', { name: 'Recurso no disponible' })).toBeInTheDocument()
  })

  it('un expediente asignado muestra sus pestañas sin anunciar otras áreas', async () => {
    renderAt('/expedientes/EXP-0412', persona('psicologia'))
    expect(await screen.findByRole('heading', { name: 'Caso Jacaranda' })).toBeInTheDocument()
    const pestanas = screen.getByRole('navigation', { name: 'Secciones del expediente' })
    expect(pestanas).toHaveTextContent('Notas de Psicología')
    expect(pestanas).not.toHaveTextContent('Jurídico')
  })

  // Cada pantalla del panel se abre sin errores con su rol y muestra un título.
  const PANTALLAS: [Rol, string, RegExp][] = [
    ['trabajo-social', '/expedientes', /^Expedientes$/],
    ['trabajo-social', '/expedientes/nuevo', /Comprobar CURP/],
    ['psicologia', '/expedientes/EXP-0412/linea-de-tiempo', /Caso Jacaranda/],
    ['psicologia', '/expedientes/EXP-0412/notas', /Caso Jacaranda/],
    ['trabajo-social', '/expedientes/EXP-0412/consentimientos', /Caso Jacaranda/],
    ['trabajo-social', '/expedientes/EXP-0412/canalizar', /Caso Jacaranda/],
    ['psicologia', '/canalizaciones', /Canalizaciones/],
    ['psicologia', '/pendientes', /Pendientes/],
    ['juridico', '/cuenta', /Mi cuenta/],
    ['capacitacion', '/capacitacion/cursos', /Cursos y charlas/],
    ['capacitacion', '/capacitacion/cursos/nuevo', /Nuevo curso/],
    ['capacitacion', '/capacitacion/calendario', /Calendario/],
    ['capacitacion', '/capacitacion/calendario/cu1/lista', /Finanzas/],
    ['capacitacion', '/capacitacion/visitas', /Planeación de visitas/],
    ['capacitacion', '/capacitacion/bolsa', /Bolsa de trabajo/],
    ['capacitacion', '/capacitacion/bolsa/nueva', /Nueva vacante/],
    ['administracion', '/', /Hola/],
    ['administracion', '/administracion/reportes', /Reportes/],
    ['administracion', '/administracion/solicitudes', /Solicitudes de acceso/],
    ['administracion', '/administracion/bitacora', /Bitácora/],
    ['administracion', '/administracion/personal', /Personal/],
    ['administracion', '/administracion/opinion', /Opinión de usuarias/],
  ]
  it.each(PANTALLAS)('%s abre %s', async (rol, ruta, titulo) => {
    renderAt(ruta, persona(rol))
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
  })

  const PORTAL: [string, RegExp][] = [
    ['/u/inicio', /Hola, María/],
    ['/u/ayuda', /Necesito ayuda/],
    ['/u/ayuda/al-1', /avisando a una agente/],
    ['/u/ayuda/al-1/cancelar', /Cancelar la alerta/],
    ['/u/perfil', /Mi perfil/],
    ['/u/foro', /Cursos, charlas/],
    ['/u/foro/cu1', /Finanzas/],
    ['/u/empleo', /Bolsa de trabajo/],
    ['/u/empleo/va1', /Auxiliar administrativa/],
    ['/u/pendientes', /Tus pendientes/],
    ['/u/directorio', /Contactos de ayuda/],
    ['/recetas', /Cocina de casa/],
  ]
  it.each(PORTAL)('la usuaria abre %s', async (ruta, titulo) => {
    renderAt(ruta, undefined, { alias: 'María' })
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
  })
})
