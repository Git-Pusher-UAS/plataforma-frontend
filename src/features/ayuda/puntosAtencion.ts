/** Un lugar de atención presencial que se marca en el mapa. */
export type PuntoAtencion = {
  id: string
  nombre: string
  corto: string
  direccion: string
  horario?: string
  telefono: { texto: string; numero: string; nota?: string }
  servicios?: string
  /** Coordenadas aproximadas (OpenStreetMap). Confirmar con la Secretaría antes de producción. */
  lat: number
  lon: number
}

export const PUNTOS_ATENCION: PuntoAtencion[] = [
  {
    id: 'semujeres',
    nombre: 'Secretaría de las Mujeres de Ahome (SEMUJERES)',
    corto: 'SEMUJERES',
    direccion: 'Calle Guillermo Prieto #728 Sur (entre Cuauhtémoc y Marcial Ordóñez), Los Mochis, Sin.',
    horario: 'Lunes a viernes de 8:00 a.m. a 4:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m.',
    telefono: { texto: '668 102 5080', numero: '6681025080', nota: 'Línea Violeta, activa las 24 horas para atención y reportes.' },
    lat: 25.7845,
    lon: -108.9953,
  },
  {
    id: 'cjm',
    nombre: 'Centro Regional de Justicia para las Mujeres en Ahome (CJM)',
    corto: 'Centro de Justicia',
    direccion: 'Fraccionamiento Álamos Country, Los Mochis, Sin.',
    telefono: { texto: '668 100 0083', numero: '6681000083' },
    servicios: 'Atención multidisciplinaria gratuita (psicológica, jurídica, médica, trabajo social y seguimiento) para mujeres en situación de violencia.',
    lat: 25.7816,
    lon: -109.0242,
  },
  {
    id: 'palacio',
    nombre: 'Palacio Municipal de Ahome',
    corto: 'Palacio Municipal',
    direccion: 'Degollado y Cuauhtémoc S/N, Col. Centro, Los Mochis, Sin.',
    horario: 'Lunes a viernes de 8:00 a.m. a 3:00 p.m.',
    telefono: { texto: '668 816 4000', numero: '6688164000', nota: 'Conmutador.' },
    lat: 25.7836,
    lon: -108.9931,
  },
]

/** Línea Violeta SEMUJERES Ahome, 24 horas. */
export const LINEA_VIOLETA = { texto: '668 102 5080', numero: '6681025080' }
