import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consulta, pedir } from '@/shared/lib/servicio'

export type TipoEvento = 'curso' | 'charla' | 'conferencia'
export type Curso = {
  id: string
  tipo: TipoEvento
  titulo: string
  descripcion: string
  fecha: string // AAAA-MM-DD
  hora: string // HH:MM
  lugar: string
  cupo: number
  inscritas: number
  /** Solo en la vista de la usuaria: si ella ya está inscrita. */
  inscrita?: boolean
}
export type Vacante = {
  id: string
  puesto: string
  empresa: string
  sector: string
  horario: string
  tipoEmpleo: string
  ubicacion: string
  descripcion: string
  requisitos: string[]
  publicadaEn?: string
  actualizada: string
  postulada?: boolean
  postulaciones?: number
}
export type Visita = { id: string; sector: string; fecha: string; tema: string; responsable: string; estado: 'planeada' | 'realizada' }
export type Asistente = { id: string; alias: string; presente: boolean }

export const TIPOS_EVENTO: { valor: TipoEvento; texto: string; clase: string }[] = [
  { valor: 'curso', texto: 'Curso', clase: 'etiqueta-curso' },
  { valor: 'charla', texto: 'Charla', clase: 'etiqueta-charla' },
  { valor: 'conferencia', texto: 'Conferencia', clase: 'etiqueta-conferencia' },
]

// ---------- Datos simulados (ficticios) ----------
const cursos: Curso[] = [
  { id: 'cu1', tipo: 'curso', titulo: 'Finanzas para tu negocio', descripcion: 'Aprende a llevar las cuentas de tu negocio, separar gastos y fijar precios.', fecha: '2026-12-12', hora: '17:00', lugar: 'Sala 2, Los Mochis', cupo: 25, inscritas: 18 },
  { id: 'cu2', tipo: 'charla', titulo: 'Conoce tus derechos', descripcion: 'Charla con el área jurídica sobre derechos y trámites básicos.', fecha: '2026-12-15', hora: '11:00', lugar: 'En línea', cupo: 100, inscritas: 42, inscrita: true },
  { id: 'cu3', tipo: 'conferencia', titulo: 'Empleo y emprendimiento', descripcion: 'Empresas aliadas comparten oportunidades de trabajo en Ahome.', fecha: '2026-12-18', hora: '16:00', lugar: 'Auditorio municipal', cupo: 200, inscritas: 87 },
  { id: 'cu4', tipo: 'curso', titulo: 'Repostería básica', descripcion: 'Curso práctico de cuatro sesiones para emprender desde casa.', fecha: '2027-01-08', hora: '10:00', lugar: 'Centro comunitario Jiquilpan', cupo: 15, inscritas: 15 },
]
const vacantes: Vacante[] = [
  { id: 'va1', puesto: 'Auxiliar administrativa', empresa: 'Empresa aliada A', sector: 'Servicios', horario: 'Matutino', tipoEmpleo: 'Tiempo completo', ubicacion: 'Los Mochis', descripcion: 'Apoyo en captura, archivo y atención a clientes.', requisitos: ['Secundaria terminada', 'Manejo básico de computadora'], publicadaEn: '2026-11-18', actualizada: '2026-11-24', postulaciones: 6 },
  { id: 'va2', puesto: 'Cajera', empresa: 'Empresa aliada B', sector: 'Comercio', horario: 'Vespertino', tipoEmpleo: 'Medio tiempo', ubicacion: 'Los Mochis', descripcion: 'Cobro en caja y acomodo de mercancía.', requisitos: ['Mayor de 18 años'], publicadaEn: '2026-11-19', actualizada: '2026-11-22', postulaciones: 11 },
  { id: 'va3', puesto: 'Empacadora', empresa: 'Empresa aliada C', sector: 'Agroindustria', horario: 'Matutino', tipoEmpleo: 'Temporal', ubicacion: 'Higuera de Zaragoza', descripcion: 'Selección y empaque de hortaliza en temporada.', requisitos: ['Disponibilidad de horario'], publicadaEn: '2026-11-17', actualizada: '2026-11-20', postulaciones: 3 },
]
const visitas: Visita[] = [
  { id: 'vi1', sector: 'Sector 12', fecha: '2026-12-03', tema: 'Prevención de la violencia en el noviazgo', responsable: 'Capacitación', estado: 'planeada' },
  { id: 'vi2', sector: 'Sector 7', fecha: '2026-12-10', tema: 'Taller de autonomía económica', responsable: 'Capacitación', estado: 'planeada' },
  { id: 'vi3', sector: 'Sector 3', fecha: '2026-11-19', tema: 'Conoce tus derechos', responsable: 'Capacitación', estado: 'realizada' },
]
const asistencia: Record<string, Asistente[]> = {
  cu1: Array.from({ length: 8 }, (_, i) => ({ id: `as${i}`, alias: `Participante ${String(i + 1).padStart(2, '0')}`, presente: i % 3 !== 0 })),
}

// ---------- Cursos ----------
/** GET /courses?type= */
export function useCursos(tipo?: TipoEvento) {
  return useQuery({
    queryKey: ['cursos', tipo ?? 'todos'],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/courses${consulta({ type: tipo })}`, simulado: () => cursos.filter((c) => !tipo || c.tipo === tipo) }),
  })
}

/** GET /courses/{id} */
export function useCurso(id: string) {
  return useQuery({
    queryKey: ['curso', id],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/courses/${id}`, simulado: () => cursos.find((c) => c.id === id) ?? null }),
  })
}

