import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consulta, pedir } from '@/shared/lib/servicio'

/*
 * Bolsa de trabajo. Tres actores:
 *  - Usuaria (portal /u): ve vacantes publicadas, arma su CV en 4 pasos, se postula y sigue sus postulaciones.
 *  - Empresa (portal /e): se registra, publica vacantes y decide sobre sus postulantes. Nunca ve el contacto.
 *  - Capacitación (panel): aprueba empresas y vacantes, y entrega el contacto cuando una empresa acepta.
 * El flujo completo para el backend está en docs/FLUJO_BOLSA_TRABAJO_SAI.md.
 */

// ---------- Tipos ----------
export type EstadoVacante = 'en_revision' | 'cambios' | 'publicada' | 'pausada' | 'cerrada'
export type EstadoPostulacion = 'enviada' | 'en_revision' | 'entrevista' | 'aceptada' | 'no_seleccionada' | 'retirada'
export type EstadoEmpresa = 'en_revision' | 'aprobada' | 'rechazada' | 'suspendida'

export type Vacante = {
  id: string
  empresaId: string
  empresa: string
  puesto: string
  sector: string
  horario: string
  tipoEmpleo: string
  ubicacion: string
  sueldo?: string
  descripcion: string
  requisitos: string[]
  estado: EstadoVacante
  /** Lo que Capacitación pidió corregir (solo con estado «cambios»). */
  motivoCambios?: string
  actualizada: string
  /** Vista de la usuaria: si ya se postuló. */
  postulada?: boolean
  /** Vista de empresa y Capacitación. */
  postulaciones?: number
  nuevas?: number
}

export type Escolaridad = 'Primaria' | 'Secundaria' | 'Preparatoria' | 'Carrera técnica' | 'Licenciatura' | 'Sin estudios'
export type Experiencia = { puesto: string; tiempo: string }
export type Cv = {
  escolaridad: Escolaridad
  experiencia: Experiencia[] // vacío = «Aún no he trabajado», es válido
  habilidades: string[]
  horarios: string[]
  inicio: string
  sobreMi?: string
  actualizado: string
}
/** Lo que ve la empresa: sin apellidos, teléfono, CURP ni dirección. */
export type CvPublico = Cv & { nombre: string }

export type Entrevista = {
  fecha: string // AAAA-MM-DD
  hora: string // HH:MM
  modalidad: 'Presencial' | 'Llamada' | 'Videollamada'
  lugar: string
  /** null = la usuaria aún no responde. */
  respuesta: 'confirmada' | 'otra_fecha' | null
}
export type Paso = { estado: EstadoPostulacion; fecha: string }

export type Postulacion = {
  id: string
  folio: string
  vacanteId: string
  puesto: string
  empresa: string
  estado: EstadoPostulacion
  enviada: string
  historial: Paso[]
  entrevista?: Entrevista
  /** La Secretaría ya entregó el contacto a la empresa (solo tras «aceptada»). */
  contactoEntregado?: boolean
}
/** Vista de la empresa: CV sin contacto; el teléfono aparece solo cuando la Secretaría lo entrega. */
export type Postulante = Postulacion & { cv: CvPublico; vista: boolean; telefono?: string }

export type Empresa = {
  id: string
  nombre: string
  rfc: string
  sector: string
  contacto: string
  correo: string
  telefono: string
  estado: EstadoEmpresa
  solicitada: string
  motivo?: string
}
/** Aceptación pendiente de que la Secretaría llame a la usuaria y entregue su contacto. */
export type Contratacion = { postulacionId: string; folio: string; nombre: string; puesto: string; empresa: string; fecha: string; contactoEntregado: boolean }

