import { Link, useLocation } from 'react-router'
import { BriefcaseBusiness, CalendarDays, ClipboardList, UserRound } from 'lucide-react'
import { BotonMantener } from '@/features/ayuda/BotonMantener'
import { useActivarAyuda } from '@/features/ayuda/AyudaUsuaria'
import { useEncuestasPendientes } from '@/features/encuestas/api'
import { useSesion } from '@/features/identidad/sesion'

/** U-05 · Inicio. El botón de ayuda es lo primero y lo más grande. */
export function InicioUsuariaPage() {
  const { usuaria } = useSesion()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  const { activar, enviando, error } = useActivarAyuda()
  const encuestas = useEncuestasPendientes()
  const pendientes = encuestas.data?.length ?? 0

  return (
    <section className="pila">
      {aviso && (
        <p className="estado estado-exito" role="status">
          {aviso}
        </p>
      )}
      <div>
        <h1 className="titulo-portal">Hola, {usuaria?.alias ?? 'bienvenida'}</h1>
        <p className="texto-suave">¿Qué necesitas hoy?</p>
      </div>
      <div className="pila-corta">
        <BotonMantener texto={enviando ? 'Enviando…' : 'Necesito ayuda'} onActivar={() => void activar()} className="boton-ayuda boton-mantener boton-ancho" />
        <p className="texto-suave nota">Mantén presionado 2 segundos.</p>
        {error && (
          <p className="texto-error" role="alert">
            No se pudo enviar. <Link to="/u/directorio">Llama a un contacto de ayuda</Link>.
          </p>
        )}
        <Link to="/u/ayuda" className="enlace-discreto">
          ¿No puedes mantener presionado?
        </Link>
      </div>
      <div className="mosaico">
        <Link to="/u/perfil" className="mosaico-item tarjeta-lila">
          <UserRound size={26} aria-hidden="true" /> Mi perfil
        </Link>
        <Link to="/u/foro" className="mosaico-item mosaico-rosa">
          <CalendarDays size={26} aria-hidden="true" /> Foro de cursos
        </Link>
        <Link to="/u/empleo" className="mosaico-item mosaico-durazno">
          <BriefcaseBusiness size={26} aria-hidden="true" /> Bolsa de trabajo
        </Link>
        <Link to="/u/pendientes" className="mosaico-item mosaico-menta">
          <ClipboardList size={26} aria-hidden="true" /> Mis pendientes
          {pendientes > 0 && <span className="insignia">{pendientes}</span>}
        </Link>
      </div>
    </section>
  )
}