/** POST /courses (Capacitación) */
export function useCrearCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nuevo: Omit<Curso, 'id' | 'inscritas'>) =>
      pedir<Curso>({
        metodo: 'POST',
        ruta: '/courses',
        cuerpo: nuevo,
        simulado: () => {
          const c = { ...nuevo, id: `cu${cursos.length + 1}`, inscritas: 0 }
          cursos.push(c)
          return c
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos'] }),
  })
}

/** POST /courses/{id}/enrollments (usuaria) */
export function useInscribirme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/courses/${id}/enrollments`,
        simulado: () => {
          const c = cursos.find((x) => x.id === id)
          if (c && !c.inscrita) {
            c.inscrita = true
            c.inscritas += 1
          }
        },
      }),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['cursos'] })
      void qc.invalidateQueries({ queryKey: ['curso', id] })
    },
  })
}

/** GET /courses/{id}/attendance */
export function useAsistencia(id: string) {
  return useQuery({
    queryKey: ['asistencia', id],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/courses/${id}/attendance`, simulado: () => asistencia[id] ?? [] }),
  })
}

/** PUT /courses/{id}/attendance */
export function useGuardarAsistencia(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lista: Asistente[]) =>
      pedir<void>({ metodo: 'PUT', ruta: `/courses/${id}/attendance`, cuerpo: lista.map(({ id, presente }) => ({ enrollmentId: id, presente })), simulado: () => void (asistencia[id] = lista) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia', id] }),
  })
}

// ---------- Bolsa de trabajo ----------
export type FiltrosVacantes = { sector?: string; horario?: string; tipoEmpleo?: string; ubicacion?: string }

/** GET /jobs?sector=&schedule=&type=&location= */
export function useVacantes(f: FiltrosVacantes = {}) {
  return useQuery({
    queryKey: ['vacantes', f],
    queryFn: () =>
      pedir({
        metodo: 'GET',
        ruta: `/jobs${consulta({ sector: f.sector, schedule: f.horario, type: f.tipoEmpleo, location: f.ubicacion })}`,
        simulado: () =>
          vacantes.filter(
            (v) => (!f.sector || v.sector === f.sector) && (!f.horario || v.horario === f.horario) && (!f.tipoEmpleo || v.tipoEmpleo === f.tipoEmpleo) && (!f.ubicacion || v.ubicacion === f.ubicacion),
          ),
      }),
  })
}

export const OPCIONES_VACANTE = {
  sector: ['Servicios', 'Comercio', 'Agroindustria', 'Salud', 'Educación'],
  horario: ['Matutino', 'Vespertino', 'Mixto'],
  tipoEmpleo: ['Tiempo completo', 'Medio tiempo', 'Temporal'],
  ubicacion: ['Los Mochis', 'Higuera de Zaragoza', 'Topolobampo', 'Ahome'],
}

/** GET /jobs/{id} */
export function useVacante(id: string) {
  return useQuery({
    queryKey: ['vacante', id],
    queryFn: () => pedir({ metodo: 'GET', ruta: `/jobs/${id}`, simulado: () => vacantes.find((v) => v.id === id) ?? null }),
  })
}

/** POST /jobs (Capacitación, supuesto 4) */
export function useCrearVacante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nueva: Omit<Vacante, 'id' | 'publicadaEn' | 'actualizada' | 'postulaciones'>) =>
      pedir<Vacante>({
        metodo: 'POST',
        ruta: '/jobs',
        cuerpo: nueva,
        simulado: () => {
          const hoy = new Date().toISOString().slice(0, 10)
          const v = { ...nueva, id: `va${vacantes.length + 1}`, publicadaEn: hoy, actualizada: hoy, postulaciones: 0 }
          vacantes.unshift(v)
          return v
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vacantes'] }),
  })
}

/** POST /jobs/{id}/applications — la Secretaría hace de puente con la empresa (supuesto 5). */
export function usePostularme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      pedir<void>({
        metodo: 'POST',
        ruta: `/jobs/${id}/applications`,
        simulado: () => {
          const v = vacantes.find((x) => x.id === id)
          if (v) v.postulada = true
        },
      }),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['vacante', id] })
      void qc.invalidateQueries({ queryKey: ['vacantes'] })
    },
  })
}

// ---------- Planeación de visitas ----------
/** GET /outreach-visits */
export function useVisitas() {
  return useQuery({ queryKey: ['visitas'], queryFn: () => pedir({ metodo: 'GET', ruta: '/outreach-visits', simulado: () => visitas }) })
}

/** POST /outreach-visits */
export function useCrearVisita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: Omit<Visita, 'id' | 'estado' | 'responsable'>) =>
      pedir<Visita>({
        metodo: 'POST',
        ruta: '/outreach-visits',
        cuerpo: v,
        simulado: () => {
          const n: Visita = { ...v, id: `vi${visitas.length + 1}`, estado: 'planeada', responsable: 'Capacitación' }
          visitas.push(n)
          return n
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitas'] }),
  })
}

// ---------- Utilidades de presentación ----------
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
export function partesFecha(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return { dia: d ?? 1, mes: MESES[(m ?? 1) - 1] ?? '', anio: a ?? 0 }
}
/** Formato corto para tarjetas y encabezados: "19 de nov". */
export function fechaCorta(iso: string) {
  const { dia, mes } = partesFecha(iso)
  return `${dia} de ${mes.toLowerCase()}`
}
export function fechaLarga(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}
export function hora12(h: string) {
  const [hh = 0, mm = 0] = h.split(':').map(Number)
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`
}
