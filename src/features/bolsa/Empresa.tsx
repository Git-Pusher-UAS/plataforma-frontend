import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { BriefcaseBusiness, CalendarClock, Clock, LogOut, Plus } from 'lucide-react'
import {
  MOTIVOS_NO,
  OPCIONES_VACANTE,
  TEXTO_POSTULACION,
  hoy,
  useActualizarVacanteEmpresa,
  useCorregirSolicitud,
  useCrearVacanteEmpresa,
  useDecidir,
  useEntrarEmpresa,
  useMiSolicitud,
  usePostulante,
  usePostulantes,
  useProponerEntrevista,
  useRegistrarEmpresa,
  useVacanteEmpresa,
  useVacantesEmpresa,
  useVerificarEmpresa,
  type Entrevista,
  type EstadoPostulacion,
  type RegistroEmpresa,
} from '@/features/bolsa/api'
import { ChipEmpresa, ChipPostulacion, ChipVacante, FormVacante, Volver } from '@/features/bolsa/componentes'
import { ResumenCv } from '@/features/bolsa/Usuaria'
import { fechaLarga, hora12 } from '@/features/capacitacion/api'
import { useSesion } from '@/features/identidad/sesion'
import { Dialogo } from '@/shared/ui/Dialogo'
import { Encabezado } from '@/shared/ui/Encabezado'
import { Cargando, Consulta } from '@/shared/ui/Estados'
import { Segmentos } from '@/shared/ui/Pestanas'
import { fecha } from '@/shared/lib/formato'

// ---------------------------------------------------------------------
/** Marco del portal de empresas: barra simple con sus vacantes, publicar y salir. */
export function EmpresaLayout() {
  const { empresa, cerrar } = useSesion()
  const navegar = useNavigate()
  return (
    <div className="empresa">
      <header className="empresa-barra">
        <Link to={!empresa ? '/e' : empresa.estado === 'aprobada' ? '/e/vacantes' : '/e/solicitud'} className="marca">
          SAI <span className="empresa-sub">Empresas</span>
        </Link>
        {empresa && (
          <>
            <nav className="empresa-menu" aria-label="Empresa">
              {empresa.estado === 'aprobada' && (
                <>
                  <NavLink to="/e/vacantes" end>
                    <BriefcaseBusiness size={18} aria-hidden="true" /> Mis vacantes
                  </NavLink>
                  <NavLink to="/e/vacantes/nueva">
                    <Plus size={18} aria-hidden="true" /> Publicar
                  </NavLink>
                </>
              )}
            </nav>
            <span className="empresa-nombre">{empresa.nombre}</span>
            <button
              type="button"
              className="boton-secundario boton-chico"
              onClick={() => {
                cerrar()
                navegar('/e', { replace: true })
              }}
            >
              <LogOut size={16} aria-hidden="true" /> Salir
            </button>
          </>
        )}
      </header>
      <main className="empresa-pagina">
        <Outlet />
      </main>
    </div>
  )
}

/** Pantallas de gestión: solo empresas aprobadas. Las demás van a su solicitud. */
export function RequiereEmpresa() {
  const { empresa, cargandoSesion } = useSesion()
  if (cargandoSesion) return <Cargando />
  if (!empresa) return <Navigate to="/e" replace />
  if (empresa.estado !== 'aprobada') return <Navigate to="/e/solicitud" replace />
  return <Outlet />
}

/** Pantallas de la solicitud: cualquier empresa con sesión, aprobada o no. */
export function RequiereSolicitante() {
  const { empresa, cargandoSesion } = useSesion()
  if (cargandoSesion) return <Cargando />
  if (!empresa) return <Navigate to="/e" replace />
  return <Outlet />
}

