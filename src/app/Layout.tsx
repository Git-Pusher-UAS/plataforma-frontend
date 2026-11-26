import { NavLink, Outlet } from 'react-router'
import { NAV } from '@/app/nav'
import { QuickExitButton } from '@/features/ayuda/QuickExitButton'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

export function Layout() {
  return (
    <div className="panel">
      <nav className="menu-lateral" aria-label="Principal">
        <span className="menu-marca">SAI</span>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end className="menu-item">
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="panel-cuerpo">
        <header className="barra">
          <QuickExitButton />
        </header>
        <main className="pagina">
          <Outlet />
        </main>
      </div>
      <UpdatePrompt />
    </div>
  )
}
