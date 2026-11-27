import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider } from '@/features/identidad/sesion'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), [])
  return (
    <SesionProvider>
      <RouterProvider router={router} />
      {/* Registra el service worker en toda la app (portal de usuarias incluido) para que sea instalable como PWA. */}
      <UpdatePrompt />
    </SesionProvider>
  )
}