// ---------- Catálogos ----------
export const OPCIONES_VACANTE = {
  sector: ['Servicios', 'Comercio', 'Agroindustria', 'Salud', 'Educación'],
  horario: ['Matutino', 'Vespertino', 'Mixto'],
  tipoEmpleo: ['Tiempo completo', 'Medio tiempo', 'Temporal'],
  ubicacion: ['Los Mochis', 'Higuera de Zaragoza', 'Topolobampo', 'Ahome'],
}
export const ESCOLARIDADES: Escolaridad[] = ['Sin estudios', 'Primaria', 'Secundaria', 'Preparatoria', 'Carrera técnica', 'Licenciatura']
export const HABILIDADES = ['Atención a clientes', 'Limpieza', 'Cocina', 'Ventas', 'Caja y cobro', 'Computadora básica', 'Cuidado de personas', 'Costura', 'Campo y empaque', 'Manejo de redes sociales', 'Organización y archivo', 'Trabajo en equipo']
export const TIEMPOS = ['Menos de 1 año', '1 a 3 años', 'Más de 3 años']
export const INICIOS = ['De inmediato', 'En 2 semanas', 'En 1 mes']
export const MOTIVOS_NO = ['El perfil no coincide', 'La vacante se cubrió', 'No respondió a la entrevista', 'Otro']

export const TEXTO_POSTULACION: Record<EstadoPostulacion, string> = {
  enviada: 'Enviada',
  en_revision: 'En revisión',
  entrevista: 'Entrevista',
  aceptada: 'Aceptada',
  no_seleccionada: 'No seleccionada',
  retirada: 'Retirada',
}
export const TEXTO_VACANTE: Record<EstadoVacante, string> = {
  en_revision: 'En revisión',
  cambios: 'Pide cambios',
  publicada: 'Publicada',
  pausada: 'Pausada',
  cerrada: 'Cerrada',
}
export const TEXTO_EMPRESA: Record<EstadoEmpresa, string> = {
  en_revision: 'Por aprobar',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  suspendida: 'Suspendida',
}
export const FINALES: EstadoPostulacion[] = ['aceptada', 'no_seleccionada', 'retirada']

// ---------- Datos simulados (ficticios) ----------
/** Fecha local AAAA-MM-DD (toISOString daría la de UTC, un día adelante por la noche). */
export const hoy = () => new Date().toLocaleDateString('en-CA')

const empresas: Empresa[] = [
  { id: 'em1', nombre: 'Empresa aliada A', rfc: 'EAA010101AA1', sector: 'Servicios', contacto: 'Laura Ríos', correo: 'rh@aliada-a.test', telefono: '6681000001', estado: 'aprobada', solicitada: '2026-10-02' },
  { id: 'em2', nombre: 'Empresa aliada B', rfc: 'EAB010101BB2', sector: 'Comercio', contacto: 'Jorge Peña', correo: 'empleo@aliada-b.test', telefono: '6681000002', estado: 'aprobada', solicitada: '2026-10-10' },
  { id: 'em3', nombre: 'Empresa aliada C', rfc: 'EAC010101CC3', sector: 'Agroindustria', contacto: 'Ana Soto', correo: 'personal@aliada-c.test', telefono: '6681000003', estado: 'aprobada', solicitada: '2026-10-15' },
  { id: 'em4', nombre: 'Clínica del Valle', rfc: 'CVA020202DD4', sector: 'Salud', contacto: 'Rosa Medina', correo: 'rh@clinica-valle.test', telefono: '6681000004', estado: 'en_revision', solicitada: '2026-11-25' },
  { id: 'em5', nombre: 'Taller Industrial Norte', rfc: 'TIN030303EE5', sector: 'Servicios', contacto: 'Marco Ruiz', correo: 'contacto@taller-norte.test', telefono: '6681000005', estado: 'rechazada', solicitada: '2026-11-18', motivo: 'No pudimos verificar el RFC en el SAT. Revisa que esté bien escrito.' },
]

