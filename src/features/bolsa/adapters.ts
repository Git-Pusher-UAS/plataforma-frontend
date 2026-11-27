import type {
  Contratacion,
  Cv,
  Empresa,
  Entrevista,
  Escolaridad,
  EstadoPostulacion,
  EstadoVacante,
  Postulacion,
  Postulante,
  Vacante,
} from '@/features/bolsa/api'
import { mapEstadoEmpresaBackend } from '@/features/identidad/sesion'

const hoyLocal = () => new Date().toLocaleDateString('en-CA')

const ESCOLARIDADES_VALIDAS = new Set<Escolaridad>([
  'Sin estudios',
  'Primaria',
  'Secundaria',
  'Preparatoria',
  'Carrera técnica',
  'Licenciatura',
])

// TODO(backend): remove PascalCase fallbacks once /api/admin/* models have json tags
function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T
  }
  return undefined
}

function soloFecha(iso: unknown): string {
  if (typeof iso !== 'string' || !iso) return hoyLocal()
  return iso.slice(0, 10)
}

function splitRequisitos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
  if (typeof raw === 'string') return raw.split('\n').map((s) => s.trim()).filter(Boolean)
  return []
}

// TODO(backend): remove descripcion packing once employer DTO adds rfc, sector, contacto
export function packDescripcionEmpresa(d: { rfc?: string; sector?: string; contacto?: string }): string {
  const partes: string[] = []
  if (d.rfc) partes.push(`RFC: ${d.rfc}`)
  if (d.sector) partes.push(`Sector: ${d.sector}`)
  if (d.contacto) partes.push(`Contacto: ${d.contacto}`)
  return partes.join(' | ')
}

export function unpackDescripcionEmpresa(desc: string): { rfc?: string; sector?: string; contacto?: string } {
  const out: { rfc?: string; sector?: string; contacto?: string } = {}
  for (const part of desc.split('|')) {
    const trimmed = part.trim()
    if (trimmed.startsWith('RFC:')) out.rfc = trimmed.slice(4).trim()
    else if (trimmed.startsWith('Sector:')) out.sector = trimmed.slice(7).trim()
    else if (trimmed.startsWith('Contacto:')) out.contacto = trimmed.slice(9).trim()
  }
  return out
}

export function mapEstadoVacanteBackend(estado: string): EstadoVacante {
  const e = estado.trim().toLowerCase()
  if (e === 'published' || e === 'approved' || e === 'publicada') return 'publicada'
  if (e === 'rejected' || e === 'cambios') return 'cambios'
  if (e === 'closed' || e === 'cerrada') return 'cerrada'
  if (e === 'paused' || e === 'pausada') return 'pausada'
  return 'en_revision'
}

export function mapEstadoPostulacionBackend(estado: string): EstadoPostulacion {
  const e = estado.trim().toLowerCase()
  if (e === 'submitted' || e === 'enviada') return 'enviada'
  if (e === 'en_revision' || e === 'in_review') return 'en_revision'
  if (e === 'interview_invited' || e === 'interview_accepted' || e === 'interview_declined' || e === 'entrevista') return 'entrevista'
  if (e === 'accepted' || e === 'hired' || e === 'aceptada') return 'aceptada'
  if (e === 'rejected' || e === 'no_seleccionada') return 'no_seleccionada'
  if (e === 'withdrawn' || e === 'retirada') return 'retirada'
  return 'enviada'
}

export function adaptarVacante(raw: unknown): Vacante {
  const r = (raw ?? {}) as Record<string, unknown>
  const estadoRaw = pick<string>(r, 'estado', 'Estado')
  const publicadaRaw = pick<string>(r, 'publicadaEn', 'PublicadaEn')
  const actualizadaRaw = pick<string>(r, 'actualizada', 'actualizadaEn', 'ActualizadaEn')
  const motivoRaw = pick<string>(r, 'motivoCambios', 'motivoRevision', 'MotivoRevision')
  return {
    id: String(pick<string>(r, 'id', 'ID') ?? ''),
    empresaId: String(pick<string>(r, 'empresaId', 'empleadorId', 'EmpleadorID') ?? ''),
    empresa: String(pick<string>(r, 'empresa', 'Empresa') ?? ''),
    puesto: String(pick<string>(r, 'puesto', 'Puesto') ?? ''),
    sector: String(pick<string>(r, 'sector', 'Sector') ?? ''),
    horario: String(pick<string>(r, 'horario', 'Horario') ?? ''),
    tipoEmpleo: String(pick<string>(r, 'tipoEmpleo', 'TipoEmpleo') ?? ''),
    ubicacion: String(pick<string>(r, 'ubicacion', 'Ubicacion') ?? ''),
    sueldo: pick<string>(r, 'sueldo', 'Sueldo'),
    descripcion: String(pick<string>(r, 'descripcion', 'Descripcion') ?? ''),
    requisitos: splitRequisitos(pick(r, 'requisitos', 'Requisitos')),
    estado: estadoRaw ? mapEstadoVacanteBackend(estadoRaw) : 'publicada',
    publicadaEn: publicadaRaw ? soloFecha(publicadaRaw) : undefined,
    motivoCambios: motivoRaw,
    actualizada: soloFecha(actualizadaRaw ?? publicadaRaw),
    postulada: pick<boolean>(r, 'postulada', 'Postulada'),
    postulaciones: pick<number>(r, 'postulaciones', 'Postulaciones'),
    nuevas: pick<number>(r, 'nuevas', 'Nuevas'),
  }
}

