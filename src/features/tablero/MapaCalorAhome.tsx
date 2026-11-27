import ahome from '@/features/tablero/ahome.geo.json'

// Nivel de un sector (AGEB) según el futuro GET /analytics/heatmap. 'suprimido' = menos de 5 casos.
export type NivelSector = 1 | 2 | 3 | 4 | 5 | 'suprimido'
export type Vista = 'municipio' | 'los-mochis' | 'puntos'

type Anillo = number[][]
type Sector = {
  properties: { id: string; tipo: 'municipio' | 'rural' | 'urbana' }
  geometry: { type: 'Polygon'; coordinates: Anillo[] } | { type: 'MultiPolygon'; coordinates: Anillo[][] }
}

const sectores = ahome.features as Sector[]
const anillos = (s: Sector) => (s.geometry.type === 'Polygon' ? s.geometry.coordinates : s.geometry.coordinates.flat())

// Proyección equirectangular corregida por latitud: suficiente para la escala de un municipio.
const todos = sectores.flatMap(anillos).flat()
const lons = todos.map((p) => p[0]!)
const lats = todos.map((p) => p[1]!)
const [minLon, maxLat, minLat] = [Math.min(...lons), Math.max(...lats), Math.min(...lats)]
const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
const escala = 1000 / ((Math.max(...lons) - minLon) * kx)
const proyectar = ([lon, lat]: number[]) => [(lon! - minLon) * kx * escala, (maxLat - lat!) * escala] as const

function caja(s: Sector[]): string {
  const ps = s.flatMap(anillos).flat().map(proyectar)
  const xs = ps.map((p) => p[0])
  const ys = ps.map((p) => p[1])
  const [x, y] = [Math.min(...xs), Math.min(...ys)]
  const margen = 4
  return [x - margen, y - margen, Math.max(...xs) - x + 2 * margen, Math.max(...ys) - y + 2 * margen].map(Math.round).join(' ')
}

const trazo = (s: Sector) => anillos(s).map((a) => 'M' + a.map((p) => proyectar(p).map((n) => n.toFixed(1)).join(',')).join('L') + 'Z').join('')

const municipio = sectores.find((s) => s.properties.tipo === 'municipio')!
// Las rurales primero para que las urbanas, más pequeñas, queden encima.
const agebs = (['rural', 'urbana'] as const).flatMap((tipo) => sectores.filter((s) => s.properties.tipo === tipo))
const dibujo = agebs.map((s) => ({ ...s.properties, d: trazo(s) }))

// Localidad 0001 de Ahome = Los Mochis.
const CAJAS: Record<Exclude<Vista, 'puntos'>, string> = {
  municipio: caja([municipio]),
  'los-mochis': caja(agebs.filter((s) => s.properties.id.startsWith('2500100010'))),
}

function cajaPuntos(puntos: PuntoMapa[]): string {
  if (!puntos.length) return CAJAS['los-mochis']
  const ps = puntos.map((p) => proyectar([p.lon, p.lat]))
  const xs = ps.map((p) => p[0])
  const ys = ps.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  // Margen del 35 % (mínimo 6 unidades) y proporción 4:3 para que el mapa no quede como una franja.
  const m = Math.max(6, (x1 - x0) * 0.35, (y1 - y0) * 0.35)
  let [w, h] = [x1 - x0 + 2 * m, y1 - y0 + 2 * m]
  if (w / h < 4 / 3) w = (h * 4) / 3
  else h = (w * 3) / 4
  return [(x0 + x1 - w) / 2, (y0 + y1 - h) / 2, w, h].map((n) => n.toFixed(1)).join(' ')
}

/** Proyecta los puntos y separa los que se enciman para que cada número se lea (solo es un ajuste visual). */
function separar(puntos: PuntoMapa[], r: number) {
  const ps = puntos.map((p, i) => {
    const [x, y] = proyectar([p.lon, p.lat])
    return { ...p, numero: i + 1, x, y }
  })
  const min = r * 2.3
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    let movido = false
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const [a, b] = [ps[i]!, ps[j]!]
        let [dx, dy] = [b.x - a.x, b.y - a.y]
        let d = Math.hypot(dx, dy)
        if (d >= min) continue
        if (d === 0) [dx, dy, d] = [1, 0, 1]
        const empuje = (min - d) / 2
        a.x -= (dx / d) * empuje
        a.y -= (dy / d) * empuje
        b.x += (dx / d) * empuje
        b.y += (dy / d) * empuje
        movido = true
      }
    }
    if (!movido) break
  }
  return ps
}

function claseNivel(nivel: NivelSector | undefined): string {
  if (nivel === undefined) return 'sin-datos'
  return nivel === 'suprimido' ? 'suprimido' : `calor-${nivel}`
}

/** Lugar marcado con un número sobre el mapa (p. ej. puntos de atención). Nunca domicilios de personas. */
export type PuntoMapa = { id: string; nombre: string; lat: number; lon: number }

export function MapaCalorAhome({
  niveles = {},
  vista = 'municipio',
  puntos = [],
  activo,
  onPunto,
}: {
  niveles?: Record<string, NivelSector>
  vista?: Vista
  puntos?: PuntoMapa[]
  activo?: string
  onPunto?: (id: string) => void
}) {
  // Vista «puntos»: encuadra los lugares marcados con un margen alrededor.
  const viewBox = vista === 'puntos' ? cajaPuntos(puntos) : CAJAS[vista]
  // El rayado del patrón y los marcadores se escalan con el acercamiento para verse igual en todas las vistas.
  const ancho = Number(viewBox.split(' ')[2])
  const raya = ancho / 150
  const r = ancho / (vista === 'puntos' ? 28 : 24)
  return (
    <svg
      className="mapa"
      viewBox={viewBox}
      role="img"
      aria-label={vista === 'municipio' ? 'Mapa del municipio de Ahome por AGEB' : vista === 'puntos' ? 'Mapa de los lugares marcados' : 'Mapa de Mochis por AGEB'}
    >
      <defs>
        <pattern id="mapa-suprimido" width={raya} height={raya} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={raya} height={raya} fill="#fff" />
          <rect width={raya / 2} height={raya} fill="var(--sai-lavanda)" />
        </pattern>
      </defs>
      <path className="mapa-municipio" d={trazo(municipio)} vectorEffect="non-scaling-stroke" />
      {dibujo.map(({ id, tipo, d }) => (
        <path key={id} d={d} data-id={id} vectorEffect="non-scaling-stroke" className={`mapa-sector mapa-${tipo} ${claseNivel(niveles[id])}`}>
          <title>AGEB {id}</title>
        </path>
      ))}
      {separar(puntos, r)
        .sort((a, b) => Number(a.id === activo) - Number(b.id === activo)) // el seleccionado se dibuja encima
        .map(({ id, nombre, numero, x, y }) => (
          <g
            key={id}
            className={activo === id ? 'mapa-punto activo' : 'mapa-punto'}
            data-punto={id}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            onClick={onPunto && (() => onPunto(id))}
          >
            <title>{nombre}</title>
            <circle r={r} />
            <text fontSize={r * 1.2} textAnchor="middle" dominantBaseline="central">
              {numero}
            </text>
          </g>
        ))}
    </svg>
  )
}