const vacantes: Vacante[] = [
  { id: 'va1', empresaId: 'em1', empresa: 'Empresa aliada A', puesto: 'Auxiliar administrativa', sector: 'Servicios', horario: 'Matutino', tipoEmpleo: 'Tiempo completo', ubicacion: 'Los Mochis', sueldo: '$8,500 al mes', descripcion: 'Apoyo en captura, archivo y atención a clientes.', requisitos: ['Secundaria terminada', 'Manejo básico de computadora'], estado: 'publicada', actualizada: '2026-11-24' },
  { id: 'va2', empresaId: 'em2', empresa: 'Empresa aliada B', puesto: 'Cajera', sector: 'Comercio', horario: 'Vespertino', tipoEmpleo: 'Medio tiempo', ubicacion: 'Los Mochis', descripcion: 'Cobro en caja y acomodo de mercancía.', requisitos: ['Mayor de 18 años'], estado: 'publicada', actualizada: '2026-11-22' },
  { id: 'va3', empresaId: 'em3', empresa: 'Empresa aliada C', puesto: 'Empacadora', sector: 'Agroindustria', horario: 'Matutino', tipoEmpleo: 'Temporal', ubicacion: 'Higuera de Zaragoza', sueldo: '$450 por día', descripcion: 'Selección y empaque de hortaliza en temporada.', requisitos: ['Disponibilidad de horario'], estado: 'publicada', actualizada: '2026-11-20' },
  { id: 'va4', empresaId: 'em1', empresa: 'Empresa aliada A', puesto: 'Recepcionista', sector: 'Servicios', horario: 'Mixto', tipoEmpleo: 'Tiempo completo', ubicacion: 'Los Mochis', descripcion: 'Recibir a visitantes, contestar llamadas y agendar citas.', requisitos: ['Preparatoria terminada'], estado: 'en_revision', actualizada: '2026-11-25' },
  { id: 'va5', empresaId: 'em1', empresa: 'Empresa aliada A', puesto: 'Intendencia', sector: 'Servicios', horario: 'Matutino', tipoEmpleo: 'Medio tiempo', ubicacion: 'Topolobampo', descripcion: 'Limpieza de oficinas.', requisitos: [], estado: 'cerrada', actualizada: '2026-10-30' },
]

// CV de la usuaria en sesión. null = aún no lo arma.
let miCv: Cv | null = null

