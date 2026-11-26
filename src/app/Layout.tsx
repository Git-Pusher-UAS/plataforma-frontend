import { Outlet } from 'react-router'
import { QuickExitButton } from '@/features/ayuda/QuickExitButton'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

export function Layout() {
  return (
    <>
      <header className="barra">
        <QuickExitButton />
      </header>
      <main className="pagina">
        <Outlet />
      </main>
      <UpdatePrompt />
    </>
  )
}
