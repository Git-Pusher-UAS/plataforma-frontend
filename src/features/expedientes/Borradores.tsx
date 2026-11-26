import { Link } from 'react-router'
import { ArrowRightLeft, FolderOpen, UserPlus, WifiOff } from 'lucide-react'
import { useBorradores, useDescartarBorrador, useSincronizar, useExpedientes, type Borrador } from '@/features/expedientes/api'
import { textoArea, useCanalizaciones } from '@/features/canalizacion/api'
import { areaDeRol, type Area } from '@/features/expedientes/api'
import { useSesion } from '@/features/identidad/sesion'
import { Consulta } from '@/shared/ui/Estados'
import { Encabezado } from '@/shared/ui/Encabezado'
import { fechaHora } from '@/shared/lib/formato'

const TEXTO_ESTADO: Record<Borrador['estado'], string> = {
  pendiente: 'Pendiente de enviar',
  enviando: 'Enviando',
  bloqueada: 'Bloqueada: ya no tienes acceso a este expediente',
  conflicto: 'Conflicto: revisar',
  reintentable: 'Se reintentará',
}

/** P-41 · Pendientes sin conexión: borradores de notas propias, cifrados en el dispositivo. */
export function BorradoresPage() {
  const q = useBorradores()
  const sincronizar = useSincronizar()
  const descartar = useDescartarBorrador()
  return (
    <section className="pila">
      <Encabezado
        antetitulo="Sin conexión"
        titulo="Pendientes"
        acciones={
          <button type="button" className="boton" disabled={sincronizar.isPending || !q.data?.length} onClick={() => sincronizar.mutate(q.data!.map((b) => b.id))}>
            Enviar ahora
          </button>
        }
      >
        Solo se guardan borradores de tus notas, cifrados con tu PIN local. Se envían al volver la conexión y solo se quitan cuando el servidor los confirma.
      </Encabezado>
      <Consulta q={q} vacio="No tienes borradores pendientes.">
        {(lista) => (
          <ul className="lista-simple pila-corta">
            {lista.map((b) => (
              <li key={b.id} className="tarjeta fila-accion">
                <div>
                  <h3>{b.expediente}</h3>
                  <p className="texto-suave">
                    {textoArea(b.area)} · hora declarada {fechaHora(b.horaDeclarada)}
                  </p>
                  <p className={b.estado === 'bloqueada' || b.estado === 'conflicto' ? 'estado estado-aviso texto-chico' : 'texto-chico'}>{TEXTO_ESTADO[b.estado]}</p>
                </div>
                <div className="fila-botones">
                  {b.estado !== 'bloqueada' && (
                    <button type="button" className="boton-secundario boton-chico" onClick={() => sincronizar.mutate([b.id])}>
                      Reintentar
                    </button>
                  )}
                  <button type="button" className="boton-secundario boton-chico" onClick={() => descartar.mutate(b.id)}>
                    Descartar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      <p className="texto-suave texto-chico">Al cerrar sesión se eliminan los borradores y las claves locales.</p>
    </section>
  )
}

/** P-05 · Inicio del personal de atención (Trabajo social, Psicología, Jurídico). */
export function InicioAtencionPage() {
  const { personal } = useSesion()
  const area = areaDeRol(personal!.rol) as Area
  const expedientes = useExpedientes(personal!.rol, {})
  const entrantes = useCanalizaciones(area, 'incoming', 'pendiente')
  const borradores = useBorradores()
  return (
    <section className="pila">
      <Encabezado antetitulo={textoArea(area)} titulo={`Hola, ${personal!.nombre.split(' ')[0]}`}>
        Esto es lo que tienes hoy.
      </Encabezado>
      <div className="rejilla-indicadores">
        <Link to="/expedientes" className="tarjeta indicador">
          <FolderOpen aria-hidden="true" />
          <span className="cifra indicador-valor">{expedientes.data?.length ?? '…'}</span>
          <span>Expedientes asignados</span>
        </Link>
        <Link to="/canalizaciones" className="tarjeta indicador">
          <ArrowRightLeft aria-hidden="true" />
          <span className="cifra indicador-valor">{entrantes.data?.length ?? '…'}</span>
          <span>Canalizaciones por revisar</span>
        </Link>
        <Link to="/pendientes" className="tarjeta indicador">
          <WifiOff aria-hidden="true" />
          <span className="cifra indicador-valor">{borradores.data?.length ?? '…'}</span>
          <span>Borradores sin enviar</span>
        </Link>
      </div>
      {personal!.rol === 'trabajo-social' && (
        <Link to="/expedientes/nuevo" className="tarjeta tarjeta-lila fila-accion atajo">
          <span>
            <strong>Registrar a una persona</strong>
            <br />
            <span className="texto-suave">Primero se comprueba la CURP para no duplicar.</span>
          </span>
          <UserPlus aria-hidden="true" />
        </Link>
      )}
      <div className="tarjeta pila-corta">
        <h2 className="subtitulo">Actividad reciente</h2>
        <Consulta q={expedientes} vacio="Sin actividad reciente.">
          {(lista) => (
            <ul className="lista-simple">
              {lista.slice(0, 4).map((e) => (
                <li key={e.id} className="fila-accion">
                  <Link to={`/expedientes/${e.id}`}>{e.alias}</Link>
                  <span className="texto-suave texto-chico">{fechaHora(e.actualizado)}</span>
                </li>
              ))}
            </ul>
          )}
        </Consulta>
      </div>
    </section>
  )
}
