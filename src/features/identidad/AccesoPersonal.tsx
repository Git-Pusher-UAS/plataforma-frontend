import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { QuickExitButton } from '@/features/ayuda/QuickExitButton'
import { useCerrarSesion, useLoginPersonal, useMisSesiones, useVerificarCodigo } from '@/features/identidad/api'
import { ROLES, textoRol, useSesion, type Rol } from '@/features/identidad/sesion'
import { USAR_SIMULADOS } from '@/shared/lib/servicio'
import { Consulta } from '@/shared/ui/Estados'
import { Encabezado } from '@/shared/ui/Encabezado'

/** Marco de las pantallas sin sesión del personal: solo Salir y enlace al portal de usuarias. */
function MarcoAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="acceso">
      <header className="barra barra-acceso">
        <span className="menu-marca-oscura">SAI</span>
        <QuickExitButton />
      </header>
      <div className="acceso-contenido">
        <main className="acceso-tarjeta tarjeta">{children}</main>
        <p className="acceso-pie">
          <Link to="/u">Portal de usuarias</Link>
        </p>
      </div>
    </div>
  )
}

/** P-01 · Acceso */
export function AccesoPage() {
  const login = useLoginPersonal()
  const { iniciarPreautenticacion, iniciarPersonal } = useSesion()
  const navegar = useNavigate()
  const desde = (useLocation().state as { desde?: string } | null)?.desde
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [rol, setRol] = useState<Rol>('trabajo-social')

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(
      { usuario, contrasena },
      {
        onSuccess: (r) => {
          if (r.kind === 'authenticated') {
            iniciarPersonal(r.personal)
            navegar(desde ?? '/', { replace: true })
            return
          }
          iniciarPreautenticacion(usuario)
          navegar('/acceso/verificacion', { state: { challengeId: r.challengeId, rol, desde } })
        },
      },
    )
  }
  return (
    <MarcoAcceso>
      <form className="pila" onSubmit={enviar}>
        <div>
          <p className="etiqueta-peque">Personal de la Secretaría de Mujeres</p>
          <h1>Entrar</h1>
        </div>
        <div className="campo">
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="contrasena">Contraseña</label>
          <div className="campo-contrasena">
            <input
              id="contrasena"
              type={mostrar ? 'text' : 'password'}
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
            <button
              type="button"
              className="boton-ver-contrasena"
              aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={mostrar}
              onClick={() => setMostrar((v) => !v)}
            >
              {mostrar ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {USAR_SIMULADOS && (
          <div className="campo demo">
            <label htmlFor="rol-demo">Rol de demostración</label>
            <select id="rol-demo" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.texto}
                </option>
              ))}
            </select>
            <span className="campo-ayuda">Solo con datos simulados. Con el backend, el rol lo da el servidor.</span>
          </div>
        )}
        {login.isError && (
          <p className="texto-error" role="alert">
            Usuario o contraseña incorrectos.
          </p>
        )}
        <button className="boton" disabled={login.isPending}>
          Continuar
        </button>
      </form>
    </MarcoAcceso>
  )
}

/** P-03 · Verificar código (segundo factor). Sin este paso no hay acceso a pantallas de negocio. */
export function VerificacionPage() {
  const estado = useLocation().state as { challengeId: string; rol: Rol; desde?: string } | null
  const { personal, preautenticado, iniciarPersonal } = useSesion()
  const verificar = useVerificarCodigo()
  const [codigo, setCodigo] = useState('')
  // Con la sesión completa se entra; sin contraseña previa se vuelve a P-01.
  if (personal) return <Navigate to={estado?.desde ?? '/'} replace />
  if (!estado || !preautenticado) return <Navigate to="/acceso" replace />

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    verificar.mutate(
      { challengeId: estado.challengeId, codigo, usuario: preautenticado, rolDemo: estado.rol },
      {
        onSuccess: (p) => iniciarPersonal(p),
      },
    )
  }
  return (
    <MarcoAcceso>
      <form className="pila" onSubmit={enviar}>
        <h1>Verificar código</h1>
        <p className="texto-suave">Escribe el código de 6 dígitos de tu aplicación autenticadora.</p>
        <div className="campo">
          <label htmlFor="totp">Código</label>
          <input
            id="totp"
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
            El código no es válido, ya venció o ya se usó.
          </p>
        )}
        <button className="boton" disabled={verificar.isPending || codigo.length !== 6}>
          Entrar
        </button>
        <Link to="/acceso" className="enlace-discreto">
          Volver
        </Link>
      </form>
    </MarcoAcceso>
  )
}

/** P-04 · Sesión vencida: el contenido ya se ocultó. */
export function SesionVencidaPage() {
  return (
    <MarcoAcceso>
      <div className="pila">
        <h1>Tu sesión terminó</h1>
        <p className="texto-suave">Por seguridad cerramos la sesión tras 15 minutos sin actividad. Vuelve a entrar para continuar.</p>
        <Link to="/acceso" className="boton">
          Entrar de nuevo
        </Link>
      </div>
    </MarcoAcceso>
  )
}

/** P-06 · Mi cuenta */
export function MiCuentaPage() {
  const { personal, cerrar } = useSesion()
  const salir = useCerrarSesion()
  const sesiones = useMisSesiones()
  const navegar = useNavigate()
  if (!personal) return null
  return (
    <section className="pila">
      <Encabezado antetitulo="Cuenta" titulo="Mi cuenta" />
      <div className="tarjeta">
        <dl className="datos">
          <dt>Nombre</dt>
          <dd>{personal.nombre}</dd>
          <dt>Usuario</dt>
          <dd>{personal.usuario}</dd>
          <dt>Área</dt>
          <dd>{textoRol(personal.rol)}</dd>
        </dl>
      </div>
      <div className="tarjeta pila-corta">
        <h2 className="subtitulo">Sesiones abiertas</h2>
        <Consulta q={sesiones}>
          {(lista) => (
            <ul className="lista-simple">
              {lista.map((s) => (
                <li key={s.id} className="fila-accion">
                  <span>
                    {s.dispositivo} <span className="texto-suave">· {s.ultimoUso}</span>
                  </span>
                  {s.actual && <span className="etiqueta etiqueta-capacitacion">Esta</span>}
                </li>
              ))}
            </ul>
          )}
        </Consulta>
      </div>
      <p className="texto-suave">Para cambiar tu contraseña o tu segundo factor, acude con Administración.</p>
      <button
        type="button"
        className="boton-secundario"
        onClick={() =>
          salir.mutate(undefined, {
            onSettled: () => {
              cerrar()
              navegar('/acceso', { replace: true })
            },
          })
        }
      >
        Cerrar sesión
      </button>
    </section>
  )
}
