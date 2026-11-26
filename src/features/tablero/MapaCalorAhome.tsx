import ahome from '@/features/tablero/ahome.geo.json'

// Nivel de un sector (AGEB) según el futuro GET /analytics/heatmap. 'suprimido' = menos de 5 casos.
export type NivelSector = 1 | 2 | 3 | 4 | 5 | 'suprimido'
export type Vista = 'municipio' | 'los-mochis'

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
const CAJAS: Record<Vista, string> = {
  municipio: caja([municipio]),
  'los-mochis': caja(agebs.filter((s) => s.properties.id.startsWith('2500100010'))),
}

function claseNivel(nivel: NivelSector | undefined): string {
  if (nivel === undefined) return 'sin-datos'
  return nivel === 'suprimido' ? 'suprimido' : `calor-${nivel}`
}

export function MapaCalorAhome({ niveles = {}, vista = 'municipio' }: { niveles?: Record<string, NivelSector>; vista?: Vista }) {
  // El rayado del patrón se escala con el acercamiento para verse igual en ambas vistas.
  const raya = Number(CAJAS[vista].split(' ')[2]) / 150
  return (
    <svg
      className="mapa"
      viewBox={CAJAS[vista]}
      role="img"
      aria-label={vista === 'municipio' ? 'Mapa del municipio de Ahome por AGEB' : 'Mapa de Los Mochis por AGEB'}
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
    </svg>
  )
}
