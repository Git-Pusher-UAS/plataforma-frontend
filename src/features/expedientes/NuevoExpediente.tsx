import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, Outlet, useNavigate, useOutletContext } from 'react-router'
import { ORIGENES, useComprobarCurp, useCrearExpediente, useSolicitarAcceso } from '@/features/expedientes/api'
import { ApiError } from '@/api/client'
import { Encabezado } from '@/shared/ui/Encabezado'

type Tramite = {
  curp: string
  setCurp: (c: string) => void
  existente: { department?: string; linkToken?: string } | null
  setExistente: (e: Tramite['existente']) => void
}

const CURP = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/
const normalizar = (c: string) => c.toUpperCase().replace(/\s/g, '')

/**
 * Guarda la CURP del trámite solo en memoria mientras dura el alta (P-11 a P-13).
 * Al salir de /expedientes/nuevo se desmonta y se borra. Nunca va en la URL ni en el historial.
 */
export function NuevoExpedienteLayout() {
  const [curp, setCurp] = useState('')
  const [existente, setExistente] = useState<Tramite['existente']>(null)
  const ctx = useMemo<Tramite>(() => ({ curp, setCurp, existente, setExistente }), [curp, existente])
  return <Outlet context={ctx} />
}
const useTramite = () => useOutletContext<Tramite>()

function Pasos({ actual }: { actual: 1 | 2 }) {
  return (
    <ol className="pasos" aria-label="Pasos">
      <li aria-current={actual === 1 ? 'step' : undefined}>1. CURP</li>
      <li aria-current={actual === 2 ? 'step' : undefined}>2. Datos, origen y consentimiento</li>
    </ol>
  )
}

/** P-11 · Nuevo expediente: comprobar duplicado por CURP. */
export function ComprobarCurpPage() {
  const t = useTramite()
  const comprobar = useComprobarCurp()
  const navegar = useNavigate()
  const [valor, setValor] = useState(t.curp)
  const curp = normalizar(valor)
  const invalida = curp.length > 0 && !CURP.test(curp)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!CURP.test(curp)) return
    comprobar.mutate(curp, {
      onSuccess: (r) => {
        t.setCurp(curp)
        if (r.exists) {
          t.setExistente({ department: r.department, linkToken: r.linkToken })
          navegar('/expedientes/nuevo/existente')
        } else navegar('/expedientes/nuevo/datos')
      },
    })
  }
  return (
    <section className="pila angosta">
      <Link to="/expedientes" className="enlace-volver">
        ← Expedientes
      </Link>
      <Encabezado antetitulo="Nuevo expediente" titulo="Comprobar CURP">
        Antes de registrar, revisamos que la persona no tenga ya un expediente.
      </Encabezado>
      <Pasos actual={1} />
      <form className="tarjeta pila" onSubmit={enviar}>
        <div className={`campo ${invalida ? 'campo-error' : ''}`}>
          <label htmlFor="curp">CURP</label>
          <input id="curp" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} aria-invalid={invalida} aria-describedby="curp-nota" required />
          <span id="curp-nota" className={invalida ? 'texto-error' : 'campo-ayuda'}>
            {invalida ? 'El formato no es válido: son 18 caracteres.' : 'Se usa solo para esta comprobación y no se guarda al salir.'}
          </span>
        </div>
        {comprobar.isError && (
          <p className="texto-error" role="alert">
            {comprobar.error instanceof ApiError && comprobar.error.status === 429 ? 'Demasiadas consultas. Espera un momento.' : 'No se pudo comprobar. Intenta de nuevo.'}
          </p>
        )}
        <button className="boton" disabled={comprobar.isPending}>
          Comprobar
        </button>
      </form>
      <div className="estado estado-aviso">
        <strong>¿La persona no tiene CURP?</strong> La atención urgente no depende del alta. Usa el <Link to="/ayuda">directorio de ayuda</Link> y registra el caso con Trabajo social cuando sea posible.
      </div>
    </section>
  )
}