// ---------------------------------------------------------------------
/** E-01 · Entrar con correo (sin contraseña: código de un solo uso). */
export function EntrarEmpresaPage() {
  const entrar = useEntrarEmpresa()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState('')
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    entrar.mutate(correo.trim(), { onSuccess: (r) => navegar('/e/codigo', { state: r }) })
  }
  return (
    <section className="pila angosta empresa-acceso">
      <Volver a="/" texto="Volver" />
      <Encabezado antetitulo="Bolsa de trabajo" titulo="Entrar como empresa">
        Publica vacantes y revisa a las personas que se postulan.
      </Encabezado>
      <form className="tarjeta pila" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="correo">Correo de la empresa</label>
          <input id="correo" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          <span className="campo-ayuda">Te enviaremos un código de 6 dígitos.</span>
        </div>
        {entrar.isError && (
          <p className="texto-error" role="alert">
            No pudimos enviar el código. Revisa el correo.
          </p>
        )}
        <button className="boton" disabled={entrar.isPending}>
          {entrar.isPending ? 'Enviando…' : 'Enviar código'}
        </button>
      </form>
      <p>
        ¿Tu empresa aún no está registrada? <Link to="/e/registro">Registrarla</Link>
      </p>
      <p className="texto-suave texto-chico">¿Ya enviaste tu solicitud? Entra con el mismo correo para ver cómo va.</p>
    </section>
  )
}

/** E-02 · Código */
export function CodigoEmpresaPage() {
  const reto = useLocation().state as { challengeId: string; correoMascara: string } | null
  const verificar = useVerificarEmpresa()
  const { iniciarEmpresa } = useSesion()
  const navegar = useNavigate()
  const [codigo, setCodigo] = useState('')
  if (!reto) return <Navigate to="/e" replace />
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    verificar.mutate(
      { challengeId: reto.challengeId, codigo },
      {
        onSuccess: (emp) => {
          iniciarEmpresa(emp)
          navegar(emp.estado === 'aprobada' ? '/e/vacantes' : '/e/solicitud', { replace: true })
        },
      },
    )
  }
  return (
    <section className="pila angosta empresa-acceso">
      <Volver a="/e" texto="Volver" />
      <Encabezado titulo="Escribe tu código">Lo enviamos a {reto.correoMascara}.</Encabezado>
      <form className="tarjeta pila" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="codigo">Código de 6 dígitos</label>
          <input id="codigo" className="campo-codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} required />
        </div>
        {verificar.isError && (
          <p className="texto-error" role="alert">
            El código no es correcto o ya venció.
          </p>
        )}
        <button className="boton" disabled={verificar.isPending || codigo.length !== 6}>
          Entrar
        </button>
        <Link to="/e" className="enlace-discreto">
          No me llegó el código
        </Link>
      </form>
    </section>
  )
}

const RFC = /^[A-Z]{3,4}\d{6}[A-Z0-9]{3}$/
const limpiarRfc = (valor: string) => valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13)

