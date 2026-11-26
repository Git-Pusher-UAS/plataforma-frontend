import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { SesionProvider } from '@/features/identidad/sesion'

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), [])
  return (
    <SesionProvider>
      <RouterProvider router={router} />
    </SesionProvider>
  )
}
