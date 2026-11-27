import { lazy, Suspense, useState } from 'react'
import { Clock, MapPin, Phone } from 'lucide-react'
import { LINEA_VIOLETA, PUNTOS_ATENCION } from '@/features/ayuda/puntosAtencion'
import type { Vista } from '@/features/tablero/MapaCalorAhome'

// Carga diferida: los polígonos del mapa pesan ~230 KB y en el celular no deben retrasar el inicio.
const MapaCalorAhome = lazy(() => import('@/features/tablero/MapaCalorAhome').then((m) => ({ default: m.MapaCalorAhome })))

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: 'puntos', texto: 'Cerca' },
  { valor: 'los-mochis', texto: 'Los Mochis' },
  { valor: 'municipio', texto: 'Municipio' },
]

/** Tarjeta del inicio de la usuaria: mapa de Ahome con los espacios de atención presencial y sus datos. */
export function MapaAtencion() {
  const [vista, setVista] = useState<Vista>('puntos')
  const [activo, setActivo] = useState<string>()

  return (
    <article className="tarjeta mosaico-mapa pila-corta" aria-labelledby="mapa-atencion-titulo">
      <div className="fila-accion">
        <h2 id="mapa-atencion-titulo" className="subtitulo">Espacios de atención en Ahome</h2>
        <div className="mapa-vistas" role="group" aria-label="Acercar el mapa">
          {VISTAS.map(({ valor, texto }) => (
            <button key={valor} type="button" aria-pressed={vista === valor} onClick={() => setVista(valor)}>
              {texto}
            </button>
          ))}
        </div>
      </div>

      <div className="mapa-atencion-lienzo">
        <Suspense fallback={<p className="texto-suave">Cargando mapa…</p>}>
          <MapaCalorAhome vista={vista} puntos={PUNTOS_ATENCION} activo={activo} onPunto={setActivo} />
        </Suspense>
      </div>

      <ol className="puntos-atencion" aria-label="Espacios de atención presencial">
        {PUNTOS_ATENCION.map((p, i) => (
          <li key={p.id} className={activo === p.id ? 'punto-atencion activo' : 'punto-atencion'} onPointerEnter={() => setActivo(p.id)}>
            <span className="punto-numero" aria-hidden="true">{i + 1}</span>
            <div className="pila-corta">
              <strong>{p.nombre}</strong>
              <span className="punto-dato">
                <MapPin size={16} aria-hidden="true" /> {p.direccion}
              </span>
              {p.horario && (
                <span className="punto-dato">
                  <Clock size={16} aria-hidden="true" /> {p.horario}
                </span>
              )}
              {p.servicios && <span className="texto-suave">{p.servicios}</span>}
              <a className="punto-dato punto-telefono" href={`tel:${p.telefono.numero}`}>
                <Phone size={16} aria-hidden="true" /> {p.telefono.texto}
              </a>
              {p.telefono.nota && <span className="texto-suave texto-chico">{p.telefono.nota}</span>}
            </div>
          </li>
        ))}
      </ol>

      <a className="boton boton-ancho linea-violeta" href={`tel:${LINEA_VIOLETA.numero}`}>
        <Phone size={22} aria-hidden="true" />
        <span className="linea-violeta-texto">
          <span>Línea Violeta · 24 horas</span>
          <strong>{LINEA_VIOLETA.texto}</strong>
        </span>
      </a>
      <p className="texto-suave texto-chico">Si estás en peligro inmediato, llama al 911.</p>
    </article>
  )
}