/** Formulario de datos de la empresa: alta (E-03) y corrección tras un rechazo (E-09). */
function FormEmpresa({
  inicial,
  correoFijo,
  enviando,
  error,
  textoEnviar,
  onEnviar,
}: {
  inicial: RegistroEmpresa
  correoFijo?: boolean
  enviando: boolean
  error?: string
  textoEnviar: string
  onEnviar: (d: RegistroEmpresa) => void
}) {
  const [f, setF] = useState<RegistroEmpresa>(inicial)
  const [verAviso, setVerAviso] = useState(false)
  const rfc = limpiarRfc(f.rfc)
  const rfcInvalido = rfc.length > 0 && !RFC.test(rfc)
  const campo = (k: 'nombre' | 'contacto' | 'correo' | 'telefono', texto: string, extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="campo">
      <label htmlFor={`r-${k}`}>{texto}</label>
      <input id={`r-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: k === 'telefono' ? e.target.value.replace(/\D/g, '') : e.target.value })} required {...extra} />
    </div>
  )
  return (
    <>
      <form
        className="tarjeta pila"
        onSubmit={(e) => {
          e.preventDefault()
          if (!rfcInvalido) onEnviar({ ...f, nombre: f.nombre.trim(), contacto: f.contacto.trim(), correo: f.correo.trim(), rfc })
        }}
      >
        <div className="rejilla-2">
          {campo('nombre', 'Nombre de la empresa', { maxLength: 100 })}
          <div className={`campo ${rfcInvalido ? 'campo-error' : ''}`}>
            <label htmlFor="r-rfc">RFC</label>
            <input
              id="r-rfc"
              value={f.rfc}
              minLength={12}
              maxLength={13}
              autoCapitalize="characters"
              onChange={(e) => setF({ ...f, rfc: limpiarRfc(e.target.value) })}
              required
              aria-invalid={rfcInvalido}
              aria-describedby="rfc-ayuda"
            />
            <span id="rfc-ayuda" className={rfcInvalido ? 'texto-error' : 'campo-ayuda'}>
              {rfcInvalido ? 'Revisa el RFC: 12 o 13 caracteres.' : '12 caracteres (moral) o 13 (física).'}
            </span>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="r-sector">Sector</label>
          <select id="r-sector" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })}>
            {OPCIONES_VACANTE.sector.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="rejilla-2">
          {campo('contacto', 'Persona de contacto', { maxLength: 80 })}
          {campo('telefono', 'Teléfono', { type: 'tel', inputMode: 'tel', minLength: 10, maxLength: 10 })}
        </div>
        {correoFijo ? (
          <div className="campo">
            <label htmlFor="r-correo">Correo para entrar</label>
            <input id="r-correo" value={f.correo} readOnly aria-describedby="correo-ayuda" />
            <span id="correo-ayuda" className="campo-ayuda">
              No se puede cambiar aquí. Si necesitas otro correo, llama a la Secretaría.
            </span>
          </div>
        ) : (
          campo('correo', 'Correo para entrar', { type: 'email' })
        )}
        <div className="empresa-aviso">
          <input
            id="r-aviso"
            type="checkbox"
            aria-labelledby="r-aviso-texto"
            checked={f.aceptaAviso}
            onChange={(e) => setF({ ...f, aceptaAviso: e.target.checked })}
            required
          />
          <span id="r-aviso-texto">
            <label htmlFor="r-aviso">Acepto el </label>
            <button type="button" className="enlace-boton" onClick={() => setVerAviso(true)}>
              aviso de privacidad
            </button>
            <label htmlFor="r-aviso"> y no compartir los datos de las postulantes</label>
          </span>
        </div>
        {error && (
          <p className="texto-error" role="alert">
            {error}
          </p>
        )}
        <button className="boton" disabled={enviando}>
          {enviando ? 'Enviando…' : textoEnviar}
        </button>
      </form>
      <Dialogo abierto={verAviso} titulo="Aviso de privacidad" onCerrar={() => setVerAviso(false)}>
        <p>
          La Secretaría de Mujeres recaba los datos de identificación y contacto de la empresa únicamente para verificar su registro y administrar su participación en la Bolsa de Trabajo del Sistema de Atención Integral (SAI).
        </p>
        <p>
          Al registrarse, la empresa se compromete a tratar de forma confidencial la información de las postulantes, usarla exclusivamente para fines de vinculación laboral y no compartirla con terceros.
        </p>
        <div className="fila-botones">
          <button type="button" className="boton" onClick={() => setVerAviso(false)}>
            Entendido
          </button>
        </div>
      </Dialogo>
    </>
  )
}

/** E-03 · Registrar empresa. Queda en revisión hasta que Capacitación la apruebe. */
export function RegistroEmpresaPage() {
  const registrar = useRegistrarEmpresa()
  const [enviada, setEnviada] = useState<RegistroEmpresa | null>(null)
  if (enviada)
    return (
      <section className="pila angosta">
        <Encabezado titulo="Recibimos tu solicitud" />
        <div className="estado estado-exito" role="status">
          Capacitación de la Secretaría revisará los datos de {enviada.nombre} en un máximo de 3 días hábiles. Te avisaremos a {enviada.correo}.
        </div>
        <p className="texto-suave">Mientras tanto, puedes ver cómo va tu solicitud entrando con ese mismo correo.</p>
        <Link to="/e" className="boton-secundario">
          Ir a entrar
        </Link>
      </section>
    )
  return (
    <section className="pila angosta">
      <Volver a="/e" texto="Volver" />
      <Encabezado antetitulo="Bolsa de trabajo" titulo="Registrar mi empresa">
        Solo pedimos lo necesario para verificar que la empresa existe.
      </Encabezado>
      <FormEmpresa
        inicial={{ nombre: '', rfc: '', sector: OPCIONES_VACANTE.sector[0]!, contacto: '', correo: '', telefono: '', aceptaAviso: false }}
        enviando={registrar.isPending}
        error={registrar.isError ? 'No pudimos registrar la empresa. Puede que el RFC o el correo ya estén registrados.' : undefined}
        textoEnviar="Enviar solicitud"
        onEnviar={(d) => registrar.mutate(d, { onSuccess: () => setEnviada(d) })}
      />
    </section>
  )
}

const PASOS_SOLICITUD = ['Solicitud enviada', 'Revisión de Capacitación', 'Lista para publicar']

/** E-08 · Estado de mi solicitud: en revisión, rechazada (con motivo), suspendida o aprobada. */
export function SolicitudEmpresaPage() {
  const q = useMiSolicitud()
  const { iniciarEmpresa } = useSesion()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  return (
    <section className="pila angosta">
      <Encabezado antetitulo="Bolsa de trabajo" titulo="Mi solicitud" />
      {aviso && (
        <p className="estado estado-exito" role="status">
          {aviso}
        </p>
      )}
      <Consulta q={q}>
        {(e) => {
          const actual = e.estado === 'aprobada' ? 2 : 1
          return (
            <>
              <div className="tarjeta pila-corta">
                <span className="fila-accion">
                  <strong>{e.nombre}</strong>
                  <ChipEmpresa estado={e.estado} />
                </span>
                <p className="texto-suave texto-chico">
                  RFC {e.rfc} · enviada el {fecha(e.solicitada)}
                </p>
                {e.estado !== 'suspendida' && (
                  <ol className="pasos avance-postulacion" aria-label="Avance de la solicitud">
                    {PASOS_SOLICITUD.map((p, i) => (
                      <li key={p} aria-current={i === actual ? 'step' : undefined} className={i < actual ? 'hecho' : undefined}>
                        {p}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {e.estado === 'en_revision' && (
                <div className="estado estado-aviso pila-corta" role="status">
                  <strong>
                    <Clock size={16} aria-hidden="true" /> Estamos revisando tus datos.
                  </strong>
                  <span>
                    Capacitación verifica el RFC y puede llamar a {e.contacto} al {e.telefono}. Tarda hasta 3 días hábiles y te avisaremos a {e.correo}.
                  </span>
                </div>
              )}

              {e.estado === 'rechazada' && (
                <>
                  <div className="estado estado-urgente pila-corta" role="alert">
                    <strong>No pudimos aprobar tu solicitud.</strong>
                    <span>Motivo: {e.motivo}</span>
                  </div>
                  <p>Corrige los datos y vuelve a enviarla. Capacitación la revisará otra vez.</p>
                  <Link to="/e/solicitud/corregir" className="boton">
                    Corregir y reenviar
                  </Link>
                </>
              )}

              {e.estado === 'suspendida' && (
                <div className="estado estado-urgente pila-corta" role="alert">
                  <strong>Tu cuenta está suspendida.</strong>
                  {e.motivo && <span>Motivo: {e.motivo}</span>}
                  <span>Tus vacantes están pausadas. Para reactivarla, comunícate con Capacitación de la Secretaría.</span>
                </div>
              )}

              {e.estado === 'aprobada' && (
                <>
                  <p className="estado estado-exito" role="status">
                    ¡Tu empresa ya está aprobada! Ya puedes publicar vacantes.
                  </p>
                  <Link to="/e/vacantes" className="boton" onClick={() => iniciarEmpresa({ id: e.id, nombre: e.nombre, estado: e.estado })}>
                    Ir a mis vacantes
                  </Link>
                </>
              )}
            </>
          )
        }}
      </Consulta>
    </section>
  )
}

/** E-09 · Corregir y reenviar la solicitud rechazada. El correo de acceso no cambia. */
export function CorregirSolicitudPage() {
  const q = useMiSolicitud()
  const corregir = useCorregirSolicitud()
  const { iniciarEmpresa } = useSesion()
  const navegar = useNavigate()
  return (
    <section className="pila angosta">
      <Volver a="/e/solicitud" texto="Mi solicitud" />
      <Encabezado antetitulo="Bolsa de trabajo" titulo="Corregir solicitud" />
      <Consulta q={q}>
        {(e) =>
          // Tras reenviar, la consulta ya trae «en_revision»: no redirigir aquí para no perder el aviso.
          e.estado !== 'rechazada' && !corregir.isSuccess ? (
            <Navigate to="/e/solicitud" replace />
          ) : (
            <>
              <p className="estado estado-aviso">Capacitación pidió: {e.motivo}</p>
              <FormEmpresa
                inicial={{ nombre: e.nombre, rfc: e.rfc, sector: e.sector, contacto: e.contacto, correo: e.correo, telefono: e.telefono, aceptaAviso: false }}
                correoFijo
                enviando={corregir.isPending}
                error={corregir.isError ? 'No pudimos reenviar la solicitud. Intenta de nuevo.' : undefined}
                textoEnviar="Reenviar solicitud"
                onEnviar={(d) =>
                  corregir.mutate(d, {
                    onSuccess: (r) => {
                      iniciarEmpresa({ id: e.id, nombre: d.nombre, estado: r.estado })
                      navegar('/e/solicitud', { replace: true, state: { aviso: 'Reenviaste tu solicitud. Capacitación la revisará de nuevo.' } })
                    },
                  })
                }
              />
            </>
          )
        }
      </Consulta>
    </section>
  )
}

// ---------------------------------------------------------------------
/** E-04 · Mis vacantes */
export function VacantesEmpresaPage() {
  const q = useVacantesEmpresa()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  return (
    <section className="pila">
      <Encabezado
        antetitulo="Empresa"
        titulo="Mis vacantes"
        acciones={
          <Link to="/e/vacantes/nueva" className="boton">
            <Plus size={18} aria-hidden="true" /> Publicar vacante
          </Link>
        }
      />
      {aviso && (
        <p className="estado estado-exito" role="status">
          {aviso}
        </p>
      )}
      <Consulta
        q={q}
        vacio={
          <>
            Aún no publicas vacantes. <Link to="/e/vacantes/nueva">Publica la primera</Link>
          </>
        }
      >
        {(lista) => (
          <ul className="lista-simple rejilla-vacantes">
            {lista.map((v) => (
              <li key={v.id}>
                <Link to={`/e/vacantes/${v.id}`} className="tarjeta tarjeta-enlace pila-corta">
                  <span className="fila-accion">
                    <strong>{v.puesto}</strong>
                    <ChipVacante estado={v.estado} />
                  </span>
                  <span className="texto-suave">
                    {v.ubicacion} · {v.horario}
                  </span>
                  <span>
                    <span className="cifra">{v.postulaciones ?? 0}</span> postulantes
                    {(v.nuevas ?? 0) > 0 && <span className="insignia insignia-linea">{v.nuevas} {v.nuevas === 1 ? 'nueva' : 'nuevas'}</span>}
                  </span>
                  {v.estado === 'cambios' && <span className="estado estado-aviso texto-chico">Capacitación pide cambios: {v.motivoCambios}</span>}
                  {v.estado === 'en_revision' && <span className="texto-suave texto-chico">Capacitación la revisa antes de publicarla (1 día hábil).</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
    </section>
  )
}

/** E-05 · Publicar vacante */
export function NuevaVacanteEmpresaPage() {
  const crear = useCrearVacanteEmpresa()
  const navegar = useNavigate()
  return (
    <section className="pila angosta">
      <Volver a="/e/vacantes" texto="Mis vacantes" />
      <Encabezado antetitulo="Empresa" titulo="Publicar vacante">
        Capacitación la revisa y la publica. Te avisamos por correo.
      </Encabezado>
      <FormVacante enviando={crear.isPending} textoEnviar="Enviar a revisión" cancelarA="/e/vacantes" onEnviar={(d) => crear.mutate(d, { onSuccess: () => navegar('/e/vacantes', { state: { aviso: 'Tu vacante se envió a revisión.' } }) })} />
    </section>
  )
}

/** E-05b · Editar vacante (vuelve a revisión). */
export function EditarVacanteEmpresaPage() {
  const { vacanteId = '' } = useParams()
  const q = useVacanteEmpresa(vacanteId)
  const actualizar = useActualizarVacanteEmpresa(vacanteId)
  const navegar = useNavigate()
  return (
    <section className="pila angosta">
      <Volver a={`/e/vacantes/${vacanteId}`} texto="Vacante" />
      <Encabezado antetitulo="Empresa" titulo="Editar vacante">
        Al guardar, la vacante vuelve a revisión. Las postulaciones que ya tienes no se pierden.
      </Encabezado>
      <Consulta q={q} vacio="Esta vacante no existe." esVacio={(v) => v === null}>
        {(v) =>
          v && (
            <FormVacante
              inicial={v}
              enviando={actualizar.isPending}
              textoEnviar="Guardar y enviar a revisión"
              cancelarA={`/e/vacantes/${vacanteId}`}
              antes={v.estado === 'cambios' && <p className="estado estado-aviso">Capacitación pide: {v.motivoCambios}</p>}
              onEnviar={(d) => actualizar.mutate(d, { onSuccess: () => navegar(`/e/vacantes/${vacanteId}`) })}
            />
          )
        }
      </Consulta>
    </section>
  )
}

type Filtro = 'todas' | EstadoPostulacion
const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'enviada', texto: 'Nuevas' },
  { valor: 'en_revision', texto: 'En revisión' },
  { valor: 'entrevista', texto: 'Entrevista' },
  { valor: 'aceptada', texto: 'Aceptadas' },
  { valor: 'no_seleccionada', texto: 'No seleccionadas' },
]

/** E-06 · Vacante y sus postulantes */
export function VacanteEmpresaPage() {
  const { vacanteId = '' } = useParams()
  const q = useVacanteEmpresa(vacanteId)
  const postulantes = usePostulantes(vacanteId)
  const actualizar = useActualizarVacanteEmpresa(vacanteId)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [cerrando, setCerrando] = useState(false)
  return (
    <section className="pila">
      <Volver a="/e/vacantes" texto="Mis vacantes" />
      <Consulta q={q} vacio="Esta vacante no existe." esVacio={(v) => v === null}>
        {(v) =>
          v && (
            <>
              <Encabezado
                antetitulo={`${v.ubicacion} · ${v.horario} · ${v.tipoEmpleo}`}
                titulo={v.puesto}
                acciones={
                  v.estado !== 'cerrada' && (
                    <>
                      <Link to={`/e/vacantes/${v.id}/editar`} className="boton-secundario boton-chico">
                        Editar
                      </Link>
                      {v.estado === 'publicada' && (
                        <button type="button" className="boton-secundario boton-chico" disabled={actualizar.isPending} onClick={() => actualizar.mutate({ estado: 'pausada' })}>
                          Pausar
                        </button>
                      )}
                      {v.estado === 'pausada' && (
                        <button type="button" className="boton-secundario boton-chico" disabled={actualizar.isPending} onClick={() => actualizar.mutate({ estado: 'publicada' })}>
                          Reanudar
                        </button>
                      )}
                      <button type="button" className="boton-secundario boton-chico" onClick={() => setCerrando(true)}>
                        Cerrar vacante
                      </button>
                    </>
                  )
                }
              >
                <ChipVacante estado={v.estado} /> {v.estado === 'pausada' && 'No aparece a las usuarias, pero conservas a tus postulantes.'}
              </Encabezado>
              {v.estado === 'cambios' && (
                <p className="estado estado-aviso">
                  Capacitación pide cambios: {v.motivoCambios} <Link to={`/e/vacantes/${v.id}/editar`}>Corregir</Link>
                </p>
              )}
              <Dialogo abierto={cerrando} titulo="¿Cerrar la vacante?" onCerrar={() => setCerrando(false)}>
                <p>Ya no recibirá postulaciones. A quienes sigan en proceso se les avisará que no fueron seleccionadas.</p>
                <div className="fila-botones">
                  <button type="button" className="boton-secundario" onClick={() => setCerrando(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="boton" onClick={() => actualizar.mutate({ estado: 'cerrada' }, { onSuccess: () => setCerrando(false) })}>
                    Cerrar vacante
                  </button>
                </div>
              </Dialogo>
            </>
          )
        }
      </Consulta>

      <h2 className="subtitulo">Postulantes</h2>
      <Segmentos opciones={FILTROS} valor={filtro} onCambio={setFiltro} etiqueta="Filtrar postulantes" />
      <Consulta q={postulantes} vacio="Aún no hay postulantes.">
        {(lista) => {
          const vista = lista.filter((p) => filtro === 'todas' || p.estado === filtro)
          if (vista.length === 0) return <p className="texto-suave">No hay postulantes en «{FILTROS.find((f) => f.valor === filtro)!.texto}».</p>
          return (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Estudios</th>
                    <th scope="col">Experiencia</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Recibida</th>
                  </tr>
                </thead>
                <tbody>
                  {vista.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/e/vacantes/${vacanteId}/postulantes/${p.id}`} className="enlace-fuerte">
                          {p.cv.nombre}
                        </Link>{' '}
                        {!p.vista && <span className="insignia insignia-linea">Nueva</span>}
                      </td>
                      <td>{p.cv.escolaridad}</td>
                      <td>{p.cv.experiencia.length === 0 ? 'Primer empleo' : p.cv.experiencia[0]!.puesto}</td>
                      <td>
                        <ChipPostulacion estado={p.estado} />
                        {p.entrevista?.respuesta === 'otra_fecha' && p.estado === 'entrevista' && <span className="texto-chico texto-error"> Pidió otra fecha</span>}
                      </td>
                      <td>{fecha(p.enviada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }}
      </Consulta>
    </section>
  )
}

