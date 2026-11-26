import type { RouteObject } from 'react-router'
import { Layout } from '@/app/Layout'
import { HomePage, NotFoundPage } from '@/app/pages'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      // Carga diferida: los polígonos del mapa pesan ~230 KB y solo se usan aquí.
      { path: '/tablero', lazy: () => import('@/features/tablero/TableroPage').then((m) => ({ Component: m.TableroPage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
