import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, MapPinned, Plus } from 'lucide-react'
import {
  OPCIONES_VACANTE,
  TIPOS_EVENTO,
  hora12,
  useAsistencia,
  useCrearCurso,
  useCrearVacante,
  useCrearVisita,
  useCurso,
  useCursos,
  useGuardarAsistencia,
  useVacantes,
  useVisitas,
  type Asistente,
  type TipoEvento,
} from '@/features/capacitacion/api'
import { EtiquetaEvento, TarjetaEvento } from '@/features/portal/ForoEmpleo'
import { useSesion } from '@/features/identidad/sesion'
import { Cargando, Consulta } from '@/shared/ui/Estados'
import { Encabezado } from '@/shared/ui/Encabezado'
import { Segmentos } from '@/shared/ui/Pestanas'
import { fecha } from '@/shared/lib/formato'

const MapaCalorAhome = lazy(() => import('@/features/tablero/MapaCalorAhome').then((m) => ({ default: m.MapaCalorAhome })))

/** K-01 · Inicio de Capacitación (sin acceso a expedientes). */
export function InicioCapacitacionPage() {
  const { personal } = useSesion()
  const cursos = useCursos()
  const vacantes = useVacantes()
  const visitas = useVisitas()
  const proximos = (cursos.data ?? []).slice(0, 3)
  return (
    <section className="pila">
      <Encabezado antetitulo="Capacitación" titulo={`Hola, ${personal!.nombre.split(' ')[0]}`}>
        Cursos, bolsa de trabajo y visitas de prevención.
      </Encabezado>
      <div className="rejilla-indicadores">
        <Link to="/capacitacion/cursos" className="tarjeta indicador">
          <CalendarDays aria-hidden="true" />
          <span className="cifra indicador-valor">{cursos.data?.length ?? '…'}</span>
          <span>Eventos publicados</span>
        </Link>
        <Link to="/capacitacion/bolsa" className="tarjeta indicador">
          <BriefcaseBusiness aria-hidden="true" />
          <span className="cifra indicador-valor">{vacantes.data?.length ?? '…'}</span>
          <span>Vacantes activas</span>
        </Link>
        <Link to="/capacitacion/visitas" className="tarjeta indicador">
          <MapPinned aria-hidden="true" />
          <span className="cifra indicador-valor">{visitas.data?.filter((v) => v.estado === 'planeada').length ?? '…'}</span>
          <span>Visitas planeadas</span>
        </Link>
      </div>
      <div className="tarjeta pila-corta">
        <div className="fila-accion">
          <h2 className="subtitulo">Próximos eventos</h2>
          <Link to="/capacitacion/calendario">Ver calendario</Link>
        </div>
        {cursos.isPending ? (
          <Cargando />
        ) : (
          <ul className="lista-eventos">
            {proximos.map((c) => (
              <TarjetaEvento key={c.id} c={c} a={`/capacitacion/calendario/${c.id}/lista`} accion={<span className="texto-suave texto-chico">{c.inscritas} inscritas de {c.cupo}</span>} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

const FILTRO = [{ valor: 'todos' as const, texto: 'Todos' }, ...TIPOS_EVENTO.map((t) => ({ valor: t.valor, texto: `${t.texto}s` }))]

/** K-02 · Cursos y charlas */
export function CursosPage() {
  const [tipo, setTipo] = useState<'todos' | TipoEvento>('todos')
  const q = useCursos(tipo === 'todos' ? undefined : tipo)
  return (
    <section className="pila">
      <Encabezado
        antetitulo="Capacitación"
        titulo="Cursos y charlas"
        acciones={
          <Link to="/capacitacion/cursos/nuevo" className="boton">
            <Plus size={18} aria-hidden="true" /> Nuevo curso
          </Link>
        }
      >
        Lo que publiques aquí aparece en el foro del portal de usuarias.
      </Encabezado>
      <Segmentos opciones={FILTRO} valor={tipo} onCambio={setTipo} etiqueta="Tipo" />
      <Consulta q={q} vacio="No hay eventos de este tipo.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Evento</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Lugar</th>
                  <th scope="col">Inscritas</th>
                  <th scope="col">Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td className="enlace-fuerte">{c.titulo}</td>
                    <td>
                      <EtiquetaEvento tipo={c.tipo} />
                    </td>
                    <td>
                      {fecha(c.fecha)}, {hora12(c.hora)}
                    </td>
                    <td>{c.lugar}</td>
                    <td className="cifra">
                      {c.inscritas}/{c.cupo}
                    </td>
                    <td>
                      <Link to={`/capacitacion/calendario/${c.id}/lista`}>Pasar lista</Link>
                    </td>
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

/** K-03 · Nuevo curso */
export function NuevoCursoPage() {
  const crear = useCrearCurso()
  const navegar = useNavigate()
  const [f, setF] = useState({ tipo: 'curso' as TipoEvento, titulo: '', descripcion: '', fecha: '', hora: '', lugar: '', cupo: '20' })
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    crear.mutate({ ...f, cupo: Number(f.cupo) }, { onSuccess: () => navegar('/capacitacion/cursos') })
  }
  const campo = (k: keyof typeof f, texto: string, tipo = 'text') => (
    <div className="campo">
      <label htmlFor={`c-${k}`}>{texto}</label>
      <input id={`c-${k}`} type={tipo} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required min={tipo === 'number' ? 1 : undefined} />
    </div>
  )
  return (
    <section className="pila angosta">
      <Encabezado antetitulo="Capacitación" titulo="Nuevo curso" />
      <form className="tarjeta pila" onSubmit={enviar}>
        <Segmentos opciones={TIPOS_EVENTO.map((t) => ({ valor: t.valor, texto: t.texto }))} valor={f.tipo} onCambio={(tipo) => setF({ ...f, tipo })} etiqueta="Tipo de evento" />
        {campo('titulo', 'Título')}
        <div className="campo">
          <label htmlFor="c-desc">Descripción</label>
          <textarea id="c-desc" className="area" rows={3} maxLength={600} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} required />
          <span className="campo-ayuda">Texto corto y en tú: «Aprende a…», «Conoce…».</span>
        </div>
        <div className="rejilla-2">
          {campo('fecha', 'Fecha', 'date')}
          {campo('hora', 'Hora', 'time')}
        </div>
        <div className="rejilla-2">
          {campo('lugar', 'Lugar o «En línea»')}
          {campo('cupo', 'Cupo', 'number')}
        </div>
        {crear.isError && (
          <p className="texto-error" role="alert">
            No se pudo publicar.
          </p>
        )}
        <div className="fila-botones">
          <Link to="/capacitacion/cursos" className="boton-secundario">
            Cancelar
          </Link>
          <button className="boton" disabled={crear.isPending}>
            Publicar en el foro
          </button>
        </div>
      </form>
    </section>
  )
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** K-04 · Calendario mensual */
export function CalendarioPage() {
  const q = useCursos()
  const [mes, setMes] = useState(() => new Date(2026, 11, 1))
  const celdas = useMemo(() => {
    const primero = (mes.getDay() + 6) % 7
    const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    return [...Array<null>(primero).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)]
  }, [mes])
  const clave = (d: number) => `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const titulo = mes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  const mover = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1))

  return (
    <section className="pila">
      <Encabezado antetitulo="Capacitación" titulo="Calendario">
        Toca un evento para pasar lista.
      </Encabezado>
      <div className="tarjeta pila-corta">
        <div className="fila-accion">
          <button type="button" className="boton-icono" onClick={() => mover(-1)} aria-label="Mes anterior">
            <ChevronLeft aria-hidden="true" />
          </button>
          <h2 className="subtitulo calendario-titulo">{titulo}</h2>
          <button type="button" className="boton-icono" onClick={() => mover(1)} aria-label="Mes siguiente">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        {q.isPending ? (
          <Cargando />
        ) : (
          <div className="calendario" role="grid" aria-label={titulo}>
            {DIAS.map((d) => (
              <div key={d} className="calendario-dia-semana" role="columnheader">
                {d}
              </div>
            ))}
            {celdas.map((d, i) => (
              <div key={i} className={`calendario-celda ${d ? '' : 'vacia'}`} role="gridcell">
                {d && <span className="calendario-numero">{d}</span>}
                {d &&
                  q.data
                    ?.filter((c) => c.fecha === clave(d))
                    .map((c) => (
                      <Link key={c.id} to={`/capacitacion/calendario/${c.id}/lista`} className={`calendario-evento ${TIPOS_EVENTO.find((t) => t.valor === c.tipo)!.clase}`}>
                        {hora12(c.hora)} {c.titulo}
                      </Link>
                    ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** K-05 · Pasar lista */
export function PasarListaPage() {
  const { cursoId = '' } = useParams()
  const curso = useCurso(cursoId)
  const q = useAsistencia(cursoId)
  const guardar = useGuardarAsistencia(cursoId)
  const [cambios, setCambios] = useState<Record<string, boolean>>({})
  const lista: Asistente[] = (q.data ?? []).map((a) => ({ ...a, presente: cambios[a.id] ?? a.presente }))
  const presentes = lista.filter((a) => a.presente).length

  return (
    <section className="pila angosta">
      <Link to="/capacitacion/calendario" className="enlace-volver">
        ← Calendario
      </Link>
      <Encabezado antetitulo="Pasar lista" titulo={curso.data?.titulo ?? 'Evento'}>
        {curso.data && `${fecha(curso.data.fecha)}, ${hora12(curso.data.hora)} · ${curso.data.lugar}`}
      </Encabezado>
      <Consulta q={q} vacio="Aún no hay inscritas en este evento.">
        {() => (
          <form
            className="tarjeta pila-corta"
            onSubmit={(e) => {
              e.preventDefault()
              guardar.mutate(lista, { onSuccess: () => setCambios({}) })
            }}
          >
            <p className="texto-suave">
              <span className="cifra">{presentes}</span> de <span className="cifra">{lista.length}</span> presentes. Solo se muestran alias.
            </p>
            <ul className="lista-simple">
              {lista.map((a) => (
                <li key={a.id}>
                  <label className="opcion fila-accion">
                    <span>{a.alias}</span>
                    <input type="checkbox" checked={a.presente} onChange={(e) => setCambios({ ...cambios, [a.id]: e.target.checked })} aria-label={`${a.alias} presente`} />
                  </label>
                </li>
              ))}
            </ul>
            {guardar.isSuccess && Object.keys(cambios).length === 0 && (
              <p className="estado estado-exito" role="status">
                Asistencia guardada.
              </p>
            )}
            <button className="boton" disabled={guardar.isPending}>
              Guardar asistencia
            </button>
          </form>
        )}
      </Consulta>
    </section>
  )
}

/** K-06 · Planeación de visitas, con el mapa agregado de Ahome como apoyo (supuesto 4). */
export function VisitasPage() {
  const q = useVisitas()
  const crear = useCrearVisita()
  const [f, setF] = useState({ sector: '', fecha: '', tema: '' })
  return (
    <section className="pila">
      <Encabezado antetitulo="Capacitación" titulo="Planeación de visitas">
        Elige sectores con base en el mapa agregado. Nunca se muestran casos individuales.
      </Encabezado>
      <div className="rejilla-visitas">
        <div className="tarjeta pila-corta">
          <h2 className="subtitulo">Mapa de Ahome</h2>
          <Suspense fallback={<Cargando texto="Cargando mapa…" />}>
            {/* Solo el espacio del mapa: los niveles llegarán de GET /analytics/heatmap. */}
            <MapaCalorAhome vista="municipio" />
          </Suspense>
          <p className="estado estado-aviso texto-chico">Todavía no hay datos para colorear el mapa.</p>
        </div>
        <div className="pila">
          <form
            className="tarjeta pila-corta"
            onSubmit={(e) => {
              e.preventDefault()
              crear.mutate(f, { onSuccess: () => setF({ sector: '', fecha: '', tema: '' }) })
            }}
          >
            <h2 className="subtitulo">Nueva visita</h2>
            <div className="campo">
              <label htmlFor="v-sector">Sector</label>
              <input id="v-sector" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} placeholder="Sector 12" required />
            </div>
            <div className="campo">
              <label htmlFor="v-fecha">Fecha</label>
              <input id="v-fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} required />
            </div>
            <div className="campo">
              <label htmlFor="v-tema">Tema</label>
              <input id="v-tema" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} required />
            </div>
            <button className="boton" disabled={crear.isPending}>
              Agregar visita
            </button>
          </form>
          <Consulta q={q} vacio="No hay visitas planeadas.">
            {(lista) => (
              <ul className="lista-simple pila-corta">
                {lista.map((v) => (
                  <li key={v.id} className="tarjeta fila-accion">
                    <div>
                      <strong>{v.sector}</strong> · {fecha(v.fecha)}
                      <p className="texto-suave">{v.tema}</p>
                    </div>
                    <span className={`estado-chip estado-chip-${v.estado}`}>{v.estado === 'planeada' ? 'Planeada' : 'Realizada'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Consulta>
        </div>
      </div>
    </section>
  )
}

/** K-07 · Bolsa de trabajo (Capacitación la mantiene al día). */
export function BolsaPage() {
  const q = useVacantes()
  return (
    <section className="pila">
      <Encabezado
        antetitulo="Capacitación"
        titulo="Bolsa de trabajo"
        acciones={
          <Link to="/capacitacion/bolsa/nueva" className="boton">
            <Plus size={18} aria-hidden="true" /> Nueva vacante
          </Link>
        }
      >
        Las empresas no entran a SAI: la Secretaría publica y hace de puente en las postulaciones.
      </Encabezado>
      <Consulta q={q} vacio="No hay vacantes publicadas.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Puesto</th>
                  <th scope="col">Empresa</th>
                  <th scope="col">Sector</th>
                  <th scope="col">Horario</th>
                  <th scope="col">Postulaciones</th>
                  <th scope="col">Actualizada</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id}>
                    <td className="enlace-fuerte">{v.puesto}</td>
                    <td>{v.empresa}</td>
                    <td>{v.sector}</td>
                    <td>{v.horario}</td>
                    <td className="cifra">{v.postulaciones ?? 0}</td>
                    <td>{fecha(v.actualizada)}</td>
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

/** K-08 · Nueva vacante */
export function NuevaVacantePage() {
  const crear = useCrearVacante()
  const navegar = useNavigate()
  const [f, setF] = useState({ puesto: '', empresa: '', sector: OPCIONES_VACANTE.sector[0]!, horario: OPCIONES_VACANTE.horario[0]!, tipoEmpleo: OPCIONES_VACANTE.tipoEmpleo[0]!, ubicacion: OPCIONES_VACANTE.ubicacion[0]!, descripcion: '', requisitos: '' })
  const sel = (k: keyof typeof OPCIONES_VACANTE, texto: string) => (
    <div className="campo">
      <label htmlFor={`v-${k}`}>{texto}</label>
      <select id={`v-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        {OPCIONES_VACANTE[k].map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )
  return (
    <section className="pila angosta">
      <Encabezado antetitulo="Capacitación" titulo="Nueva vacante" />
      <form
        className="tarjeta pila"
        onSubmit={(e) => {
          e.preventDefault()
          crear.mutate({ ...f, requisitos: f.requisitos.split('\n').map((r) => r.trim()).filter(Boolean) }, { onSuccess: () => navegar('/capacitacion/bolsa') })
        }}
      >
        <div className="rejilla-2">
          <div className="campo">
            <label htmlFor="v-puesto">Puesto</label>
            <input id="v-puesto" value={f.puesto} onChange={(e) => setF({ ...f, puesto: e.target.value })} required />
          </div>
          <div className="campo">
            <label htmlFor="v-empresa">Empresa aliada</label>
            <input id="v-empresa" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} required />
          </div>
        </div>
        <div className="rejilla-2">
          {sel('sector', 'Sector')}
          {sel('horario', 'Horario')}
          {sel('tipoEmpleo', 'Tipo de empleo')}
          {sel('ubicacion', 'Ubicación')}
        </div>
        <div className="campo">
          <label htmlFor="v-desc">Descripción</label>
          <textarea id="v-desc" className="area" rows={3} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} required />
        </div>
        <div className="campo">
          <label htmlFor="v-req">Requisitos</label>
          <textarea id="v-req" className="area" rows={3} value={f.requisitos} onChange={(e) => setF({ ...f, requisitos: e.target.value })} />
          <span className="campo-ayuda">Uno por renglón.</span>
        </div>
        <div className="fila-botones">
          <Link to="/capacitacion/bolsa" className="boton-secundario">
            Cancelar
          </Link>
          <button className="boton" disabled={crear.isPending}>
            Publicar vacante
          </button>
        </div>
      </form>
    </section>
  )
}