// ---------------------------------------------------------------------
const MODALIDADES: Entrevista['modalidad'][] = ['Presencial', 'Llamada', 'Videollamada']

/** E-07 · Postulante: CV sin contacto y las tres decisiones (entrevista, aceptar, no seleccionar). */
export function PostulantePage() {
  const { vacanteId = '', postulacionId = '' } = useParams()
  const q = usePostulante(postulacionId)
  const entrevista = useProponerEntrevista(postulacionId)
  const decidir = useDecidir(postulacionId)
  const [dialogo, setDialogo] = useState<'entrevista' | 'aceptar' | 'no' | null>(null)
  const [ent, setEnt] = useState<Omit<Entrevista, 'respuesta'>>({ fecha: '', hora: '10:00', modalidad: 'Presencial', lugar: '' })
  const [motivo, setMotivo] = useState(MOTIVOS_NO[0]!)
  const cerrar = () => setDialogo(null)

  return (
    <section className="pila angosta">
      <Volver a={`/e/vacantes/${vacanteId}`} texto="Postulantes" />
      <Consulta q={q} vacio="Esta postulación ya no está disponible." esVacio={(p) => p === null}>
        {(p) =>
          p && (
            <>
              <Encabezado antetitulo={`${p.puesto} · folio ${p.folio}`} titulo={p.cv.nombre}>
                <ChipPostulacion estado={p.estado} /> Recibida el {fecha(p.enviada)}
              </Encabezado>

              <div className="tarjeta pila-corta">
                <p className="etiqueta-peque">CV</p>
                <ResumenCv cv={p.cv} />
              </div>

              <div className="tarjeta pila-corta">
                <p className="etiqueta-peque">Contacto</p>
                {p.telefono ? (
                  <p>
                    Teléfono: <strong>{p.telefono}</strong>
                  </p>
                ) : (
                  <p className="texto-suave">
                    Por seguridad, el teléfono no se muestra. {p.estado === 'aceptada' ? 'La Secretaría la está llamando y te lo compartirá pronto.' : 'Si la aceptas, la Secretaría te lo comparte después de hablar con ella. Para entrevistas, propón fecha aquí y ella confirma desde su portal.'}
                  </p>
                )}
              </div>

              {p.entrevista && (
                <div className="tarjeta pila-corta">
                  <p className="etiqueta-peque">
                    <CalendarClock size={14} aria-hidden="true" /> Entrevista
                  </p>
                  <p className="dato-grande">
                    {fechaLarga(p.entrevista.fecha)}, {hora12(p.entrevista.hora)}
                  </p>
                  <p>
                    {p.entrevista.modalidad} · {p.entrevista.lugar}
                  </p>
                  <p className={p.entrevista.respuesta === 'otra_fecha' ? 'estado estado-aviso' : 'texto-suave'}>
                    {p.entrevista.respuesta === null ? 'Esperando que confirme.' : p.entrevista.respuesta === 'confirmada' ? 'Confirmó que asistirá.' : 'Pidió otra fecha. Propón una nueva.'}
                  </p>
                </div>
              )}

              {(p.estado === 'enviada' || p.estado === 'en_revision' || p.estado === 'entrevista') && (
                <div className="fila-botones">
                  <button type="button" className="boton-secundario" onClick={() => setDialogo('no')}>
                    No seleccionar
                  </button>
                  <button type="button" className="boton-secundario" onClick={() => setDialogo('entrevista')}>
                    {p.entrevista ? 'Cambiar entrevista' : 'Proponer entrevista'}
                  </button>
                  <button type="button" className="boton" onClick={() => setDialogo('aceptar')}>
                    Aceptar
                  </button>
                </div>
              )}
              {p.estado === 'no_seleccionada' && <p className="texto-suave">Marcaste esta postulación como {TEXTO_POSTULACION[p.estado].toLowerCase()}.</p>}

              <Dialogo abierto={dialogo === 'entrevista'} titulo="Proponer entrevista" onCerrar={cerrar}>
                <form
                  className="pila"
                  onSubmit={(e) => {
                    e.preventDefault()
                    entrevista.mutate(ent, { onSuccess: cerrar })
                  }}
                >
                  <div className="rejilla-2">
                    <div className="campo">
                      <label htmlFor="en-fecha">Fecha</label>
                      <input id="en-fecha" type="date" min={hoy()} value={ent.fecha} onChange={(e) => setEnt({ ...ent, fecha: e.target.value })} required />
                    </div>
                    <div className="campo">
                      <label htmlFor="en-hora">Hora</label>
                      <input id="en-hora" type="time" value={ent.hora} onChange={(e) => setEnt({ ...ent, hora: e.target.value })} required />
                    </div>
                  </div>
                  <div className="campo">
                    <label htmlFor="en-modo">Modalidad</label>
                    <select id="en-modo" value={ent.modalidad} onChange={(e) => setEnt({ ...ent, modalidad: e.target.value as Entrevista['modalidad'] })}>
                      {MODALIDADES.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="campo">
                    <label htmlFor="en-lugar">{ent.modalidad === 'Presencial' ? 'Dirección' : 'Indicaciones'}</label>
                    <input id="en-lugar" value={ent.lugar} onChange={(e) => setEnt({ ...ent, lugar: e.target.value })} required maxLength={140} placeholder={ent.modalidad === 'Presencial' ? 'Calle, número y colonia' : 'Ej. Te llamaremos del 668 100 0001'} />
                    {ent.modalidad === 'Llamada' && <span className="campo-ayuda">Como no ves su teléfono, la llamada se hace a través de la Secretaría o ella te llama al número que indiques.</span>}
                  </div>
                  <button className="boton" disabled={entrevista.isPending}>
                    Enviar propuesta
                  </button>
                </form>
              </Dialogo>

              <Dialogo abierto={dialogo === 'aceptar'} titulo={`¿Aceptar a ${p.cv.nombre}?`} onCerrar={cerrar}>
                <p>La Secretaría la llamará para darle la noticia y, con su permiso, te compartirá su teléfono aquí.</p>
                <div className="fila-botones">
                  <button type="button" className="boton-secundario" onClick={cerrar}>
                    Cancelar
                  </button>
                  <button type="button" className="boton" disabled={decidir.isPending} onClick={() => decidir.mutate({ decision: 'aceptada' }, { onSuccess: cerrar })}>
                    Sí, aceptar
                  </button>
                </div>
              </Dialogo>

              <Dialogo abierto={dialogo === 'no'} titulo="No seleccionar" onCerrar={cerrar}>
                <div className="campo">
                  <label htmlFor="motivo">Motivo (solo lo ve la Secretaría)</label>
                  <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    {MOTIVOS_NO.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <p className="texto-suave">A ella le avisaremos con un mensaje amable, sin el motivo.</p>
                <div className="fila-botones">
                  <button type="button" className="boton-secundario" onClick={cerrar}>
                    Cancelar
                  </button>
                  <button type="button" className="boton" disabled={decidir.isPending} onClick={() => decidir.mutate({ decision: 'no_seleccionada', motivo }, { onSuccess: cerrar })}>
                    Confirmar
                  </button>
                </div>
              </Dialogo>
            </>
          )
        }
      </Consulta>
    </section>
  )
}
