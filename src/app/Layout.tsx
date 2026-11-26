import { useEffect, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { BARRA_INFERIOR, NAV } from '@/app/nav'
import { QuickExitButton } from '@/features/ayuda/QuickExitButton'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

const ANCHO_MIN = 200
const ANCHO_MAX = 360
const ANCHO_INICIAL = 240

const limitar = (valor: number) => Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, valor))

export function Layout() {
  const [abierto, setAbierto] = useState(false) // cajón del menú en celular
  const [oculto, setOculto] = useState(false) // menú oculto en escritorio
  const [ancho, setAncho] = useState(ANCHO_INICIAL)
  const [arrastrando, setArrastrando] = useState(false)

  // En celular, Escape cierra el cajón.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto])

  function iniciarArrastre(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastrando(true)
  }

  function arrastrar(e: PointerEvent<HTMLDivElement>) {
    if (arrastrando) setAncho(limitar(e.clientX))
  }

  function usarTeclado(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') setAncho((a) => limitar(a - 16))
    else if (e.key === 'ArrowRight') setAncho((a) => limitar(a + 16))
    else if (e.key === 'Home') setAncho(ANCHO_INICIAL)
    else return
    e.preventDefault()
  }

  const clases = [
    'panel',
    oculto && 'menu-oculto',
    abierto && 'menu-abierto',
    arrastrando && 'redimensionando',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={clases} style={{ '--menu-ancho': `${ancho}px` } as CSSProperties}>
      <nav id="menu-principal" className="menu-lateral" aria-label="Principal">
        <div className="menu-cabecera">
          <span className="menu-marca">SAI</span>
          <button
            type="button"
            className="menu-cerrar"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {NAV.map(({ to, label, icon: Icon, inferior }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={inferior ? 'menu-item oculto-en-movil' : 'menu-item'}
            onClick={() => setAbierto(false)}
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
            <span className="menu-texto">{label}</span>
          </NavLink>
        ))}

        <div
          className={arrastrando ? 'menu-resize activa' : 'menu-resize'}
          role="separator"
          aria-orientation="vertical"
          aria-label="Cambiar ancho del menú"
          aria-valuemin={ANCHO_MIN}
          aria-valuemax={ANCHO_MAX}
          aria-valuenow={ancho}
          tabIndex={0}
          onPointerDown={iniciarArrastre}
          onPointerMove={arrastrar}
          onPointerUp={() => setArrastrando(false)}
          onPointerCancel={() => setArrastrando(false)}
          onKeyDown={usarTeclado}
          onDoubleClick={() => setAncho(ANCHO_INICIAL)}
        />
      </nav>

      <div className="menu-fondo" aria-hidden="true" onClick={() => setAbierto(false)} />

      <div className="panel-cuerpo">
        <header className="barra">
          <button
            type="button"
            className="btn-menu-movil"
            aria-label="Abrir menú"
            aria-expanded={abierto}
            aria-controls="menu-principal"
            onClick={() => setAbierto(true)}
          >
            <Menu size={20} strokeWidth={2} aria-hidden="true" /> Menú
          </button>

          <button
            type="button"
            className="btn-menu-escritorio"
            aria-label={oculto ? 'Mostrar menú' : 'Ocultar menú'}
            aria-expanded={!oculto}
            aria-controls="menu-principal"
            onClick={() => setOculto((o) => !o)}
          >
            {oculto ? (
              <PanelLeftOpen size={20} strokeWidth={2} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={20} strokeWidth={2} aria-hidden="true" />
            )}
            Menú
          </button>

          <span className="barra-marca">SAI</span>

          <div className="salida-rapida">
            <QuickExitButton />
          </div>
        </header>

        <main className="pagina">
          <Outlet />
        </main>
      </div>

      <nav className="barra-inferior" aria-label="Acceso rápido">
        {BARRA_INFERIOR.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end>
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  )
}