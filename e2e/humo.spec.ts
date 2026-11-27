import { expect, test } from '@playwright/test'

test('la aplicación entra según el dispositivo y muestra la salida rápida', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) {
    await expect(page.getByRole('heading', { name: 'Estamos para acompañarte' })).toBeVisible()
    await expect(page.getByRole('button', { name: /salida rápida/i })).toBeVisible()
    await page.getByRole('link', { name: 'Soy personal de la Secretaría' }).click()
    await expect(page).toHaveURL(/\/acceso$/)
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByRole('button', { name: /salida rápida/i })).toBeVisible()
  } else {
    await expect(page).toHaveURL(/\/acceso$/)
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByRole('button', { name: /salida rápida/i })).toBeVisible()
    await page.getByRole('link', { name: 'Portal de usuarias' }).click()
    await expect(page).toHaveURL(/\/u$/)
    await expect(page.getByRole('heading', { name: 'Estamos para acompañarte' })).toBeVisible()
  }
})

test('el manifiesto usa un nombre neutro', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = (await response.json()) as { name: string; display: string }
  expect(manifest.name).toBe('Agenda')
  expect(manifest.display).toBe('standalone')
})

test('el service worker se publica como archivo estático', async ({ request }) => {
  const response = await request.get('/sw.js')
  expect(response.ok()).toBe(true)
})

test('bloquea archivos internos y rutas sensibles con 404 sin fugas', async ({ request }) => {
  const rutas = [
    '/package.json',
    '/.env',
    '/.git/HEAD',
    '/.gitignore',
    '/.gitattributes',
    '/tsconfig.json',
    '/node_modules/',
    '/src/main.tsx',
    '/Makefile',
    '/home/luisd/proyectos/plataforma-frontend/Makefile',
    '/@vite/client',
  ]
  for (const ruta of rutas) {
    const response = await request.get(ruta)
    expect(response.status(), `ruta ${ruta}`).toBe(404)
    const body = await response.text()
    expect(body).not.toContain('/home/')
    expect(body).not.toContain('dependencies')
  }
})
