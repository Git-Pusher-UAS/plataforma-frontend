import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), [])
  return <RouterProvider router={router} />
}
