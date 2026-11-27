import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { areaDeDepartamento, useCatalogos } from '@/api/catalogos'
import {
  INSTITUCIONES_EXTERNAS,
  textoArea,
  useCanalizaciones,
  useCanalizar,
  useTransicion,
  type Accion,
  type Canalizacion,
  type Direccion,
  type EstadoCanalizacion,
} from '@/features/canalizacion/api'
import { areaDeRol, type Area } from '@/features/expedientes/api'
import { DialogoMotivo, useExpedienteCtx } from '@/features/expedientes/Expediente'
import { useSesion } from '@/features/identidad/sesion'
import { esModoSimulado } from '@/shared/lib/servicio'
import { Consulta } from '@/shared/ui/Estados'
import { Encabezado } from '@/shared/ui/Encabezado'
import { Segmentos } from '@/shared/ui/Pestanas'
import { fecha } from '@/shared/lib/formato'

const ESTADOS: { valor: 'todas' | EstadoCanalizacion; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'aceptada', texto: 'Aceptadas' },
  { valor: 'completada', texto: 'Completadas' },
]

/** P-30 · Canalizaciones entrantes y salientes. */
export function CanalizacionesPage() {
  const { personal } = useSesion()
  const area = areaDeRol(personal!.rol) as Area
  const [dir, setDir] = useState<Direccion>('incoming')
  const [estado, setEstado] = useState<'todas' | EstadoCanalizacion>('todas')
  const q = useCanalizaciones(area, dir, estado === 'todas' ? undefined : estado)
  const transicion = useTransicion()
  const [conMotivo, setConMotivo] = useState<{ c: Canalizacion; accion: Accion } | null>(null)

  const ejecutar = (c: Canalizacion, accion: Accion, motivo?: string) => transicion.mutate({ id: c.id, accion, versionTag: c.versionTag, motivo })

  return (
    <section className="pila">
      <Encabezado antetitulo={textoArea(area)} titulo="Canalizaciones">
        Cada canalización muestra solo un resumen mínimo, nunca notas de otras áreas.
      </Encabezado>
      <div className="fila-filtros">
        <Segmentos
          etiqueta="Dirección"
          opciones={[
            { valor: 'incoming', texto: 'Entrantes' },
            { valor: 'outgoing', texto: 'Salientes' },
          ]}
          valor={dir}
          onCambio={setDir}
        />
        <Segmentos etiqueta="Estado" opciones={ESTADOS} valor={estado} onCambio={setEstado} />
      </div>
      <Consulta q={q} vacio="No hay canalizaciones aquí.">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((c) => (
              <li key={c.id} className="tarjeta canalizacion">
                <div>
                  <p className="fila-chips">
                    <span className={`estado-chip estado-chip-${c.estado}`}>{c.estado}</span>
                    <span className="chip">{c.tipo === 'externa' ? 'Externa' : 'Interna'}</span>
                    <span className="texto-suave texto-chico">{fecha(c.fecha)}</span>
                  </p>
                  <h3>{c.alias}</h3>
                  <p>
                    {c.origen} → {c.destino}
                  </p>
                  <p className="texto-suave">{c.resumen}</p>
                </div>
                <div className="fila-botones">
                  {dir === 'incoming' && c.estado === 'pendiente' && (
                    <>
                      <button type="button" className="boton boton-chico" onClick={() => ejecutar(c, 'accept')} disabled={transicion.isPending}>
                        Aceptar
                      </button>
                      <button type="button" className="boton-secundario boton-chico" onClick={() => setConMotivo({ c, accion: 'reject' })}>
                        Rechazar
                      </button>
                    </>
                  )}
                  {dir === 'incoming' && c.estado === 'aceptada' && (
                    <>
                      <Link to={`/expedientes/${c.expedienteId}`} className="boton-secundario boton-chico">
                        Abrir expediente
                      </Link>
                      <button type="button" className="boton boton-chico" onClick={() => ejecutar(c, 'complete')} disabled={transicion.isPending}>
                        Completar
                      </button>
                    </>
                  )}
                  {dir === 'outgoing' && c.estado === 'pendiente' && (
                    <button type="button" className="boton-secundario boton-chico" onClick={() => setConMotivo({ c, accion: 'cancel' })}>
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      <DialogoMotivo
        abierto={conMotivo !== null}
        titulo={conMotivo?.accion === 'reject' ? 'Rechazar canalización' : 'Cancelar canalización'}
        boton={conMotivo?.accion === 'reject' ? 'Rechazar' : 'Cancelar canalización'}
        onCerrar={() => setConMotivo(null)}
        onConfirmar={(m) => {
          if (conMotivo) ejecutar(conMotivo.c, conMotivo.accion, m)
          setConMotivo(null)
        }}
      />
    </section>
  )
}

/** P-30b · Canalizar: interna (a otra área) o externa (institución, seguimiento manual). */
export function CanalizarPage() {
  const { exp, area } = useExpedienteCtx()
  const catalogos = useCatalogos()
  const canalizar = useCanalizar(exp.id, exp.alias, area)
  const navegar = useNavigate()
  const [tipo, setTipo] = useState<'interna' | 'externa'>('interna')
  const [destinoId, setDestinoId] = useState('')
  const [resumen, setResumen] = useState('')

  const opcionesInternas = (catalogos.data?.departamentos ?? [])
    .filter((d) => {
      const depArea = areaDeDepartamento(d)
      return depArea !== null && depArea !== area
    })
    .map((d) => ({ id: d.id, nombre: d.nombre }))

  const simulado = esModoSimulado()
  const opcionesExternas = simulado ? INSTITUCIONES_EXTERNAS.map((nombre) => ({ id: nombre, nombre })) : []
  const opciones = tipo === 'interna' ? opcionesInternas : opcionesExternas
  const elegida = opciones.find((o) => o.id === destinoId)

  return (
    <form
      className="tarjeta pila angosta"
      onSubmit={(e) => {
        e.preventDefault()
        if (!elegida) return
        canalizar.mutate(
          { tipo, destino: elegida.nombre, destinoId: elegida.id, resumen },
          { onSuccess: () => navegar(`/expedientes/${exp.id}/canalizaciones`) },
        )
      }}
    >
      <h2 className="subtitulo">Canalizar</h2>
      <Segmentos
        etiqueta="Tipo de canalización"
        opciones={[
          { valor: 'interna', texto: 'Interna' },
          { valor: 'externa', texto: 'Externa' },
        ]}
        valor={tipo}
        onCambio={(t) => {
          setTipo(t)
          setDestinoId('')
        }}
      />
      <fieldset className="grupo">
        <legend>{tipo === 'interna' ? 'Área destino' : 'Institución'}</legend>
        {opciones.map((o) => (
          <label key={o.id} className="opcion">
            <input type="radio" name="destino" checked={destinoId === o.id} onChange={() => setDestinoId(o.id)} required /> {o.nombre}
          </label>
        ))}
        {tipo === 'externa' && !simulado && (
          // TODO(backend): enable external institution selection once GET /catalogs returns instituciones UUIDs
          <p className="estado estado-aviso texto-chico">
            El catálogo de instituciones externas aún no está disponible en el servidor.
          </p>
        )}
      </fieldset>
      {tipo === 'externa' && <p className="estado estado-aviso texto-chico">La institución no usa SAI: el seguimiento se registra a mano en este expediente.</p>}
      <div className="campo">
        <label htmlFor="resumen">Resumen para quien recibe</label>
        <textarea id="resumen" className="area" rows={4} maxLength={2000} value={resumen} onChange={(e) => setResumen(e.target.value)} required />
        <span className="campo-ayuda">{resumen.length}/2000 · Solo lo necesario. No incluyas notas de tu área.</span>
      </div>
      {canalizar.isError && (
        <p className="texto-error" role="alert">
          No se pudo canalizar. Revisa que no exista otra canalización activa igual.
        </p>
      )}
      <div className="fila-botones">
        <Link to={`/expedientes/${exp.id}`} className="boton-secundario">
          Cancelar
        </Link>
        <button className="boton" disabled={canalizar.isPending || !elegida}>
          Enviar canalización
        </button>
      </div>
    </form>
  )
}
