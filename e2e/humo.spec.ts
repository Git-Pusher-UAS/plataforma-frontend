import { expect, test } from '@playwright/test'

test('la aplicación carga y muestra la salida rápida', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  await expect(page.getByRole('button', { name: /salida rápida/i })).toBeVisible()
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