type PostulacionInterna = Postulacion & { cv: CvPublico; vista: boolean; telefono: string; esMia: boolean }
const cvEjemplo = (nombre: string, extra: Partial<Cv> = {}): CvPublico => ({
  nombre,
  escolaridad: 'Secundaria',
  experiencia: [{ puesto: 'Ventas en tienda', tiempo: '1 a 3 años' }],
  habilidades: ['Atención a clientes', 'Caja y cobro'],
  horarios: ['Matutino'],
  inicio: 'De inmediato',
  actualizado: '2026-11-10',
  ...extra,
})
const postulaciones: PostulacionInterna[] = [
  { id: 'po1', folio: 'BT-0101', vacanteId: 'va1', puesto: 'Auxiliar administrativa', empresa: 'Empresa aliada A', estado: 'enviada', enviada: '2026-11-25', historial: [{ estado: 'enviada', fecha: '2026-11-25' }], cv: cvEjemplo('Lucía', { escolaridad: 'Preparatoria', habilidades: ['Computadora básica', 'Organización y archivo'] }), vista: false, telefono: '6680000011', esMia: false },
  { id: 'po2', folio: 'BT-0102', vacanteId: 'va1', puesto: 'Auxiliar administrativa', empresa: 'Empresa aliada A', estado: 'en_revision', enviada: '2026-11-24', historial: [{ estado: 'enviada', fecha: '2026-11-24' }, { estado: 'en_revision', fecha: '2026-11-25' }], cv: cvEjemplo('Karla'), vista: true, telefono: '6680000012', esMia: false },
  {
    id: 'po3', folio: 'BT-0103', vacanteId: 'va1', puesto: 'Auxiliar administrativa', empresa: 'Empresa aliada A', estado: 'entrevista', enviada: '2026-11-20',
    historial: [{ estado: 'enviada', fecha: '2026-11-20' }, { estado: 'en_revision', fecha: '2026-11-21' }, { estado: 'entrevista', fecha: '2026-11-23' }],
    entrevista: { fecha: '2026-12-02', hora: '10:00', modalidad: 'Presencial', lugar: 'Oficina de la empresa, centro de Los Mochis', respuesta: 'confirmada' },
    cv: cvEjemplo('Fernanda', { experiencia: [] }), vista: true, telefono: '6680000013', esMia: false,
  },
  {
    id: 'po4', folio: 'BT-0104', vacanteId: 'va3', puesto: 'Empacadora', empresa: 'Empresa aliada C', estado: 'aceptada', enviada: '2026-11-12',
    historial: [{ estado: 'enviada', fecha: '2026-11-12' }, { estado: 'en_revision', fecha: '2026-11-13' }, { estado: 'aceptada', fecha: '2026-11-18' }],
    cv: cvEjemplo('Rosa', { habilidades: ['Campo y empaque'] }), vista: true, telefono: '6680000014', esMia: false, contactoEntregado: false,
  },
  // Postulación propia de la usuaria de demostración, con entrevista por confirmar.
  {
    id: 'po5', folio: 'BT-0105', vacanteId: 'va2', puesto: 'Cajera', empresa: 'Empresa aliada B', estado: 'entrevista', enviada: '2026-11-21',
    historial: [{ estado: 'enviada', fecha: '2026-11-21' }, { estado: 'en_revision', fecha: '2026-11-22' }, { estado: 'entrevista', fecha: '2026-11-24' }],
    entrevista: { fecha: '2026-12-01', hora: '16:30', modalidad: 'Presencial', lugar: 'Sucursal Gabriel Leyva, Los Mochis', respuesta: null },
    cv: cvEjemplo('María'), vista: true, telefono: '6680000042', esMia: true,
  },
]
vacantes.find((v) => v.id === 'va2')!.postulada = true

const conteos = (v: Vacante): Vacante => {
  const ps = postulaciones.filter((p) => p.vacanteId === v.id && p.estado !== 'retirada')
  return { ...v, postulaciones: ps.length, nuevas: ps.filter((p) => !p.vista).length }
}
const paraUsuaria = (p: PostulacionInterna): Postulacion => ({
  id: p.id, folio: p.folio, vacanteId: p.vacanteId, puesto: p.puesto, empresa: p.empresa, estado: p.estado,
  enviada: p.enviada, historial: p.historial, entrevista: p.entrevista, contactoEntregado: p.contactoEntregado,
})
const paraEmpresa = (p: PostulacionInterna): Postulante => ({ ...paraUsuaria(p), cv: p.cv, vista: p.vista, telefono: p.contactoEntregado ? p.telefono : undefined })
function avanzar(p: PostulacionInterna, estado: EstadoPostulacion) {
  p.estado = estado
  p.historial.push({ estado, fecha: hoy() })
}

// La empresa en sesión del portal /e (simulado: se elige por el correo con que entra).
let EMPRESA_DEMO = 'em1'
let correoPendiente = ''

// ====================================================================
// Usuaria
// ====================================================================
export type FiltrosVacantes = { sector?: string; horario?: string; tipoEmpleo?: string; ubicacion?: string }

/** GET /jobs — solo vacantes publicadas. */
export function useVacantes(f: FiltrosVacantes = {}) {
  return useQuery({
    queryKey: ['vacantes', f],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: `/jobs${consulta({ sector: f.sector, schedule: f.horario, type: f.tipoEmpleo, location: f.ubicacion })}`,
        simulado: () =>
          vacantes.filter(
            (v) =>
              v.estado === 'publicada' &&
              (!f.sector || v.sector === f.sector) &&
              (!f.horario || v.horario === f.horario) &&
              (!f.tipoEmpleo || v.tipoEmpleo === f.tipoEmpleo) &&
              (!f.ubicacion || v.ubicacion === f.ubicacion),
          ),
      }),
  })
}

