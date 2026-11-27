import { useNavigate } from 'react-router'
import { useActualizarPerfil, useCerrarSesionUsuaria, usePerfil } from '@/features/identidad/api'
import { useSesion } from '@/features/identidad/sesion'
import { Consulta } from '@/shared/ui/Estados'

/** U-09 · Mi perfil: contactos de confianza, modo discreto y avisos silenciados. */
export function PerfilPage() {
  const q = usePerfil()
  const actualizar = useActualizarPerfil()
  const salir = useCerrarSesionUsuaria()
  const { cerrar } = useSesion()
  const navegar = useNavigate()
  return (
    <section className="pila">
      <h1>Mi perfil</h1>
      <Consulta q={q}>
        {(p) => (
          <>
            <div className="tarjeta">
              <p className="etiqueta-peque">Mis datos</p>
              <p className="dato-grande">{p.alias}</p>
              <p className="texto-suave">Teléfono {p.telefonoMascara}</p>
            </div>

            <div className="tarjeta pila-corta">
              <p className="etiqueta-peque">Contactos de confianza</p>
              <p className="texto-suave">Solo a ellos se les avisa si tú lo pides desde la ayuda.</p>
              <ul className="lista-simple">
                {p.contactosConfianza.map((c) => (
                  <li key={c.id}>
                    <strong>{c.nombre}</strong> <span className="texto-suave">{c.telefonoMascara}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tarjeta pila-corta">
              <p className="etiqueta-peque">Privacidad</p>
              <label className="interruptor">
                <input type="checkbox" checked={p.silenciarAvisos} onChange={(e) => actualizar.mutate({ silenciarAvisos: e.target.checked })} />
                <span>Silenciar avisos en mi teléfono</span>
              </label>
              <label className="interruptor">
                <input type="checkbox" checked={p.compartirUbicacion} onChange={(e) => actualizar.mutate({ compartirUbicacion: e.target.checked })} />
                <span>Compartir mi ubicación cuando pida ayuda</span>
              </label>
              <p className="texto-suave">
                En tu teléfono la aplicación aparece como «{p.nombreDiscreto}». Los avisos dicen solo «Tienes un pendiente».
              </p>
            </div>
          </>
        )}
      </Consulta>
      <button
        type="button"
        className="boton-secundario"
        disabled={salir.isPending}
        onClick={() =>
          salir.mutate(undefined, {
            onSettled: () => {
              cerrar()
              navegar('/u', { replace: true })
            },
          })
        }
      >
        Cerrar sesión
      </button>
    </section>
  )
}
