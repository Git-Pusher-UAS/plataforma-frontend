import type { RouteObject } from 'react-router'
import { Layout } from '@/app/Layout'
import { HomePage, NotFoundPage } from '@/app/pages'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