/** GET /jobs/{id} */
export function useVacante(id: string) {
  return useQuery({
    queryKey: ['vacante', id],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/jobs/${id}`, simulado: () => vacantes.find((v) => v.id === id && v.estado === 'publicada') ?? null }),
  })
}

/** GET /portal/me/cv — 200 con el CV o null si aún no existe. */
export function useMiCv() {
  return useQuery({ queryKey: ['mi-cv'], queryFn: () => pedir({ metodo: 'GET', ruta: '/portal/me/cv', simulado: () => miCv }) })
}

/** PUT /portal/me/cv */
export function useGuardarCv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cv: Omit<Cv, 'actualizado'>) =>
      pedir<Cv>({ metodo: 'PUT', ruta: '/portal/me/cv', cuerpo: cv, simulado: () => (miCv = { ...cv, actualizado: hoy() }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mi-cv'] }),
  })
}

/** POST /jobs/{id}/applications — envía el CV actual (copia congelada). 409 si ya se postuló, 422 si no tiene CV. */
export function usePostularme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      pedir<Postulacion>({
        metodo: 'POST',
        ruta: `/jobs/${id}/applications`,
        simulado: () => {
          const v = vacantes.find((x) => x.id === id)!
          v.postulada = true
          const p: PostulacionInterna = {
            id: `po${postulaciones.length + 1}`,
            folio: `BT-01${String(postulaciones.length + 1).padStart(2, '0')}`,
            vacanteId: id,
            puesto: v.puesto,
            empresa: v.empresa,
            estado: 'enviada',
            enviada: hoy(),
            historial: [{ estado: 'enviada', fecha: hoy() }],
            cv: { ...(miCv ?? cvEjemplo('María')), nombre: 'María' },
            vista: false,
            telefono: '6680000042',
            esMia: true,
          }
          postulaciones.unshift(p)
          return paraUsuaria(p)
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** GET /portal/me/applications */
export function useMisPostulaciones() {
  return useQuery({
    queryKey: ['mis-postulaciones'],
    queryFn: () => pedir({ metodo: 'GET', ruta: '/portal/me/applications', simulado: () => postulaciones.filter((p) => p.esMia).map(paraUsuaria) }),
  })
}

/** GET /portal/me/applications/{id} */
export function useMiPostulacion(id: string) {
  return useQuery({
    queryKey: ['mi-postulacion', id],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/portal/me/applications/${id}`, simulado: () => postulaciones.filter((p) => p.esMia).map(paraUsuaria).find((p) => p.id === id) ?? null }),
  })
}

