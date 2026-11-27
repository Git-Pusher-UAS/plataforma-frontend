import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useCrearCuentaUsuaria, useEntrarUsuaria, useVerificarUsuaria, type EntradaUsuaria } from '@/features/identidad/api'
import { useSesion } from '@/features/identidad/sesion'
import { Segmentos } from '@/shared/ui/Pestanas'

/** U-01 · Bienvenida */
export function BienvenidaPage() {
  return (
    <section className="pila bienvenida">
      <div className="circulos" aria-hidden="true" />
      <div>
        <p className="etiqueta-peque">Sistema de Atención Integral</p>
        <h1 className="titulo-portal">Estamos para acompañarte</h1>
        <p className="texto-suave">Cursos, empleo y ayuda cuando la necesites. Todo en un lugar seguro.</p>
      </div>
      <Link to="/u/entrar" className="boton">
        Entrar
      </Link>
      <Link to="/u/crear-cuenta" className="boton-secundario">
        Crear mi cuenta
      </Link>
      {/* Supuesto 1: sin sesión, «Necesito ayuda» abre el directorio para llamar. */}
      <Link to="/u/directorio" className="boton-ayuda">
        Necesito ayuda
      </Link>
      <p className="texto-suave nota">Si estás en peligro inmediato, llama al 911.</p>
      <Link to="/acceso" className="enlace-discreto">
        Soy personal de la Secretaría
      </Link>
      <Link to="/e" className="enlace-discreto">
        Soy una empresa aliada
      </Link>
    </section>
  )
}

type FormaEntrar = 'telefono' | 'curp' | 'correo'
const FORMAS_ENTRAR: { valor: FormaEntrar; texto: string }[] = [
  { valor: 'telefono', texto: 'Celular' },
  { valor: 'curp', texto: 'CURP' },
  { valor: 'correo', texto: 'Correo' },
]
const CURP = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * U-02 · Entrar con el celular, la CURP o el correo (RF-02). Siempre llega un código por SMS al celular registrado.
 * No se usa el nombre completo: varias personas pueden llamarse exactamente igual.
 */
