import { useState } from 'react'
import { HandHeart } from 'lucide-react'
import { BotonMantener } from '@/features/ayuda/BotonMantener'
import { useRegistrarLlamada } from '@/features/ayuda/api'
import { ListaContactos } from '@/features/ayuda/Directorio'
import { Dialogo } from '@/shared/ui/Dialogo'

/** P-51 · Necesito ayuda (personal). Mantener 2 s o confirmar; abre el marcador, no promete la llamada. */
export function NecesitoAyudaPersonal() {
  const [abierto, setAbierto] = useState(false)
  const [activa, setActiva] = useState(false)
  const registrar = useRegistrarLlamada()
  const cerrar = () => {
    setAbierto(false)
    setActiva(false)
  }
  return (
    <>
      <button type="button" className="barra-ayuda" onClick={() => setAbierto(true)}>
        <HandHeart size={18} aria-hidden="true" /> <span className="barra-ayuda-texto">Necesito ayuda</span>
      </button>
      <Dialogo abierto={abierto} titulo="Necesito ayuda" onCerrar={cerrar}>
        {!activa ? (
          <div className="pila">
            <p className="texto-suave">Mantén presionado 2 segundos para ver los contactos de ayuda.</p>
            <BotonMantener texto="Mantén presionado" onActivar={() => setActiva(true)} className="boton-ayuda boton-mantener boton-ancho" />
            <button type="button" className="boton-secundario" onClick={() => setActiva(true)}>
              Mostrar contactos sin mantener
            </button>
          </div>
        ) : (
          <div className="pila">
            <p className="texto-suave">Al tocar «Llamar» se abre el marcador del teléfono. La aplicación no confirma la llamada.</p>
            {/* El registro es opcional y posterior; si falla no se guarda en el dispositivo ni se avisa como error. */}
            <ListaContactos soloPrioritarios={false} onLlamar={(c) => registrar.mutate({ contactId: c.id, operationId: crypto.randomUUID() })} />
          </div>
        )}
      </Dialogo>
    </>
  )
}