/** POST /portal/me/applications/{id}/interview-response {respuesta} */
export function useResponderEntrevista(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (respuesta: 'confirmada' | 'otra_fecha') =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/portal/me/applications/${id}/interview-response`,
        cuerpo: { respuesta },
        simulado: () => {
          const p = postulaciones.find((x) => x.id === id)
          if (p?.entrevista) p.entrevista.respuesta = respuesta
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** POST /portal/me/applications/{id}/withdrawal */
export function useRetirarPostulacion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/portal/me/applications/${id}/withdrawal`,
        simulado: () => {
          const p = postulaciones.find((x) => x.id === id)
          if (!p) return
          avanzar(p, 'retirada')
          const v = vacantes.find((x) => x.id === p.vacanteId)
          if (v) v.postulada = false
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

// ====================================================================
// Empresa (portal /e)
// ====================================================================
export type RegistroEmpresa = Pick<Empresa, 'nombre' | 'rfc' | 'sector' | 'contacto' | 'correo' | 'telefono'> & { aceptaAviso: boolean }

/** POST /employers/registrations — queda «en_revision» hasta que Capacitación la apruebe. */
export function useRegistrarEmpresa() {
  return useMutation({
    mutationFn: ({ nombre, rfc, sector, contacto, correo, telefono }: RegistroEmpresa) =>
      pedir<{ id: string; estado: EstadoEmpresa }>({
        metodo: 'POST',
        ruta: '/employers/registrations',
        cuerpo: { nombre, rfc, sector, contacto, correo, telefono, aceptaAviso: true },
        simulado: () => {
          const e: Empresa = { nombre, rfc, sector, contacto, correo, telefono, id: `em${empresas.length + 1}`, estado: 'en_revision', solicitada: hoy() }
          empresas.push(e)
          return { id: e.id, estado: e.estado }
        },
      }),
  })
}

/** POST /employers/auth/login {correo} → código de 6 dígitos al correo. */
export function useEntrarEmpresa() {
  return useMutation({
    mutationFn: (correo: string) =>
      pedir<{ challengeId: string; correoMascara: string }>({
        metodo: 'POST',
        ruta: '/employers/auth/login',
        cuerpo: { correo },
        simulado: () => {
          correoPendiente = correo.trim().toLowerCase()
          return { challengeId: 'ech-1', correoMascara: correo.replace(/^(.).*(@.*)$/, '$1•••$2') }
        },
      }),
  })
}

/**
 * POST /employers/auth/verify → {id, nombre, estado}.
 * Si la empresa no está aprobada, la sesión es limitada: solo puede consultar y corregir su solicitud.
 */
export function useVerificarEmpresa() {
  return useMutation({
    mutationFn: (c: { challengeId: string; codigo: string }) =>
      pedir<{ id: string; nombre: string; estado: EstadoEmpresa }>({
        metodo: 'POST',
        ruta: '/employers/auth/verify',
        cuerpo: { challengeId: c.challengeId, code: c.codigo },
        simulado: () => {
          const e = empresas.find((x) => x.correo === correoPendiente) ?? empresas.find((x) => x.id === 'em1')!
          EMPRESA_DEMO = e.id
          return { id: e.id, nombre: e.nombre, estado: e.estado }
        },
      }),
  })
}

/** GET /employers/me/registration — la solicitud de la empresa en sesión, con su estado y motivo. */
export function useMiSolicitud() {
  return useQuery({
    queryKey: ['mi-solicitud'],
    queryFn: () => pedir({ metodo: 'GET', ruta: '/employers/me/registration', simulado: () => empresas.find((x) => x.id === EMPRESA_DEMO)! }),
  })
}

/** PUT /employers/me/registration — solo si fue rechazada; vuelve a «en_revision». El correo no cambia. */
export function useCorregirSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, rfc, sector, contacto, telefono }: Omit<RegistroEmpresa, 'correo' | 'aceptaAviso'>) =>
      pedir<{ estado: EstadoEmpresa }>({
        metodo: 'PUT',
        ruta: '/employers/me/registration',
        cuerpo: { nombre, rfc, sector, contacto, telefono },
        simulado: () => {
          const e = empresas.find((x) => x.id === EMPRESA_DEMO)!
          Object.assign(e, { nombre, rfc, sector, contacto, telefono, estado: 'en_revision', motivo: undefined, solicitada: hoy() })
          return { estado: e.estado }
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** GET /employer/jobs — todas las vacantes de la empresa, con conteos. */
export function useVacantesEmpresa() {
  return useQuery({
    queryKey: ['empresa-vacantes'],
    queryFn: () => pedir({ metodo: 'GET', ruta: '/employer/jobs', simulado: () => vacantes.filter((v) => v.empresaId === EMPRESA_DEMO).map(conteos) }),
  })
}

/** GET /employer/jobs/{id} */
export function useVacanteEmpresa(id: string) {
  return useQuery({
    queryKey: ['empresa-vacante', id],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/employer/jobs/${id}`, simulado: () => { const v = vacantes.find((x) => x.id === id && x.empresaId === EMPRESA_DEMO); return v ? conteos(v) : null } }),
  })
}

export type DatosVacante = Pick<Vacante, 'puesto' | 'sector' | 'horario' | 'tipoEmpleo' | 'ubicacion' | 'sueldo' | 'descripcion' | 'requisitos'>

/** POST /employer/jobs — nace «en_revision». */
export function useCrearVacanteEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: DatosVacante) =>
      pedir<Vacante>({
        metodo: 'POST',
        ruta: '/employer/jobs',
        cuerpo: d,
        simulado: () => {
          const e = empresas.find((x) => x.id === EMPRESA_DEMO)!
          const v: Vacante = { ...d, id: `va${vacantes.length + 1}`, empresaId: e.id, empresa: e.nombre, estado: 'en_revision', actualizada: hoy() }
          vacantes.unshift(v)
          return v
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** PATCH /employer/jobs/{id} — editar regresa a «en_revision»; también pausar, reanudar o cerrar. */
export function useActualizarVacanteEmpresa(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cambio: Partial<DatosVacante> & { estado?: 'pausada' | 'publicada' | 'cerrada' }) =>
      pedir<void>({
        metodo: 'PATCH',
        ruta: `/employer/jobs/${id}`,
        cuerpo: cambio,
        simulado: () => {
          const v = vacantes.find((x) => x.id === id)
          if (!v) return
          const { estado, ...datos } = cambio
          if (Object.keys(datos).length > 0) Object.assign(v, datos, { estado: 'en_revision', motivoCambios: undefined })
          if (estado) v.estado = estado
          if (estado === 'cerrada') postulaciones.filter((p) => p.vacanteId === id && !FINALES.includes(p.estado)).forEach((p) => avanzar(p, 'no_seleccionada'))
          v.actualizada = hoy()
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** GET /employer/jobs/{id}/applications */
export function usePostulantes(vacanteId: string) {
  return useQuery({
    queryKey: ['postulantes', vacanteId],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: `/employer/jobs/${vacanteId}/applications`,
        simulado: () => postulaciones.filter((p) => p.vacanteId === vacanteId && p.estado !== 'retirada').map(paraEmpresa),
      }),
  })
}

/** GET /employer/applications/{id} — la primera lectura pasa «enviada» a «en_revision». */
export function usePostulante(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['postulante', id],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: `/employer/applications/${id}`,
        simulado: () => {
          const p = postulaciones.find((x) => x.id === id)
          if (!p || p.estado === 'retirada') return null
          if (!p.vista) {
            p.vista = true
            if (p.estado === 'enviada') avanzar(p, 'en_revision')
            void qc.invalidateQueries({ queryKey: ['postulantes'] })
            void qc.invalidateQueries({ queryKey: ['empresa-vacantes'] })
          }
          return paraEmpresa(p)
        },
      }),
  })
}

/** POST /employer/applications/{id}/interview — propone o cambia la entrevista. */
export function useProponerEntrevista(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (e: Omit<Entrevista, 'respuesta'>) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/employer/applications/${id}/interview`,
        cuerpo: e,
        simulado: () => {
          const p = postulaciones.find((x) => x.id === id)
          if (!p) return
          p.entrevista = { ...e, respuesta: null }
          if (p.estado !== 'entrevista') avanzar(p, 'entrevista')
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** POST /employer/applications/{id}/decision {decision, motivo?} */
export function useDecidir(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: { decision: 'aceptada' | 'no_seleccionada'; motivo?: string }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/employer/applications/${id}/decision`,
        cuerpo: d,
        simulado: () => {
          const p = postulaciones.find((x) => x.id === id)
          if (p) avanzar(p, d.decision)
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

// ====================================================================
// Capacitación
// ====================================================================
/** GET /admin/jobs?status= — todas las vacantes, de cualquier estado. */
export function useVacantesAdmin(estado?: EstadoVacante) {
  return useQuery({
    queryKey: ['admin-vacantes', estado ?? 'todas'],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/admin/jobs${consulta({ status: estado })}`, simulado: () => vacantes.filter((v) => !estado || v.estado === estado).map(conteos) }),
  })
}

/** GET /admin/jobs/{id} */
export function useVacanteAdmin(id: string) {
  return useQuery({
    queryKey: ['admin-vacante', id],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: `/admin/jobs/${id}`,
        simulado: () => {
          const v = vacantes.find((x) => x.id === id)
          if (!v) return null
          const porEstado = Object.fromEntries(
            (Object.keys(TEXTO_POSTULACION) as EstadoPostulacion[]).map((e) => [e, postulaciones.filter((p) => p.vacanteId === id && p.estado === e).length]),
          ) as Record<EstadoPostulacion, number>
          return { ...conteos(v), porEstado }
        },
      }),
  })
}

/** POST /admin/jobs/{id}/review {aprobar, motivo?} — aprobar publica; si no, «cambios» con el motivo. */
export function useRevisarVacante(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (r: { aprobar: boolean; motivo?: string }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/admin/jobs/${id}/review`,
        cuerpo: r,
        simulado: () => {
          const v = vacantes.find((x) => x.id === id)
          if (!v) return
          v.estado = r.aprobar ? 'publicada' : 'cambios'
          v.motivoCambios = r.aprobar ? undefined : r.motivo
          v.actualizada = hoy()
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** POST /admin/jobs — la Secretaría publica a nombre de una empresa aprobada (sin revisión). */
export function useCrearVacanteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: DatosVacante & { empresaId: string }) =>
      pedir<Vacante>({
        metodo: 'POST',
        ruta: '/admin/jobs',
        cuerpo: d,
        simulado: () => {
          const e = empresas.find((x) => x.id === d.empresaId)!
          const v: Vacante = { ...d, id: `va${vacantes.length + 1}`, empresa: e.nombre, estado: 'publicada', actualizada: hoy() }
          vacantes.unshift(v)
          return v
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** GET /admin/employers?status= */
export function useEmpresas(estado?: EstadoEmpresa) {
  return useQuery({
    queryKey: ['empresas', estado ?? 'todas'],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/admin/employers${consulta({ status: estado })}`, simulado: () => empresas.filter((e) => !estado || e.estado === estado) }),
  })
}

