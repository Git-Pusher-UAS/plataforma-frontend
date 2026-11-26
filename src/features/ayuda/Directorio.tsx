import { Phone } from 'lucide-react'
import { Link } from 'react-router'
import { useDirectorio, type Contacto } from '@/features/ayuda/api'
import { Consulta } from '@/shared/ui/Estados'

/** Lista de contactos con enlace de llamada. Abre el marcador: no confirma la llamada ni la atención. */
export function ListaContactos({ soloPrioritarios = false, onLlamar }: { soloPrioritarios?: boolean; onLlamar?: (c: Contacto) => void }) {
  const q = useDirectorio()
  return (
    <Consulta q={q} vacio="El directorio no está disponible por ahora. Si estás en peligro inmediato, llama al 911.">
      {(contactos) => (
        <ul className="lista-contactos">
          {contactos
            .filter((c) => !soloPrioritarios || c.prioritario)
            .map((c) => (
              <li key={c.id} className="tarjeta contacto">
                <div>
                  <h3>{c.nombre}</h3>
                  <p className="texto-suave">{c.descripcion}</p>
                  <p className="contacto-horario">{c.horario}</p>
                </div>
                <a className="boton" href={`tel:${c.telefono}`} onClick={() => onLlamar?.(c)}>
                  <Phone size={18} aria-hidden="true" /> Llamar
                </a>
              </li>
            ))}
        </ul>
      )}
    </Consulta>
  )
}

/** U-16 / P-50 · Directorio de ayuda. Público: funciona sin sesión. */
export function DirectorioPage({ volver = '/u' }: { volver?: string }) {
  return (
    <section className="pila">
      <div>
        <p className="etiqueta-peque">Directorio</p>
        <h1>Contactos de ayuda</h1>
        <p className="texto-suave">Al tocar «Llamar» se abre el marcador de tu teléfono. La llamada la haces tú.</p>
      </div>
      <ListaContactos />
      <p className="texto-suave">Si estás en peligro inmediato, llama al 911.</p>
      <Link to={volver} className="boton-secundario">
        Volver
      </Link>
    </section>
  )
}
