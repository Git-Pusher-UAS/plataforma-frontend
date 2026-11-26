import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useCrearCuentaUsuaria, useEntrarUsuaria, useVerificarUsuaria } from '@/features/identidad/api'
import { useSesion } from '@/features/identidad/sesion'

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
    </section>
  )
}

/** U-02 · Entrar: CURP o nombre completo como identificador (RF-02). */
export function EntrarPage() {
  const entrar = useEntrarUsuaria()
  const navegar = useNavigate()
  const [identificador, setIdentificador] = useState('')
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    entrar.mutate(
      { identificador: identificador.trim() },
      { onSuccess: (r) => navegar('/u/codigo', { state: r }) },
    )
  }
  return (
    <form className="pila" onSubmit={enviar}>
      <h1>Entrar</h1>
      <div className="campo">
        <label htmlFor="identificador">CURP o nombre completo</label>
        <input id="identificador" autoComplete="off" value={identificador} onChange={(e) => setIdentificador(e.target.value)} required minLength={3} />
        <span className="campo-ayuda">Te enviaremos un código por mensaje a tu teléfono.</span>
      </div>
      {entrar.isError && (
        <p className="texto-error" role="alert">
          No pudimos enviarte el código. Revisa los datos e intenta de nuevo.
        </p>
      )}
      <button className="boton" disabled={entrar.isPending}>
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

const CURP = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/

/** U-04 · Crear mi cuenta (autorregistro). */
export function CrearCuentaPage() {
  const crear = useCrearCuentaUsuaria()
  const navegar = useNavigate()
  const [f, setF] = useState({ nombre: '', curp: '', telefono: '', aceptaAviso: false })
  const curp = f.curp.toUpperCase().replace(/\s/g, '')
  const curpInvalida = curp.length > 0 && !CURP.test(curp)
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (curpInvalida) return
    crear.mutate({ ...f, curp }, { onSuccess: (r) => navegar('/u/codigo', { state: r }) })
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