/** POST /admin/employers/{id}/review {estado, motivo?} — aprobar, rechazar, suspender o reactivar. */
export function useRevisarEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (r: { id: string; estado: Exclude<EstadoEmpresa, 'en_revision'>; motivo?: string }) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/admin/employers/${r.id}/review`,
        cuerpo: { estado: r.estado, motivo: r.motivo },
        simulado: () => {
          const e = empresas.find((x) => x.id === r.id)
          if (!e) return
          e.estado = r.estado
          e.motivo = r.motivo
          if (r.estado === 'suspendida') vacantes.filter((v) => v.empresaId === e.id && v.estado === 'publicada').forEach((v) => (v.estado = 'pausada'))
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** GET /admin/hires — postulaciones aceptadas, para llamar a la usuaria y entregar su contacto. */
export function useContrataciones() {
  return useQuery({
    queryKey: ['contrataciones'],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: '/admin/hires',
        simulado: (): Contratacion[] =>
          postulaciones
            .filter((p) => p.estado === 'aceptada')
            .map((p) => ({ postulacionId: p.id, folio: p.folio, nombre: p.cv.nombre, puesto: p.puesto, empresa: p.empresa, fecha: p.historial.at(-1)!.fecha, contactoEntregado: !!p.contactoEntregado })),
      }),
  })
}

/** POST /admin/applications/{id}/contact-release — tras confirmar por teléfono con la usuaria. */
export function useEntregarContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/admin/applications/${id}/contact-release`,
        simulado: () => {
          const p = postulaciones.find((x) => x.id === id)
          if (p) p.contactoEntregado = true
        },
      }),
    onSuccess: () => qc.invalidateQueries(),
  })
}
