import { useState } from 'react'
import { useMapaCalor } from '@/features/tablero/api'
import { MapaCalorAhome, type Vista } from '@/features/tablero/MapaCalorAhome'

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: 'municipio', texto: 'Municipio' },
  { valor: 'los-mochis', texto: 'Mochis' },
]

const LEYENDA = [
  { clase: 'calor-1', texto: 'Muy bajo' },
  { clase: 'calor-2', texto: 'Bajo' },
  { clase: 'calor-3', texto: 'Medio' },
  { clase: 'calor-4', texto: 'Alto' },
  { clase: 'calor-5', texto: 'Muy alto' },
  { clase: 'calor-suprimido', texto: 'Menos de 5 casos' },
  { clase: 'mapa-sin-datos', texto: 'Sin datos' },
]

export function TableroPage() {
  const [vista, setVista] = useState<Vista>('municipio')
  const mapa = useMapaCalor()
  const niveles = mapa.data ?? {}
  const hayDatos = Object.keys(niveles).length > 0
  return (
    <section>
      <p className="etiqueta-peque">Administración</p>
      <h1>Mapa de Ahome</h1>
      <article className="tarjeta tarjeta-mapa" aria-labelledby="mapa-titulo">
        <div className="mapa-titulo">
          <div>
            <h2 id="mapa-titulo">{vista === 'los-mochis' ? 'Mochis' : 'Mapa de calor de Ahome'}</h2>
            <p className="texto-suave">Casos atendidos por AGEB. Nunca se muestran domicilios ni puntos individuales.</p>
          </div>

          <div className="mapa-vistas" role="group" aria-label="Acercar el mapa">
            {VISTAS.map(({ valor, texto }) => (
              <button key={valor} type="button" aria-pressed={vista === valor} onClick={() => setVista(valor)}>
                {texto}
              </button>
            ))}
          </div>
        </div>

        <div className="mapa-lienzo">
          <MapaCalorAhome vista={vista} niveles={niveles} />
        </div>

        <div className="mapa-lateral">
          {!hayDatos && (
            <p className="estado estado-aviso">Todavía no hay datos para mostrar. El mapa se coloreará cuando el servicio de indicadores esté disponible.</p>
          )}

          <ul className="mapa-leyenda" aria-label="Leyenda">
            {LEYENDA.map(({ clase, texto }) => (
              <li key={clase}>
                <span className={`mapa-muestra ${clase}`} aria-hidden="true" />
                {texto}
              </li>
            ))}
          </ul>

          <p className="mapa-fuente texto-suave">Polígonos: Marco Geoestadístico 2024, INEGI.</p>
        </div>
      </article>
    </section>
  )
}