export function EntrarPage() {
  const entrar = useEntrarUsuaria()
  const navegar = useNavigate()
  const [forma, setForma] = useState<FormaEntrar>('telefono')
  const [valores, setValores] = useState({ telefono: '', curp: '', correo: '' })
  const curp = valores.curp.toUpperCase().replace(/\s/g, '')
  const correo = valores.correo.trim().toLowerCase()
  const listo = forma === 'telefono' ? valores.telefono.length === 10 : forma === 'curp' ? CURP.test(curp) : CORREO.test(correo)
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!listo) return
    const datos: EntradaUsuaria =
      forma === 'telefono' ? { tipo: 'telefono', telefono: valores.telefono } : forma === 'curp' ? { tipo: 'curp', curp } : { tipo: 'correo', correo }
    entrar.mutate(datos, { onSuccess: (r) => navegar('/u/codigo', { state: r }) })
  }
  return (
    <form className="pila" onSubmit={enviar}>
      <h1>Entrar</h1>
      <Segmentos opciones={FORMAS_ENTRAR} valor={forma} onCambio={setForma} etiqueta="Entrar con" />
      {forma === 'telefono' && (
        <div className="campo">
          <label htmlFor="telefono">Número de celular</label>
          <input
            id="telefono"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={valores.telefono}
            onChange={(e) => setValores({ ...valores, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            required
            minLength={10}
            maxLength={10}
            aria-describedby="entrar-ayuda"
          />
        </div>
      )}
      {forma === 'curp' && (
        <div className="campo">
          <label htmlFor="curp">CURP</label>
          <input id="curp" autoComplete="off" autoCapitalize="characters" maxLength={18} value={valores.curp} onChange={(e) => setValores({ ...valores, curp: e.target.value })} required aria-describedby="entrar-ayuda" />
        </div>
      )}
      {forma === 'correo' && (
        <div className="campo">
          <label htmlFor="correo">Correo electrónico</label>
          <input id="correo" type="email" inputMode="email" autoComplete="off" value={valores.correo} onChange={(e) => setValores({ ...valores, correo: e.target.value })} required aria-describedby="entrar-ayuda" />
        </div>
      )}
      <span id="entrar-ayuda" className="campo-ayuda">
        {forma === 'telefono' ? '10 dígitos, el que registraste. ' : forma === 'curp' ? '18 caracteres. ' : 'El que registraste al crear tu cuenta. '}
        Te enviaremos un código por mensaje a tu celular.
      </span>
      {entrar.isError && (
        <p className="texto-error" role="alert">
          No pudimos enviarte el código. Revisa los datos e intenta de nuevo.
        </p>
      )}
      <button className="boton" disabled={entrar.isPending || !listo}>
        {entrar.isPending ? 'Enviando…' : 'Enviar código'}
      </button>
      <Link to="/u/crear-cuenta" className="boton-secundario">
        Aún no tengo cuenta
      </Link>
      <Link to="/u" className="enlace-discreto">
        Volver
      </Link>
    </form>
  )
}

/** U-03 · Código por mensaje */
export function CodigoPage() {
  const reto = useLocation().state as { challengeId: string; telefonoMascara: string } | null
  const verificar = useVerificarUsuaria()
  const { iniciarUsuaria } = useSesion()
  const navegar = useNavigate()
  const [codigo, setCodigo] = useState('')
  if (!reto) return <Navigate to="/u/entrar" replace />
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    verificar.mutate(
      { challengeId: reto.challengeId, codigo },
      {
        onSuccess: (u) => {
          iniciarUsuaria(u)
          navegar('/u/inicio', { replace: true })
        },
      },
    )
  }
  return (
    <form className="pila" onSubmit={enviar}>
      <h1>Escribe tu código</h1>
      <p className="texto-suave">Lo enviamos por mensaje al teléfono que termina en {reto.telefonoMascara}.</p>
      <div className="campo">
        <label htmlFor="codigo">Código de 6 dígitos</label>
        <input
          id="codigo"
          className="campo-codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          required
        />
      </div>
      {verificar.isError && (
        <p className="texto-error" role="alert">
          El código no es correcto o ya venció.
        </p>
      )}
      <button className="boton" disabled={verificar.isPending || codigo.length !== 6}>
        Entrar
      </button>
      <Link to="/u/entrar" className="enlace-discreto">
        No me llegó el código
      </Link>
    </form>
  )
}

/** U-04 · Crear mi cuenta (autorregistro). */
export function CrearCuentaPage() {
  const crear = useCrearCuentaUsuaria()
  const navegar = useNavigate()
  const [f, setF] = useState({ nombre: '', curp: '', telefono: '', correo: '', aceptaAviso: false })
  const curp = f.curp.toUpperCase().replace(/\s/g, '')
  const curpInvalida = curp.length > 0 && !CURP.test(curp)
  const correo = f.correo.trim().toLowerCase()
  const correoInvalido = correo.length > 0 && !CORREO.test(correo)
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (curpInvalida || correoInvalido) return
    crear.mutate({ ...f, curp, correo: correo || undefined }, { onSuccess: (r) => navegar('/u/codigo', { state: r }) })
  }
  return (
    <form className="pila" onSubmit={enviar}>
      <h1>Crear mi cuenta</h1>
      <p className="texto-suave">Tus datos se tratan de forma confidencial. Solo los ve el personal que te atiende.</p>
      <div className="campo">
        <label htmlFor="nombre">Nombre completo</label>
        <input id="nombre" autoComplete="off" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required />
      </div>
      <div className={`campo ${curpInvalida ? 'campo-error' : ''}`}>
        <label htmlFor="curp">CURP</label>
        <input id="curp" autoComplete="off" value={f.curp} onChange={(e) => setF({ ...f, curp: e.target.value })} required aria-invalid={curpInvalida} aria-describedby="curp-ayuda" />
        <span id="curp-ayuda" className={curpInvalida ? 'texto-error' : 'campo-ayuda'}>
          {curpInvalida ? 'Revisa la CURP: son 18 caracteres.' : '18 caracteres. Sirve para no duplicar tu registro.'}
        </span>
      </div>
      <div className="campo">
        <label htmlFor="telefono">Teléfono celular</label>
        <input id="telefono" type="tel" inputMode="tel" autoComplete="off" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value.replace(/\D/g, '') })} required minLength={10} maxLength={10} />
        <span className="campo-ayuda">Aquí recibirás tu código para entrar.</span>
      </div>
      <div className={`campo ${correoInvalido ? 'campo-error' : ''}`}>
        <label htmlFor="correo">Correo electrónico (opcional)</label>
        <input id="correo" type="email" inputMode="email" autoComplete="off" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} aria-invalid={correoInvalido} aria-describedby="correo-ayuda" />
        <span id="correo-ayuda" className={correoInvalido ? 'texto-error' : 'campo-ayuda'}>
          {correoInvalido ? 'Revisa el correo: falta la @ o el dominio.' : 'Si lo agregas, también podrás entrar con él.'}
        </span>
      </div>
      <label className="opcion">
        <input type="checkbox" checked={f.aceptaAviso} onChange={(e) => setF({ ...f, aceptaAviso: e.target.checked })} required /> Leí y acepto el aviso de privacidad
      </label>
      {crear.isError && (
        <p className="texto-error" role="alert">
          No pudimos crear tu cuenta. Intenta de nuevo.
        </p>
      )}
      <button className="boton" disabled={crear.isPending}>
        Crear cuenta
      </button>
      <Link to="/u/entrar" className="enlace-discreto">
        Ya tengo cuenta
      </Link>
    </form>
  )
}
