import { useState } from 'react'
import { Link } from 'react-router'
import { ChartColumn, Inbox, Map, MessageSquareHeart, ScrollText, Users } from 'lucide-react'
import { useCrearCuenta, useCuentas, useEditarCuenta, useResolverSolicitud, useSolicitudes, type Cuenta, type Solicitud } from '@/features/administracion/api'
import { ACCIONES, useBitacora, type FiltrosBitacora } from '@/features/bitacora/api'
import { useResultadosEncuestas } from '@/features/encuestas/api'
import { DialogoMotivo } from '@/features/expedientes/Expediente'
import { ROLES, esAtencion, textoRol, useSesion, type Rol } from '@/features/identidad/sesion'
import { useResumen, type Periodo, type Serie } from '@/features/tablero/api'
import { Consulta } from '@/shared/ui/Estados'
import { Dialogo } from '@/shared/ui/Dialogo'
import { Encabezado } from '@/shared/ui/Encabezado'
import { Segmentos } from '@/shared/ui/Pestanas'
import { fecha, fechaHora, numero } from '@/shared/lib/formato'

/** D-01 · Inicio de Administración */
export function InicioAdministracionPage() {
  const { personal } = useSesion()
  const resumen = useResumen('12m')
  const solicitudes = useSolicitudes('pendiente')
  const accesos = [
    { to: '/administracion/reportes', texto: 'Reportes', icono: ChartColumn },
    { to: '/administracion/mapa', texto: 'Mapa de Ahome', icono: Map },
    { to: '/administracion/solicitudes', texto: 'Solicitudes de acceso', icono: Inbox, cuenta: solicitudes.data?.length },
    { to: '/administracion/bitacora', texto: 'Bitácora', icono: ScrollText },
    { to: '/administracion/personal', texto: 'Personal', icono: Users },
    { to: '/administracion/opinion', texto: 'Opinión de usuarias', icono: MessageSquareHeart },
  ]
  return (
    <section className="pila">
      <Encabezado antetitulo="Administración" titulo={`Hola, ${personal!.nombre.split(' ')[0]}`}>
        Cifras agregadas y anonimizadas. Administración no abre expedientes.
      </Encabezado>
      <Consulta q={resumen}>
        {(r) => (
          <div className="rejilla-indicadores">
            {r.indicadores.slice(0, 3).map((i) => (
              <div key={i.clave} className="tarjeta indicador">
                <span className="etiqueta-peque">{i.titulo}</span>
                <span className="cifra indicador-valor">{numero(i.valor)}</span>
                <span className="texto-suave">{i.detalle}</span>
              </div>
            ))}
          </div>
        )}
      </Consulta>
      <div className="mosaico mosaico-panel">
        {accesos.map(({ to, texto, icono: Icono, cuenta }) => (
          <Link key={to} to={to} className="tarjeta mosaico-item">
            <Icono size={24} aria-hidden="true" /> {texto}
            {!!cuenta && <span className="insignia">{cuenta}</span>}
          </Link>
        ))}
      </div>
    </section>
  )
}

function Barras({ titulo, serie }: { titulo: string; serie: Serie[] }) {
  const max = Math.max(1, ...serie.map((s) => s.valor ?? 0))
  return (
    <figure className="tarjeta barras">
      {titulo && <figcaption className="subtitulo">{titulo}</figcaption>}
      <ul className="lista-simple">
        {serie.map((s) => (
          <li key={s.etiqueta} className="barra-fila">
            <span className="barra-etiqueta">{s.etiqueta}</span>
            <span className="barra-pista">
              {s.valor === null ? <span className="barra-suprimida calor-suprimido" style={{ width: '100%' }} /> : <span className="barra-relleno" style={{ width: `${(s.valor / max) * 100}%` }} />}
            </span>
            <span className="cifra barra-valor">{numero(s.valor)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: '30d', texto: 'Últimos 30 días' },
  { valor: '6m', texto: '6 meses' },
  { valor: '12m', texto: '12 meses' },
]

/** D-02 · Reportes */
export function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('12m')
  const q = useResumen(periodo)
  return (
    <section className="pila">
      <Encabezado antetitulo="Administración" titulo="Reportes">
        Personas únicas, sin duplicados. «—» significa menos de 5 casos y se oculta por privacidad.
      </Encabezado>
      <Segmentos opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} etiqueta="Periodo" />
      <Consulta q={q}>
        {(r) => (
          <>
            <div className="rejilla-indicadores">
              {r.indicadores.map((i) => (
                <div key={i.clave} className="tarjeta indicador">
                  <span className="etiqueta-peque">{i.titulo}</span>
                  <span className="cifra indicador-valor">{numero(i.valor)}</span>
                  <span className="texto-suave">{i.detalle}</span>
                </div>
              ))}
            </div>
            <div className="rejilla-graficas">
              <Barras titulo="Casos nuevos por mes" serie={r.porMes} />
              <Barras titulo="Origen del primer contacto" serie={r.porOrigen} />
              <Barras titulo="Atención por área" serie={r.porArea} />
            </div>
            <p className="texto-suave texto-chico">
              Corte: {r.corte}. {r.metodologia}
            </p>
          </>
        )}
      </Consulta>
    </section>
  )
}

const ESTADOS_SOL: { valor: 'todas' | Solicitud['estado']; texto: string }[] = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'asignada', texto: 'Asignadas' },
  { valor: 'rechazada', texto: 'Rechazadas' },
  { valor: 'todas', texto: 'Todas' },
]
const ROL_DE_DEPTO: Record<string, Rol> = { 'Trabajo social': 'trabajo-social', Psicología: 'psicologia', Jurídico: 'juridico' }