export function adaptarVacanteAdminDetalle(
  raw: unknown,
): Vacante & { porEstado: Record<EstadoPostulacion, number> } {
  const r = (raw ?? {}) as Record<string, unknown>
  const vacante = adaptarVacante(r)
  const porEstadoRaw = pick<Record<string, number>>(r, 'porEstado')
  // TODO(backend): remove zero-filled porEstado once GET /admin/jobs/:id returns counts by status
  const porEstado: Record<EstadoPostulacion, number> = {
    enviada: porEstadoRaw?.enviada ?? 0,
    en_revision: porEstadoRaw?.en_revision ?? 0,
    entrevista: porEstadoRaw?.entrevista ?? 0,
    aceptada: porEstadoRaw?.aceptada ?? 0,
    no_seleccionada: porEstadoRaw?.no_seleccionada ?? 0,
    retirada: porEstadoRaw?.retirada ?? 0,
  }
  return { ...vacante, porEstado }
}

export function adaptarEmpresa(raw: unknown): Empresa {
  const r = (raw ?? {}) as Record<string, unknown>
  const nombre = String(pick<string>(r, 'nombre', 'Nombre') ?? '')
  const descripcion = String(pick<string>(r, 'descripcion', 'Descripcion') ?? '')
  const unpacked = unpackDescripcionEmpresa(descripcion)
  const estadoRaw = String(pick<string>(r, 'estado', 'Estado') ?? 'pending_review')
  const solicitadaRaw = pick<string>(r, 'solicitada', 'creadoEn', 'CreadoEn')
  return {
    id: String(pick<string>(r, 'id', 'ID') ?? ''),
    nombre,
    rfc: pick<string>(r, 'rfc', 'RFC') ?? unpacked.rfc ?? '—',
    sector: pick<string>(r, 'sector', 'Sector') ?? unpacked.sector ?? 'Servicios',
    contacto: pick<string>(r, 'contacto', 'Contacto') ?? unpacked.contacto ?? nombre,
    correo: String(pick<string>(r, 'correo', 'Correo') ?? ''),
    telefono: String(pick<string>(r, 'telefono', 'Telefono') ?? ''),
    estado: mapEstadoEmpresaBackend(estadoRaw),
    solicitada: soloFecha(solicitadaRaw),
    motivo: pick<string>(r, 'motivo', 'motivoRevision', 'MotivoRevision'),
  }
}

export function adaptarPostulacionUsuaria(raw: unknown): Postulacion {
  const r = (raw ?? {}) as Record<string, unknown>
  const id = String(pick<string>(r, 'id', 'ID') ?? '')
  const estadoRaw = String(pick<string>(r, 'estado', 'Estado') ?? 'submitted')
  const estado = mapEstadoPostulacionBackend(estadoRaw)
  const enviada = soloFecha(pick<string>(r, 'enviada', 'creadoEn', 'CreadoEn'))
  const historial = Array.isArray(r.historial)
    ? (r.historial as Postulacion['historial'])
    : [{ estado, fecha: enviada }]
  const respuestaEntrevista: Entrevista['respuesta'] =
    estadoRaw === 'interview_accepted'
      ? 'confirmada'
      : estadoRaw === 'interview_declined'
        ? 'otra_fecha'
        : null
  const entrevista =
    r.entrevista && typeof r.entrevista === 'object'
      ? (r.entrevista as Postulacion['entrevista'])
      : estado === 'entrevista'
        ? {
            fecha: enviada,
            hora: '10:00',
            modalidad: 'Presencial' as const,
            lugar: 'Por confirmar con la empresa',
            respuesta: respuestaEntrevista,
          }
        : undefined
  return {
    id,
    folio: pick<string>(r, 'folio') ?? `BT-${id.slice(0, 6).toUpperCase()}`,
    vacanteId: String(pick<string>(r, 'vacanteId', 'VacanteID') ?? ''),
    puesto: String(pick<string>(r, 'puesto', 'Puesto') ?? ''),
    empresa: String(pick<string>(r, 'empresa', 'Empresa') ?? ''),
    estado,
    enviada,
    historial,
    entrevista,
    contactoEntregado: pick<boolean>(r, 'contactoEntregado', 'contactoLiberado', 'ContactoLiberado'),
  }
}

