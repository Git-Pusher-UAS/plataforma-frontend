import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider, type EmpresaSesion, type Personal, type Rol } from '@/features/identidad/sesion'

// El módulo virtual del service worker no existe en las pruebas.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

const persona = (rol: Rol): Personal => ({ usuario: 'demo', nombre: 'Persona Demo', rol })
const APROBADA: EmpresaSesion = { id: 'em1', nombre: 'Empresa aliada A', estado: 'aprobada' }

function renderAt(path: string, personal?: Personal, usuaria?: { alias: string }, empresa?: EmpresaSesion) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SesionProvider inicial={{ personal, usuaria, empresa }}>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
}

describe('rutas', () => {
  it('la raíz / sin sesión muestra la bienvenida con ayuda y salida rápida', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: /acompañarte/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Necesito ayuda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Soy personal de la Secretaría' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Soy una empresa aliada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salida rápida/i })).toBeInTheDocument()
  })

  it('sin sesión, el panel lleva a la pantalla de acceso con la salida rápida visible', async () => {
    renderAt('/expedientes')
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
    ['capacitacion', '/capacitacion/bolsa/revisar', /Bolsa de trabajo/],
    ['capacitacion', '/capacitacion/bolsa/empresas', /Bolsa de trabajo/],
    ['capacitacion', '/capacitacion/bolsa/contrataciones', /Bolsa de trabajo/],
    ['capacitacion', '/capacitacion/bolsa/vacantes/va4', /Recepcionista/],
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
    ['/u/empleo/postulaciones', /Mis postulaciones/],
    ['/u/empleo/postulaciones/po5', /Cajera/],
    ['/u/empleo/cv', /Mi CV/],
    ['/u/empleo/cv/editar', /Hasta dónde estudiaste/],
    ['/u/pendientes', /Tus pendientes/],
    ['/u/directorio', /Contactos de ayuda/],
    ['/recetas', /Cocina de casa/],
  ]
  it.each(PORTAL)('la usuaria abre %s', async (ruta, titulo) => {
    renderAt(ruta, undefined, { alias: 'María' })
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
  })

  const EMPRESA: [string, RegExp][] = [
    ['/e/vacantes', /Mis vacantes/],
    ['/e/vacantes/nueva', /Publicar vacante/],
    ['/e/vacantes/va1', /Auxiliar administrativa/],
    ['/e/vacantes/va1/editar', /Editar vacante/],
    ['/e/vacantes/va1/postulantes/po2', /Karla/],
  ]
  it.each(EMPRESA)('la empresa abre %s', async (ruta, titulo) => {
    renderAt(ruta, undefined, undefined, APROBADA)
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
  })

  it('el portal de empresas pide entrar y ofrece registrarse', async () => {
    renderAt('/e/vacantes')
    expect(await screen.findByRole('heading', { name: 'Entrar como empresa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrarla' })).toBeInTheDocument()
  })

  it('la empresa no ve el teléfono de la postulante antes de que la Secretaría lo entregue', async () => {
    renderAt('/e/vacantes/va1/postulantes/po2', undefined, undefined, APROBADA)
    expect(await screen.findByText(/el teléfono no se muestra/i)).toBeInTheDocument()
    expect(screen.queryByText('6680000012')).not.toBeInTheDocument()
  })

  it('una empresa sin aprobar no entra a la gestión: va a su solicitud', async () => {
    renderAt('/e/vacantes', undefined, undefined, { id: 'em4', nombre: 'Clínica del Valle', estado: 'en_revision' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi solicitud' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Publicar/ })).not.toBeInTheDocument()
  })

  it('una empresa rechazada ve el motivo, corrige y reenvía', async () => {
    const u = userEvent.setup()
    renderAt('/e')
    await u.type(await screen.findByLabelText('Correo de la empresa'), 'contacto@taller-norte.test')
    await u.click(screen.getByRole('button', { name: 'Enviar código' }))
    await u.type(await screen.findByLabelText('Código de 6 dígitos'), '123456')
    await u.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/No pudimos verificar el RFC/)).toBeInTheDocument()

    await u.click(screen.getByRole('link', { name: 'Corregir y reenviar' }))
    const rfc = await screen.findByLabelText('RFC')
    await u.clear(rfc)
    await u.type(rfc, 'TIN030303EE6')
    await u.click(screen.getByLabelText(/Acepto el aviso/))
    await u.click(screen.getByRole('button', { name: 'Reenviar solicitud' }))
    expect(await screen.findByText(/Reenviaste tu solicitud/)).toBeInTheDocument()
    expect(screen.getByText(/Estamos revisando tus datos/)).toBeInTheDocument()
  })

  it('la usuaria entra con su número de celular', async () => {
    const u = userEvent.setup()
    renderAt('/u/entrar')
    const celular = await screen.findByLabelText('Número de celular')
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled()
    await u.type(celular, '668-123-4567')
    expect(celular).toHaveValue('6681234567')
    await u.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText(/termina en •• •••• 67/)).toBeInTheDocument()
  })

  it('la usuaria también puede entrar con su CURP', async () => {
    const u = userEvent.setup()
    renderAt('/u/entrar')
    await u.click(await screen.findByRole('button', { name: 'CURP' }))
    await u.type(screen.getByLabelText('CURP'), 'xexx010101mslxxx0')
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled()
    await u.type(screen.getByLabelText('CURP'), '7')
    await u.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByRole('heading', { name: 'Escribe tu código' })).toBeInTheDocument()
  })

  it('la usuaria también puede entrar con su correo, no con su nombre', async () => {
    const u = userEvent.setup()
    renderAt('/u/entrar')
    expect(await screen.findByRole('button', { name: 'Correo' })).toBeInTheDocument()
    expect(screen.queryByText(/nombre completo/i)).not.toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Correo' }))
    await u.type(screen.getByLabelText('Correo electrónico'), 'maria@ejemplo.test')
    await u.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByRole('heading', { name: 'Escribe tu código' })).toBeInTheDocument()
  })
})