/** P-12 · Nuevo expediente: datos, origen y consentimiento en un solo envío. */
export function DatosExpedientePage() {
  const t = useTramite()
  const crear = useCrearExpediente()
  const navegar = useNavigate()
  // La clave de idempotencia se crea al abrir el formulario y se conserva en reintentos.
  const [operationId] = useState(() => crypto.randomUUID())
  const [f, setF] = useState({ nombre: '', edad: '', telefono: '', sector: '', origen: ORIGENES[0]!, consentimiento: '' as '' | 'aceptado' | 'rechazado' })
  if (!t.curp) return <Navigate to="/expedientes/nuevo" replace />

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!f.consentimiento) return
    crear.mutate(
      { curp: t.curp, nombre: f.nombre, edad: Number(f.edad), telefono: f.telefono, sector: f.sector, origen: f.origen, consentimiento: f.consentimiento, operationId },
      {
        onSuccess: ({ id }) => navegar(`/expedientes/${id}`, { replace: true }),
        onError: (err) => {
          // 409: alguien registró a la misma persona; se pasa a P-13 sin pedir la CURP otra vez.
          if (err instanceof ApiError && err.status === 409) navegar('/expedientes/nuevo/existente', { replace: true })
        },
      },
    )
  }
  return (
    <section className="pila angosta">
      <Encabezado antetitulo="Nuevo expediente" titulo="Datos, origen y consentimiento" />
      <Pasos actual={2} />
      <form className="tarjeta pila" onSubmit={enviar}>
        <p className="texto-suave">
          CURP: <strong>{t.curp.slice(0, 4)}••••••••••{t.curp.slice(-2)}</strong> · sin expediente previo
        </p>
        <fieldset className="grupo">
          <legend className="subtitulo">Persona</legend>
          <div className="campo">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" autoComplete="off" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required />
          </div>
          <div className="rejilla-2">
            <div className="campo">
              <label htmlFor="edad">Edad</label>
              <input id="edad" type="number" min={0} max={120} value={f.edad} onChange={(e) => setF({ ...f, edad: e.target.value })} required />
            </div>
            <div className="campo">
              <label htmlFor="tel">Teléfono</label>
              <input id="tel" type="tel" autoComplete="off" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value.replace(/\D/g, '') })} maxLength={10} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="sector">Sector de residencia</label>
            <input id="sector" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} placeholder="Por ejemplo: Sector 12" required />
            <span className="campo-ayuda">Solo el sector, para estadística. El domicilio se captura después, como dato oculto.</span>
          </div>
        </fieldset>
        <fieldset className="grupo">
          <legend className="subtitulo">Origen del primer contacto</legend>
          {ORIGENES.map((o) => (
            <label key={o} className="opcion">
              <input type="radio" name="origen" checked={f.origen === o} onChange={() => setF({ ...f, origen: o })} /> {o}
            </label>
          ))}
        </fieldset>
        <fieldset className="grupo">
          <legend className="subtitulo">Consentimiento informado</legend>
          <p className="texto-suave">Lee a la persona el aviso de privacidad vigente y registra su decisión.</p>
          <label className="opcion">
            <input type="radio" name="consent" checked={f.consentimiento === 'aceptado'} onChange={() => setF({ ...f, consentimiento: 'aceptado' })} required /> Acepta
          </label>
          <label className="opcion">
            <input type="radio" name="consent" checked={f.consentimiento === 'rechazado'} onChange={() => setF({ ...f, consentimiento: 'rechazado' })} /> No acepta
          </label>
        </fieldset>
        {crear.isError && !(crear.error instanceof ApiError && crear.error.status === 409) && (
          <p className="texto-error" role="alert">
            No se pudo guardar. Intenta de nuevo; no se duplicará.
          </p>
        )}
        <div className="fila-botones">
          <Link to="/expedientes/nuevo" className="boton-secundario">
            Atrás
          </Link>
          <button className="boton" disabled={crear.isPending}>
            Guardar expediente
          </button>
        </div>
      </form>
    </section>
  )
}

/** P-13 · Persona ya registrada: solo dice que existe y qué área la lleva. */
export function PersonaRegistradaPage() {
  const t = useTramite()
  const solicitar = useSolicitarAcceso()
  const [motivo, setMotivo] = useState('')
  if (!t.curp) return <Navigate to="/expedientes/nuevo" replace />
  return (
    <section className="pila angosta">
      <Encabezado antetitulo="Nuevo expediente" titulo="Esta persona ya está registrada" />
      <div className="tarjeta pila">
        <p>
          Ya existe un expediente{t.existente?.department ? ` que lleva ${t.existente.department}` : ''}. Por confidencialidad no mostramos sus datos.
        </p>
        {solicitar.isSuccess ? (
          <p className="estado estado-exito" role="status">
            Solicitud enviada a Administración. Te avisaremos cuando te asignen el expediente.
          </p>
        ) : (
          <form
            className="pila"
            onSubmit={(e) => {
              e.preventDefault()
              solicitar.mutate({ linkToken: t.existente?.linkToken ?? '', motivo })
            }}
          >
            <div className="campo">
              <label htmlFor="motivo">Motivo de la solicitud de acceso</label>
              <textarea id="motivo" className="area" rows={3} minLength={10} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
              <span className="campo-ayuda">{motivo.length}/500 · mínimo 10 caracteres</span>
            </div>
            {solicitar.isError && (
              <p className="texto-error" role="alert">
                {solicitar.error instanceof ApiError && solicitar.error.status === 410 ? 'La consulta venció. Vuelve a comprobar la CURP.' : 'No se pudo enviar la solicitud.'}
              </p>
            )}
            <button className="boton" disabled={solicitar.isPending}>
              Solicitar acceso
            </button>
          </form>
        )}
      </div>
      <Link to="/expedientes" className="boton-secundario">
        Volver a expedientes
      </Link>
    </section>
  )
}