/** D-04 · Solicitudes de acceso: solo metadatos; asignar no abre el expediente para Administración. */
export function SolicitudesPage() {
  const [estado, setEstado] = useState<'todas' | Solicitud['estado']>('pendiente')
  const q = useSolicitudes(estado === 'todas' ? undefined : estado)
  const resolver = useResolverSolicitud()
  const [asignar, setAsignar] = useState<Solicitud | null>(null)
  const [rechazar, setRechazar] = useState<Solicitud | null>(null)
  const [staff, setStaff] = useState('')
  const [motivo, setMotivo] = useState('')
  const personalArea = useCuentas('', asignar ? ROL_DE_DEPTO[asignar.departamento] : undefined)

  return (
    <section className="pila">
      <Encabezado antetitulo="Administración" titulo="Solicitudes de acceso">
        Ves quién pide acceso y por qué. Nunca los datos de la persona ni las notas.
      </Encabezado>
      <Segmentos opciones={ESTADOS_SOL} valor={estado} onCambio={setEstado} etiqueta="Estado" />
      <Consulta q={q} vacio="No hay solicitudes en este estado.">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((s) => (
              <li key={s.id} className="tarjeta canalizacion">
                <div>
                  <p className="fila-chips">
                    <span className={`estado-chip estado-chip-${s.estado}`}>{s.estado}</span>
                    <span className="texto-suave texto-chico">
                      {s.id} · {fecha(s.fecha)}
                    </span>
                  </p>
                  <h3>
                    {s.solicitante} <span className="texto-suave">· {s.departamento}</span>
                  </h3>
                  <p className="texto-suave">{s.motivo}</p>
                </div>
                {s.estado === 'pendiente' && (
                  <div className="fila-botones">
                    <button type="button" className="boton boton-chico" onClick={() => setAsignar(s)}>
                      Asignar
                    </button>
                    <button type="button" className="boton-secundario boton-chico" onClick={() => setRechazar(s)}>
                      Rechazar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      <Dialogo
        abierto={asignar !== null}
        titulo="Asignar expediente"
        onCerrar={() => {
          setAsignar(null)
          setStaff('')
          setMotivo('')
        }}
      >
        <form
          className="pila"
          onSubmit={(e) => {
            e.preventDefault()
            if (asignar) resolver.mutate({ solicitud: asignar, decision: 'asignar', staffId: staff, motivo }, { onSuccess: () => setAsignar(null) })
          }}
        >
          <div className="campo">
            <label htmlFor="staff">Persona de {asignar?.departamento}</label>
            <select id="staff" value={staff} onChange={(e) => setStaff(e.target.value)} required>
              <option value="">Elige</option>
              {personalArea.data
                ?.filter((c) => c.estado === 'activa')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="motivo-asig">Motivo</label>
            <textarea id="motivo-asig" className="area" rows={3} minLength={10} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </div>
          <button className="boton" disabled={resolver.isPending}>
            Confirmar asignación
          </button>
        </form>
      </Dialogo>
      <DialogoMotivo
        abierto={rechazar !== null}
        titulo="Rechazar solicitud"
        boton="Rechazar"
        onCerrar={() => setRechazar(null)}
        onConfirmar={(m) => {
          if (rechazar) resolver.mutate({ solicitud: rechazar, decision: 'rechazar', motivo: m })
          setRechazar(null)
        }}
      />
    </section>
  )
}

/** D-05 · Bitácora (solo lectura; la consulta también se registra). */
export function BitacoraPage() {
  const [f, setF] = useState<FiltrosBitacora>({})
  const q = useBitacora(f)
  const set = (k: keyof FiltrosBitacora) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value || undefined })
  return (
    <section className="pila">
      <Encabezado antetitulo="Administración" titulo="Bitácora">
        Quién consultó o modificó cada expediente.
      </Encabezado>
      <p className="estado estado-aviso">Esta consulta también queda registrada en la bitácora.</p>
      <div className="filtros tarjeta tarjeta-lila">
        <div className="campo campo-chico">
          <label htmlFor="b-actor">Usuario</label>
          <input id="b-actor" value={f.actor ?? ''} onChange={set('actor')} />
        </div>
        <div className="campo campo-chico">
          <label htmlFor="b-exp">Expediente</label>
          <input id="b-exp" value={f.expediente ?? ''} onChange={set('expediente')} placeholder="EXP-0412" />
        </div>
        <div className="campo campo-chico">
          <label htmlFor="b-accion">Acción</label>
          <select id="b-accion" value={f.accion ?? ''} onChange={set('accion')}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="campo campo-chico">
          <label htmlFor="b-desde">Desde</label>
          <input id="b-desde" type="date" value={f.desde ?? ''} onChange={set('desde')} />
        </div>
        <div className="campo campo-chico">
          <label htmlFor="b-hasta">Hasta</label>
          <input id="b-hasta" type="date" value={f.hasta ?? ''} onChange={set('hasta')} />
        </div>
      </div>
      <Consulta q={q} vacio="No hay eventos con estos filtros.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Expediente</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <td>{fechaHora(e.fecha)}</td>
                    <td>
                      {e.actor} <div className="texto-suave texto-chico">{e.rol}</div>
                    </td>
                    <td>{e.accion}</td>
                    <td>{e.expediente ?? '—'}</td>
                    <td>{e.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Consulta>
    </section>
  )
}

/** D-06 · Personal: solo identidad laboral, nunca datos de personas atendidas. */
export function PersonalPage() {
  const { personal } = useSesion()
  const [texto, setTexto] = useState('')
  const q = useCuentas(texto)
  const crear = useCrearCuenta()
  const editar = useEditarCuenta()
  const [nueva, setNueva] = useState(false)
  const [f, setF] = useState({ usuario: '', nombre: '', rol: 'trabajo-social' as Rol })
  const [cambio, setCambio] = useState<{ c: Cuenta; cambios: Partial<Pick<Cuenta, 'rol' | 'estado'>> } | null>(null)

  return (
    <section className="pila">
      <Encabezado
        antetitulo="Administración"
        titulo="Personal"
        acciones={
          <button type="button" className="boton" onClick={() => setNueva(true)}>
            Nueva cuenta
          </button>
        }
      />
      <div className="campo campo-chico buscador">
        <label htmlFor="buscar">Buscar por usuario o nombre</label>
        <input id="buscar" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <Consulta q={q} vacio="No hay cuentas que coincidan.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Área</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const propia = c.usuario === personal?.usuario
                  return (
                    <tr key={c.id}>
                      <td className="enlace-fuerte">{c.nombre}</td>
                      <td>{c.usuario}</td>
                      <td>
                        <span className={`etiqueta ${ROLES.find((r) => r.valor === c.rol)!.clase}`}>{textoRol(c.rol)}</span>
                      </td>
                      <td>
                        <span className={`estado-chip estado-chip-${c.estado}`}>{c.estado === 'activa' ? 'Activa' : 'Suspendida'}</span>
                      </td>
                      <td>{c.ultimoAcceso === '—' ? '—' : fecha(c.ultimoAcceso)}</td>
                      <td>
                        {!propia && (
                          <span className="fila-botones">
                            <select aria-label={`Cambiar área de ${c.nombre}`} value={c.rol} onChange={(e) => setCambio({ c, cambios: { rol: e.target.value as Rol } })} className="select-chico">
                              {ROLES.map((r) => (
                                <option key={r.valor} value={r.valor}>
                                  {r.texto}
                                </option>
                              ))}
                            </select>
                            <button type="button" className="boton-secundario boton-chico" onClick={() => setCambio({ c, cambios: { estado: c.estado === 'activa' ? 'suspendida' : 'activa' } })}>
                              {c.estado === 'activa' ? 'Suspender' : 'Reactivar'}
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Consulta>

      <Dialogo
        abierto={nueva}
        titulo="Nueva cuenta"
        onCerrar={() => {
          setNueva(false)
          crear.reset()
          setF({ usuario: '', nombre: '', rol: 'trabajo-social' })
        }}
      >
        {crear.isSuccess ? (
          <div className="pila">
            <p className="estado estado-exito">Cuenta creada para {crear.data.cuenta.nombre}.</p>
            <p>Código de activación de un solo uso:</p>
            <p className="codigo-activacion cifra">{crear.data.activacion}</p>
            <p className="texto-suave">Se muestra una sola vez. Entrégalo en persona; no lo envíes por mensaje ni correo.</p>
          </div>
        ) : (
          <form
            className="pila"
            onSubmit={(e) => {
              e.preventDefault()
              crear.mutate(f)
            }}
          >
            <div className="campo">
              <label htmlFor="n-nombre">Nombre laboral</label>
              <input id="n-nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required />
            </div>
            <div className="campo">
              <label htmlFor="n-usuario">Usuario</label>
              <input id="n-usuario" autoComplete="off" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} required pattern="[a-z0-9._-]{3,30}" />
              <span className="campo-ayuda">Minúsculas, sin espacios.</span>
            </div>
            <div className="campo">
              <label htmlFor="n-rol">Área</label>
              <select id="n-rol" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })}>
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.texto}
                  </option>
                ))}
              </select>
              {esAtencion(f.rol) && <span className="campo-ayuda">Verá solo los expedientes que se le asignen.</span>}
            </div>
            <button className="boton" disabled={crear.isPending}>
              Crear cuenta
            </button>
          </form>
        )}
      </Dialogo>

      <Dialogo abierto={cambio !== null} titulo="Confirmar cambio" onCerrar={() => setCambio(null)}>
        <div className="pila">
          <p>
            {cambio?.cambios.rol && `Cambiar el área de ${cambio.c.nombre} a ${textoRol(cambio.cambios.rol)}.`}
            {cambio?.cambios.estado && `${cambio.cambios.estado === 'suspendida' ? 'Suspender' : 'Reactivar'} la cuenta de ${cambio.c.nombre}.`}
          </p>
          <p className="estado estado-aviso">Se cerrarán todas sus sesiones abiertas.</p>
          <button
            type="button"
            className="boton"
            disabled={editar.isPending}
            onClick={() => cambio && editar.mutate({ id: cambio.c.id, cambios: cambio.cambios }, { onSuccess: () => setCambio(null) })}
          >
            Confirmar
          </button>
        </div>
      </Dialogo>
    </section>
  )
}

