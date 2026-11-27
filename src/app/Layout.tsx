import { useEffect, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Menu, PanelLeftOpen, X } from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { MENU_POR_ROL, barraInferior } from '@/app/nav'
import { QuickExitButton } from '@/features/ayuda/QuickExitButton'
import { NecesitoAyudaPersonal } from '@/features/ayuda/NecesitoAyudaPersonal'
import { ROLES, useSesion } from '@/features/identidad/sesion'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

// Estructura y comportamiento del menú tomados del diseño móvil de la rama modificaciones_css:
// cajón lateral en celular con 3 accesos fijos abajo; en escritorio, menú que se oculta y cambia de ancho.
const ANCHO_MIN = 200
const ANCHO_MAX = 360
const ANCHO_INICIAL = 240
const INACTIVIDAD_MS = 15 * 60_000

const limitar = (valor: number) => Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, valor))
// Inicio y Expedientes usan `end` para no marcarse activos en sus subrutas.
const exacta = (to: string) => to === '/' || to === '/expedientes'

/** Cierra la sesión tras 15 minutos sin actividad y lleva a P-04 (el contenido se oculta). */
function useVencimientoPorInactividad() {
  const { cerrar } = useSesion()
  const navegar = useNavigate()
  useEffect(() => {
    let t = window.setTimeout(vencer, INACTIVIDAD_MS)
    function vencer() {
      cerrar()
      navegar('/sesion-vencida', { replace: true })
    }
    const reiniciar = () => {
      window.clearTimeout(t)
      t = window.setTimeout(vencer, INACTIVIDAD_MS)
    }
    const eventos = ['pointerdown', 'keydown', 'scroll'] as const
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    return () => {
      window.clearTimeout(t)
      eventos.forEach((e) => window.removeEventListener(e, reiniciar))
    }
  }, [cerrar, navegar])
}

/** Panel del personal: menú según el rol, etiqueta de área visible, Salir y Necesito ayuda siempre a la vista. */
export function Layout() {
  const { personal } = useSesion()
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false) // cajón del menú en celular
  const [oculto, setOculto] = useState(false) // menú oculto en escritorio
  const [ancho, setAncho] = useState(ANCHO_INICIAL)
  const [arrastrando, setArrastrando] = useState(false)
  useVencimientoPorInactividad()

  // En celular, Escape cierra el cajón.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto])

  if (!personal) return <Navigate to="/acceso" replace state={{ desde: pathname }} />

  const menu = MENU_POR_ROL[personal.rol]
  const rol = ROLES.find((r) => r.valor === personal.rol)!

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

  const clases = ['panel', oculto && 'menu-oculto', abierto && 'menu-abierto', arrastrando && 'redimensionando'].filter(Boolean).join(' ')

  return (
    <div className={clases} style={{ '--menu-ancho': `${ancho}px` } as CSSProperties}>
      <nav id="menu-principal" className="menu-lateral" aria-label="Principal">
        <div className="menu-cabecera">
          <span className="menu-marca">SAI</span>
          <button
            type="button"
            className="menu-cerrar"
            aria-label="Cerrar menú"
            onClick={() => (abierto ? setAbierto(false) : setOculto(true))}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {menu.map(({ to, label, icon: Icon, inferior }) => (
          <NavLink key={to} to={to} end={exacta(to)} className={inferior ? 'menu-item oculto-en-movil' : 'menu-item'} onClick={() => setAbierto(false)}>
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
          <button type="button" className="btn-menu-movil" aria-label="Abrir menú" aria-expanded={abierto} aria-controls="menu-principal" onClick={() => setAbierto(true)}>
            <Menu size={20} strokeWidth={2} aria-hidden="true" /> Menú
          </button>
          {oculto && (
            <button
              type="button"
              className="btn-menu-escritorio"
              aria-label="Mostrar menú"
              aria-expanded={false}
              aria-controls="menu-principal"
              onClick={() => setOculto(false)}
            >
              <PanelLeftOpen size={20} strokeWidth={2} aria-hidden="true" />
              Menú
            </button>
          )}
          <span className="barra-marca">SAI</span>

          <span className="barra-persona">
            <span className="barra-nombre">{personal.nombre}</span>
            <span className={`etiqueta ${rol.clase}`}>{rol.texto}</span>
          </span>

          <div className="salida-rapida">
            {personal.rol !== 'administracion' && <NecesitoAyudaPersonal />}
            <QuickExitButton />
          </div>
        </header>

        <main className={personal.rol === 'administracion' ? 'pagina admin-pagina' : 'pagina'}>
          <Outlet />
        </main>
      </div>

      <nav className="barra-inferior" aria-label="Acceso rápido">
        {barraInferior(menu).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={exacta(to)}>
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  )
}