export function adaptarPostulanteEmpresa(raw: unknown): Postulante {
  const r = (raw ?? {}) as Record<string, unknown>
  const base = adaptarPostulacionUsuaria(r)
  const nombre = pick<string>(r, 'nombre') ?? `Postulante ${base.folio}`
  const contacto = pick<string>(r, 'contacto', 'telefono')
  const rawCv = r.cv as Cv | undefined
  // TODO(backend): remove placeholder CV once ApplicationView returns anonymized CV snapshot
  const cv = rawCv
    ? { ...rawCv, nombre }
    : {
        nombre,
        escolaridad: 'Secundaria' as Escolaridad,
        experiencia: [],
        habilidades: [],
        horarios: [],
        inicio: 'De inmediato',
        actualizado: base.enviada,
      }
  return {
    ...base,
    cv,
    vista: typeof r.vista === 'boolean' ? r.vista : String(pick<string>(r, 'estado') ?? '') !== 'submitted',
    telefono: base.contactoEntregado ? contacto : undefined,
  }
}

export function adaptarContratacion(raw: unknown, vacantesPorId?: Map<string, Vacante>): Contratacion {
  const r = (raw ?? {}) as Record<string, unknown>
  const postulacionId = String(pick<string>(r, 'postulacionId', 'id', 'ID') ?? '')
  const vacanteId = String(pick<string>(r, 'vacanteId', 'VacanteID') ?? '')
  const vac = vacantesPorId?.get(vacanteId)
  const fechaRaw = pick<string>(r, 'fecha', 'actualizadoEn', 'ActualizadoEn', 'creadoEn', 'CreadoEn')
  // TODO(backend): remove vacante cross-reference and placeholder nombre once GET /admin/hires returns enriched Contratacion DTO
  return {
    postulacionId,
    folio: pick<string>(r, 'folio') ?? `BT-${postulacionId.slice(0, 6).toUpperCase()}`,
    nombre: pick<string>(r, 'nombre') ?? `Usuaria ${postulacionId.slice(0, 6)}`,
    puesto: pick<string>(r, 'puesto') ?? vac?.puesto ?? 'Vacante',
    empresa: pick<string>(r, 'empresa') ?? vac?.empresa ?? 'Empresa aliada',
    fecha: soloFecha(fechaRaw),
    contactoEntregado: Boolean(pick<boolean>(r, 'contactoEntregado', 'contactoLiberado', 'ContactoLiberado')),
  }
}

type BackendCVPayload = {
  perfil: { nombre: string; titular: string; resumen: string; contacto: string }
  experiencia: { empresa: string; puesto: string; inicio: string; fin: string; descripcion: string }[]
  estudios: { institucion: string; grado: string; inicio: string; fin: string }[]
  habilidades: string[]
}

export function serializarCvParaBackend(cv: Omit<Cv, 'actualizado'>, nombrePerfil: string): BackendCVPayload {
  return {
    perfil: {
      nombre: nombrePerfil.trim() || 'Usuaria',
      titular: JSON.stringify({ horarios: cv.horarios, inicio: cv.inicio }),
      resumen: cv.sobreMi ?? '',
      contacto: '',
    },
    experiencia: cv.experiencia.map((e) => ({
      empresa: '',
      puesto: e.puesto,
      inicio: e.tiempo,
      fin: '',
      descripcion: '',
    })),
    estudios: [{ institucion: '', grado: cv.escolaridad, inicio: '', fin: '' }],
    habilidades: cv.habilidades,
  }
}

export function adaptarCvDesdeBackend(raw: unknown): Cv {
  const r = (raw ?? {}) as Partial<BackendCVPayload>
  const grado = r.estudios?.[0]?.grado ?? 'Secundaria'
  const escolaridad: Escolaridad = ESCOLARIDADES_VALIDAS.has(grado as Escolaridad)
    ? (grado as Escolaridad)
    : 'Secundaria'
  let horarios: string[] = ['Matutino']
  let inicio = 'De inmediato'
  if (r.perfil?.titular) {
    try {
      const parsed = JSON.parse(r.perfil.titular) as { horarios?: string[]; inicio?: string }
      if (Array.isArray(parsed.horarios) && parsed.horarios.length > 0) horarios = parsed.horarios
      if (typeof parsed.inicio === 'string' && parsed.inicio) inicio = parsed.inicio
    } catch {
      // titular en texto plano legado: conserva valores por defecto
    }
  }
  return {
    escolaridad,
    experiencia: (r.experiencia ?? []).map((e) => ({
      puesto: e.puesto,
      tiempo: e.inicio || '1 a 3 años',
    })),
    habilidades: Array.isArray(r.habilidades) ? r.habilidades : [],
    horarios,
    inicio,
    sobreMi: r.perfil?.resumen?.trim() ? r.perfil.resumen : undefined,
    actualizado: hoyLocal(),
  }
}