/** D-07 · Opinión de usuarias: solo resultados agregados (supuesto 9). */
export function OpinionPage() {
  const q = useResultadosEncuestas()
  return (
    <section className="pila">
      <Encabezado antetitulo="Administración" titulo="Opinión de usuarias">
        Resultados agregados de las encuestas. No se muestran respuestas individuales; «—» son menos de 5 respuestas.
      </Encabezado>
      <Consulta q={q} vacio="Aún no hay respuestas.">
        {(lista) => (
          <div className="rejilla-graficas">
            {lista.map((r) => (
              <div key={r.encuestaId} className="tarjeta pila-corta">
                <h2 className="subtitulo">{r.titulo}</h2>
                <p className="texto-suave">
                  <span className="cifra">{r.respuestas}</span> respuestas
                </p>
                {r.preguntas.map((p) => (
                  <div key={p.id} className="pila-corta">
                    <p className="enlace-fuerte">{p.texto}</p>
                    {p.promedio !== undefined && (
                      <p>
                        <span className="cifra indicador-valor">{p.promedio.toFixed(1)}</span> <span className="texto-suave">de 5 en promedio</span>
                      </p>
                    )}
                    {p.conteo && (
                      <Barras
                        titulo=""
                        serie={p.conteo.map((c) => ({ etiqueta: c.opcion, valor: c.total }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Consulta>
    </section>
  )
}
