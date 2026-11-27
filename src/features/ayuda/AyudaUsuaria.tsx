import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Check, MapPin, UserCheck } from 'lucide-react'
import { BotonMantener } from '@/features/ayuda/BotonMantener'
import { useAvisarContactos, useCancelarAlerta, useEnviarAlerta } from '@/features/ayuda/api'
import { ListaContactos } from '@/features/ayuda/Directorio'

function ubicacion(): Promise<{ lat?: number; lon?: number }> {
  return new Promise((resolver) => {
    if (!('geolocation' in navigator)) return resolver({})
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolver({}),
      { timeout: 5000, maximumAge: 60_000 },
    )
  })
}

/** Envía la alerta (con ubicación si la persona la permite) y abre U-07. */
export function useActivarAyuda() {
  const enviar = useEnviarAlerta()
  const navegar = useNavigate()
  const activar = async () => {
    const pos = await ubicacion()
    const alerta = await enviar.mutateAsync({ ...pos, operationId: crypto.randomUUID() })
    navegar(`/u/ayuda/${alerta.id}`, { replace: true })
  }
  return { activar, enviando: enviar.isPending, error: enviar.isError }
}

const NOTA_911 = <p className="nota-911">Si estás en peligro inmediato, llama al 911.</p>

/** U-06 · Mantener 2 segundos. También tiene confirmación sin mantener para quien no pueda. */
export function MantenerPage() {
  const { activar, enviando, error } = useActivarAyuda()
  const [confirmar, setConfirmar] = useState(false)
  return (
    <section className="pila centrada">
      <h1>Necesito ayuda</h1>
      <p className="texto-suave">Mantén presionado el botón 2 segundos. Avisaremos a una agente y, si lo permites, compartiremos tu ubicación.</p>
      <BotonMantener texto={enviando ? 'Enviando…' : 'Mantén presionado'} onActivar={() => void activar()} className="boton-ayuda boton-mantener-grande" />
      {error && (
        <p className="texto-error" role="alert">
          No se pudo enviar. Llama directamente a uno de estos contactos.
        </p>
      )}
      {!confirmar ? (
        <button type="button" className="boton-secundario" onClick={() => setConfirmar(true)}>
          No puedo mantener presionado
        </button>
      ) : (
        <div className="tarjeta pila">
          <p>¿Quieres pedir ayuda ahora?</p>
          <button type="button" className="boton-ayuda" onClick={() => void activar()} disabled={enviando}>
            Sí, pedir ayuda
          </button>
          <button type="button" className="boton-secundario" onClick={() => setConfirmar(false)}>
            No, regresar
          </button>
        </div>
      )}
      {error && <ListaContactos soloPrioritarios />}
      {NOTA_911}
      <Link to="/u/inicio" className="enlace-discreto">
        Volver al inicio
      </Link>
    </section>
  )
}

/** U-07 · Ayuda activada: estado, avisar a contactos de confianza y cancelar. */
export function AyudaActivadaPage() {
  const { alertaId = '' } = useParams()
  const avisar = useAvisarContactos()
  return (
    <section className="pila">
      <div className="estado estado-exito" role="status">
        <h1 className="titulo-estado">Estamos avisando a una agente</h1>
        <p>Mantén esta pantalla abierta. Te contactarán lo antes posible.</p>
      </div>
      <ul className="lista-checks">
        <li>
          <MapPin size={20} aria-hidden="true" /> Ubicación compartida si la permitiste
        </li>
        <li>
          <Check size={20} aria-hidden="true" /> Solicitud recibida
        </li>
      </ul>
      {avisar.isSuccess ? (
        <p className="estado estado-exito">
          <UserCheck size={18} aria-hidden="true" /> Avisamos a tus contactos de confianza.
        </p>
      ) : (
        <button type="button" className="boton" onClick={() => avisar.mutate(alertaId)} disabled={avisar.isPending}>
          Avisar a mis contactos de confianza
        </button>
      )}
      <p className="texto-suave">Solo se avisa a quien tú hayas autorizado antes en tu perfil.</p>
      <Link to={`/u/ayuda/${alertaId}/cancelar`} className="boton-secundario">
        Cancelar alerta
      </Link>
      {NOTA_911}
    </section>
  )
}

const MOTIVOS = ['Ya estoy bien', 'Lo presioné por error', 'Ya recibí ayuda']

/** U-08 · Cancelar solicitud. */
export function CancelarAlertaPage() {
  const { alertaId = '' } = useParams()
  const cancelar = useCancelarAlerta()
  const navegar = useNavigate()
  const [motivo, setMotivo] = useState(MOTIVOS[0]!)
  return (
    <section className="pila">
      <h1>¿Cancelar la alerta?</h1>
      <p className="texto-suave">Si cancelas, la agente sabrá que ya no necesitas ayuda en este momento.</p>
      <fieldset className="opciones">
        <legend>Motivo</legend>
        {MOTIVOS.map((m) => (
          <label key={m} className="opcion">
            <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} /> {m}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="boton"
        disabled={cancelar.isPending}
        onClick={() => cancelar.mutate({ id: alertaId, motivo }, { onSuccess: () => navegar('/u/inicio', { replace: true, state: { aviso: 'Alerta cancelada.' } }) })}
      >
        Sí, cancelar alerta
      </button>
      <Link to={`/u/ayuda/${alertaId}`} className="boton-secundario">
        No, mantener la alerta
      </Link>
      {NOTA_911}
    </section>
  )
}
