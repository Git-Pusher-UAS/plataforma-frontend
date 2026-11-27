import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { areaDeDepartamento, departamentoDeRol, mapaDepartamentos, mapaPropositos, useCatalogos } from '@/api/catalogos'
import { ApiError } from '@/api/client'
import { useSesion, type Rol } from '@/features/identidad/sesion'
import { consulta, esModoSimulado, formatIfMatch, pedir } from '@/shared/lib/servicio'

export type Area = 'trabajo-social' | 'psicologia' | 'juridico'
export type EstadoExpediente = 'abierto' | 'en_seguimiento' | 'cerrado'
export const ESTADOS: { valor: EstadoExpediente; texto: string }[] = [
  { valor: 'abierto', texto: 'Abierto' },
  { valor: 'en_seguimiento', texto: 'En seguimiento' },
  { valor: 'cerrado', texto: 'Cerrado' },
]
export const textoEstado = (e: EstadoExpediente) => ESTADOS.find((x) => x.valor === e)?.texto ?? e

export const ORIGENES = ['Presencial', 'Canalización de otra institución', 'Línea de atención 24/7', 'Patrulla de género o 911', 'Autorregistro en la plataforma']

export type ResumenExpediente = { id: string; alias: string; estado: EstadoExpediente; areas: Area[]; abierto: string; actualizado: string }
export type CampoOculto = 'curp' | 'domicilio' | 'telefono'
export type Expediente = ResumenExpediente & {
  origen: string
  edad: number | null
  sector: string
  ocultos: Record<CampoOculto, string> // siempre enmascarados
  version: string
}
export type Evento = { id: string; fecha: string; area: Area; texto: string }
export type Nota = { id: string; area: Area; autor: string; horaDeclarada: string; registrada: string; texto: string; corrigeA?: string }
export type Consentimiento = {
  id: string
  consentId?: string
  propositoId?: string
  finalidad: string
  decision: 'aceptado' | 'rechazado' | 'revocado'
  fecha: string
  version: string
  revocable: boolean
}

type RawSummary = {
  id: string
  alias: string
  estado: EstadoExpediente
  origenContacto: string
  createdAt: string
  updatedAt: string
  versionTag: string
  areas?: Area[]
  edad?: number | null
  sector?: string
  ocultos?: Record<CampoOculto, string>
}

type RawTimelineItem = {
  id: string
  tipo: string
  departamentoId?: string | null
  actorId: string
  resumen: string
  ocurridoEn: string
}

type RawNoteView = {
  id: string
  episodioId: string
  autorId: string
  autor?: string
  texto: string
  ocurridoEn: string
  corrigeNotaId?: string | null
  createdAt: string
}

type RawConsentView = {
  consentId: string
  propositoId: string
  decision: 'aceptado' | 'rechazado'
  vigente: boolean
  revocado: boolean
  decididoEn: string
  revocadoEn?: string | null
}

// ---------- Datos simulados (ficticios) ----------
const hoy = '2026-11-25'
const expedientes: Expediente[] = [
  { id: 'EXP-0412', alias: 'Caso Jacaranda', estado: 'en_seguimiento', areas: ['trabajo-social', 'psicologia'], abierto: '2026-10-02', actualizado: '2026-11-24', origen: 'Presencial', edad: 34, sector: 'Sector 12', ocultos: { curp: '•••• ••••••••• 07', domicilio: 'Col. •••••, Los Mochis', telefono: '•• •••• 81' }, version: 'v3' },
  { id: 'EXP-0418', alias: 'Caso Bugambilia', estado: 'abierto', areas: ['trabajo-social', 'juridico'], abierto: '2026-11-10', actualizado: '2026-11-22', origen: 'Línea de atención 24/7', edad: 27, sector: 'Sector 7', ocultos: { curp: '•••• ••••••••• 12', domicilio: 'Col. •••••, Ahome', telefono: '•• •••• 09' }, version: 'v1' },
  { id: 'EXP-0399', alias: 'Caso Guamúchil', estado: 'cerrado', areas: ['trabajo-social', 'psicologia', 'juridico'], abierto: '2026-08-14', actualizado: '2026-11-01', origen: 'Canalización de otra institución', edad: 45, sector: 'Sector 3', ocultos: { curp: '•••• ••••••••• 33', domicilio: 'Col. •••••, Topolobampo', telefono: '•• •••• 50' }, version: 'v7' },
  { id: 'EXP-0421', alias: 'Caso Tabachín', estado: 'abierto', areas: ['trabajo-social'], abierto: '2026-11-21', actualizado: hoy, origen: 'Autorregistro en la plataforma', edad: 19, sector: 'Sector 12', ocultos: { curp: '•••• ••••••••• 98', domicilio: 'Col. •••••, Los Mochis', telefono: '•• •••• 66' }, version: 'v1' },
]
const eventos: Evento[] = [
  { id: 'e1', fecha: '2026-10-02T10:15', area: 'trabajo-social', texto: 'Se abrió el expediente (origen presencial).' },
  { id: 'e2', fecha: '2026-10-02T10:40', area: 'trabajo-social', texto: 'Consentimiento registrado: aceptado.' },
  { id: 'e3', fecha: '2026-10-05T12:00', area: 'trabajo-social', texto: 'Canalización a Psicología aceptada.' },
  { id: 'e4', fecha: '2026-10-09T09:30', area: 'psicologia', texto: 'Primera sesión de seguimiento.' },
  { id: 'e5', fecha: '2026-11-24T16:10', area: 'psicologia', texto: 'Nota de seguimiento agregada.' },
]
const notas: Nota[] = [
  { id: 'n1', area: 'psicologia', autor: 'Ana Castro', horaDeclarada: '2026-10-09T09:30', registrada: '2026-10-09T10:02', texto: 'Primera sesión. Se acuerda plan de acompañamiento semanal.' },
  { id: 'n2', area: 'psicologia', autor: 'Ana Castro', horaDeclarada: '2026-11-24T16:00', registrada: '2026-11-24T16:10', texto: 'Seguimiento. Avances en red de apoyo.' },
  { id: 'n3', area: 'trabajo-social', autor: 'Laura Méndez', horaDeclarada: '2026-10-02T10:15', registrada: '2026-10-02T10:20', texto: 'Entrevista inicial y orientación sobre servicios.' },
  { id: 'n4', area: 'juridico', autor: 'Rosa Inzunza', horaDeclarada: '2026-11-12T11:00', registrada: '2026-11-12T11:30', texto: 'Asesoría sobre trámites de pensión alimenticia.' },
]
const consentimientos: Consentimiento[] = [
  { id: 'cs1', finalidad: 'Atención y seguimiento', decision: 'aceptado', fecha: '2026-10-02', version: 'Aviso 2026-1', revocable: false },
  { id: 'cs2', finalidad: 'Encuestas de seguimiento', decision: 'aceptado', fecha: '2026-10-02', version: 'Aviso 2026-1', revocable: true },
  { id: 'cs3', finalidad: 'Estadística anonimizada', decision: 'rechazado', fecha: '2026-10-02', version: 'Aviso 2026-1', revocable: true },
]

/** El área propia de un rol de atención. Las otras no se anuncian. */
export const areaDeRol = (rol: Rol): Area | null => (rol === 'trabajo-social' || rol === 'psicologia' || rol === 'juridico' ? rol : null)

// ---------- Lista y detalle ----------
export type FiltrosExpedientes = { estado?: EstadoExpediente; desde?: string; hasta?: string }

/** GET /case-files?estado=&limit= (solo asignados al actor; sin búsqueda por nombre ni CURP). */
export function useExpedientes(rol: Rol, f: FiltrosExpedientes) {
  const area = areaDeRol(rol)
  return useQuery({
    queryKey: ['expedientes', rol, f],
    queryFn: () =>
      pedir<ResumenExpediente[]>({
        metodo: 'GET',
        ruta: `/case-files${consulta({ estado: f.estado, limit: 20 })}`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawSummary[])
            : ((raw as { items?: RawSummary[] } | null)?.items ?? [])
          const mapped: ResumenExpediente[] = items.map((s) => ({
            id: s.id,
            alias: s.alias,
            estado: s.estado,
            // TODO(backend): remove fallback once GET /case-files returns areas
            areas: s.areas && s.areas.length > 0 ? s.areas : area ? [area] : [],
            abierto: s.createdAt.slice(0, 10),
            actualizado: s.updatedAt.slice(0, 10),
          }))
          // TODO(backend): remove client-side date filter once GET /case-files parses from/to
          return mapped.filter((e) => (!f.desde || e.abierto >= f.desde) && (!f.hasta || e.abierto <= f.hasta))
        },
        simulado: () =>
          expedientes
            .filter((e) => area && e.areas.includes(area))
            .filter((e) => (!f.estado || e.estado === f.estado) && (!f.desde || e.abierto >= f.desde) && (!f.hasta || e.abierto <= f.hasta))
            .map(({ id, alias, estado, areas, abierto, actualizado }) => ({ id, alias, estado, areas, abierto, actualizado })),
      }),
  })
}

/** GET /case-files/{recordId}. Ajeno o inexistente responden igual: null → P-90. */
export function useExpediente(id: string, rol: Rol) {
  const area = areaDeRol(rol)
  const catalogos = useCatalogos(Boolean(id))
  return useQuery({
    queryKey: ['expediente', id, rol],
    queryFn: async () => {
      try {
        return await pedir<Expediente | null>({
          metodo: 'GET',
          ruta: `/case-files/${id}`,
          adaptar: (raw) => {
            const s = raw as RawSummary
            const origenNombre =
              catalogos.data?.origenesContacto.find((o) => o.codigo === s.origenContacto)?.nombre ?? s.origenContacto
            return {
              id: s.id,
              alias: s.alias,
              estado: s.estado,
              // TODO(backend): remove fallbacks once GET /case-files/:id returns areas, sector, edad, and ocultos
              areas: s.areas && s.areas.length > 0 ? s.areas : area ? [area] : [],
              abierto: s.createdAt.slice(0, 10),
              actualizado: s.updatedAt.slice(0, 10),
              origen: origenNombre,
              edad: s.edad ?? null,
              sector: s.sector ?? 'Sin especificar',
              ocultos: s.ocultos ?? {
                curp: '•••• ••••••••• ••',
                domicilio: '••••••••',
                telefono: '•• •••• ••',
              },
              version: s.versionTag,
            }
          },
          simulado: () => expedientes.find((e) => e.id === id && area && e.areas.includes(area)) ?? null,
        })
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },
  })
}

/** PATCH /case-files/{recordId} con If-Match (cambio de estado; reabrir exige motivo). */
export function useCambiarEstado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { estado: EstadoExpediente; version: string; motivo?: string }) =>
      pedir<void>({
        metodo: 'PATCH',
        ruta: `/case-files/${id}`,
        headers: { 'If-Match': formatIfMatch(c.version) },
        cuerpo: { estado: c.estado, ...(c.motivo ? { motivo: c.motivo } : {}) },
        simulado: () => {
          const e = expedientes.find((x) => x.id === id)
          if (e) {
            e.estado = c.estado
            e.version = `v${Number(e.version.slice(1)) + 1}`
          }
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['expediente', id] })
      void qc.invalidateQueries({ queryKey: ['expedientes'] })
    },
  })
}

/** POST /case-files/{recordId}/disclosures — revela un dato oculto unos segundos; queda en bitácora. */
export function useRevelarDato(id: string) {
  return useMutation({
    mutationFn: (c: { campo: CampoOculto; motivo: string }) =>
      pedir<{ valor: string }>({
        metodo: 'POST',
        ruta: `/case-files/${id}/disclosures`,
        cuerpo: { campo: c.campo, motivo: c.motivo },
        simulado: () => ({ valor: { curp: 'XEXX010101MSLXXX07', domicilio: 'Calle Ficticia 123, Los Mochis', telefono: '668 000 0081' }[c.campo] }),
      }),
  })
}

// ---------- Alta ----------
/** POST /case-files/duplicate-checks (la CURP va en el cuerpo, nunca en la URL). */
export function useComprobarCurp() {
  return useMutation({
    mutationFn: (curp: string) =>
      pedir<{ exists: boolean; department?: string; linkToken?: string }>({
        metodo: 'POST',
        ruta: '/case-files/duplicate-checks',
        cuerpo: { curp },
        // Demostración: las CURP que terminan en 0 «ya existen».
        simulado: () => (curp.endsWith('0') ? { exists: true, department: 'Trabajo social', linkToken: 'lt-1' } : { exists: false }),
      }),
  })
}

export type NuevoExpediente = {
  alias: string
  curp: string
  nombre: string
  fechaNacimiento: string
  telefono?: string
  sectorId: string
  origenContacto: string
  propositoIds: string[]
  consentimiento: 'aceptado' | 'rechazado'
}

/** POST /case-files (alta atómica: persona, origen y consentimiento; con X-Operation-Id). */
export function useCrearExpediente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: NuevoExpediente & { operationId: string }) =>
      pedir<{ id: string }>({
        metodo: 'POST',
        ruta: '/case-files',
        headers: { 'X-Operation-Id': c.operationId },
        cuerpo: {
          alias: c.alias,
          nombre: c.nombre,
          curp: c.curp,
          fechaNacimiento: c.fechaNacimiento,
          ...(c.telefono ? { telefono: c.telefono } : {}),
          sectorId: c.sectorId,
          origenContacto: c.origenContacto,
          consentimiento: {
            decision: c.consentimiento,
            modalidad: 'presencial',
            propositoIds: c.propositoIds,
            capturadoEn: new Date().toISOString(),
          },
        },
        adaptar: (raw) => ({ id: (raw as { id: string }).id }),
        simulado: () => {
          const id = `EXP-0${430 + expedientes.length}`
          const nacimiento = new Date(`${c.fechaNacimiento}T12:00:00`)
          const edad = Number.isNaN(nacimiento.getTime()) ? null : Math.max(0, new Date().getFullYear() - nacimiento.getFullYear())
          expedientes.unshift({
            id,
            alias: c.alias || 'Caso nuevo',
            estado: 'abierto',
            areas: ['trabajo-social'],
            abierto: hoy,
            actualizado: hoy,
            origen: c.origenContacto,
            edad,
            sector: c.sectorId,
            ocultos: { curp: `•••• ••••••••• ${c.curp.slice(-2)}`, domicilio: 'Col. •••••', telefono: `•• •••• ${(c.telefono ?? '').slice(-2)}` },
            version: 'v1',
          })
          return { id }
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expedientes'] }),
  })
}

/** POST /case-access-requests — pide acceso a Administración (D-04). */
export function useSolicitarAcceso() {
  return useMutation({
    mutationFn: (c: { linkToken: string; motivo: string }) =>
      pedir<{ requestId: string; estado: 'pendiente' }>({ metodo: 'POST', ruta: '/case-access-requests', cuerpo: c, simulado: () => ({ requestId: 'sol-9', estado: 'pendiente' }) }),
  })
}

// ---------- Pestañas del expediente ----------
/** GET /case-files/{recordId}/timeline — solo eventos de las áreas del actor. */
export function useLineaTiempo(id: string, area: Area) {
  const catalogos = useCatalogos(Boolean(id))
  const deps = mapaDepartamentos(catalogos.data)
  return useQuery({
    queryKey: ['linea', id, area],
    queryFn: () =>
      pedir<Evento[]>({
        metodo: 'GET',
        ruta: `/case-files/${id}/timeline`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawTimelineItem[])
            : ((raw as { items?: RawTimelineItem[] } | null)?.items ?? [])
          return items.map((it) => ({
            id: it.id,
            fecha: it.ocurridoEn,
            area: (it.departamentoId ? areaDeDepartamento(deps.get(it.departamentoId)) : null) ?? area,
            texto: it.resumen,
          }))
        },
        simulado: () => (id === 'EXP-0412' ? eventos.filter((e) => e.area === area || e.area === 'trabajo-social') : []),
      }),
  })
}

function resolverDepartamentoId(personalDeptId: string | undefined, personalRol: Rol | undefined, area: Area, catalogos: ReturnType<typeof useCatalogos>['data']): string {
  if (personalDeptId && personalRol === area) return personalDeptId
  return departamentoDeRol(catalogos, area)?.id ?? area
}

/** GET /case-files/{recordId}/departments/{departmentId}/notes */
export function useNotas(id: string, area: Area) {
  const { personal } = useSesion()
  const catalogos = useCatalogos(Boolean(id))
  const departmentId = resolverDepartamentoId(personal?.departmentId, personal?.rol, area, catalogos.data)
  return useQuery({
    queryKey: ['notas', id, area, departmentId],
    enabled: Boolean(id) && (esModoSimulado() || Boolean(personal?.departmentId || catalogos.data)),
    queryFn: () =>
      pedir<Nota[]>({
        metodo: 'GET',
        ruta: `/case-files/${id}/departments/${departmentId}/notes`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawNoteView[])
            : ((raw as { items?: RawNoteView[] } | null)?.items ?? [])
          return items.map((n) => ({
            id: n.id,
            area,
            // TODO(backend): remove once NoteView returns autor display name
            autor: n.autor ?? (personal?.id && n.autorId === personal.id ? personal.nombre : 'Personal del área'),
            horaDeclarada: n.ocurridoEn,
            registrada: n.createdAt,
            texto: n.texto,
            corrigeA: n.corrigeNotaId ?? undefined,
          }))
        },
        simulado: () => notas.filter((n) => n.area === area),
      }),
  })
}

/** POST /case-files/{recordId}/departments/{departmentId}/notes (corrección = nota nueva con corrigeNotaId). */
export function useCrearNota(id: string, area: Area) {
  const qc = useQueryClient()
  const { personal } = useSesion()
  const catalogos = useCatalogos(Boolean(id))
  const departmentId = resolverDepartamentoId(personal?.departmentId, personal?.rol, area, catalogos.data)
  return useMutation({
    mutationFn: (c: { texto: string; horaDeclarada: string; corrigeA?: string; autor: string }) =>
      pedir<Nota>({
        metodo: 'POST',
        ruta: `/case-files/${id}/departments/${departmentId}/notes`,
        headers: { 'X-Operation-Id': crypto.randomUUID() },
        cuerpo: {
          texto: c.texto,
          ocurridoEn: new Date(c.horaDeclarada).toISOString(),
          ...(c.corrigeA ? { corrigeNotaId: c.corrigeA } : {}),
        },
        adaptar: (raw) => {
          const n = raw as RawNoteView
          return {
            id: n.id,
            area,
            autor: n.autor ?? c.autor,
            horaDeclarada: n.ocurridoEn,
            registrada: n.createdAt,
            texto: n.texto,
            corrigeA: n.corrigeNotaId ?? undefined,
          }
        },
        simulado: () => {
          const n: Nota = { id: `n${notas.length + 1}`, area, autor: c.autor, horaDeclarada: c.horaDeclarada, registrada: new Date().toISOString().slice(0, 16), texto: c.texto, corrigeA: c.corrigeA }
          notas.push(n)
          return n
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notas', id, area] }),
  })
}

/** GET /case-files/{recordId}/consents */
export function useConsentimientos(id: string) {
  const catalogos = useCatalogos(Boolean(id))
  const propositos = mapaPropositos(catalogos.data)
  return useQuery({
    queryKey: ['consentimientos', id],
    queryFn: () =>
      pedir<Consentimiento[]>({
        metodo: 'GET',
        ruta: `/case-files/${id}/consents`,
        adaptar: (raw) => {
          const items = Array.isArray(raw)
            ? (raw as RawConsentView[])
            : ((raw as { items?: RawConsentView[] } | null)?.items ?? [])
          return items.map((c) => {
            const prop = propositos.get(c.propositoId)
            return {
              id: `${c.consentId}:${c.propositoId}`,
              consentId: c.consentId,
              propositoId: c.propositoId,
              finalidad: prop?.descripcion ?? c.propositoId,
              decision: c.revocado ? 'revocado' : c.decision,
              fecha: c.decididoEn.slice(0, 10),
              // TODO(backend): remove once ConsentView returns aviso version
              version: 'Aviso vigente',
              revocable: Boolean(c.vigente && !c.revocado && (prop ? prop.opcional : true)),
            }
          })
        },
        simulado: () => consentimientos,
      }),
  })
}

/** POST /case-files/{recordId}/consents/{consentId}/revocations */
export function useRevocarConsentimiento(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (target: string | { consentId: string; propositoId: string }) => {
      const consentId = typeof target === 'string' ? target : target.consentId
      const propositoId = typeof target === 'string' ? target : target.propositoId
      return pedir<void>({
        metodo: 'POST',
        ruta: `/case-files/${id}/consents/${consentId}/revocations`,
        cuerpo: { propositoIds: [propositoId] },
        simulado: () => {
          const c = consentimientos.find((x) => x.id === consentId)
          if (c) consentimientos.push({ ...c, id: `cs${consentimientos.length + 1}`, decision: 'revocado', fecha: hoy, revocable: false })
          if (c) c.revocable = false
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consentimientos', id] }),
  })
}

// ---------- Borradores sin conexión (P-41) ----------
export type Borrador = { id: string; expediente: string; area: Area; horaDeclarada: string; estado: 'pendiente' | 'enviando' | 'bloqueada' | 'conflicto' | 'reintentable' }
const borradores: Borrador[] = [
  { id: 'b1', expediente: 'Caso Jacaranda', area: 'psicologia', horaDeclarada: '2026-11-25T09:10', estado: 'pendiente' },
  { id: 'b2', expediente: 'Caso Guamúchil', area: 'psicologia', horaDeclarada: '2026-11-24T18:30', estado: 'bloqueada' },
]

// shortcut: la cola real vive cifrada en IndexedDB (src/offline, con revisión de seguridad).
// Mientras no exista, se lee esta lista en memoria. No pasa por la API.
/** Lee la cola local de borradores. */
export function useBorradores() {
  return useQuery({ queryKey: ['borradores'], queryFn: async () => structuredClone(borradores) })
}

/** POST /notes/sync — envía hasta 20 borradores; cada uno se resuelve por separado. */
export function useSincronizar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      pedir<{ id: string; result: 'applied' | 'blocked' | 'conflict' | 'retryable' }[]>({
        metodo: 'POST',
        ruta: '/notes/sync',
        cuerpo: { notes: ids.map((operationId) => ({ operationId })) },
        simulado: () =>
          ids.map((id) => {
            const b = borradores.find((x) => x.id === id)
            if (b?.estado === 'bloqueada') return { id, result: 'blocked' as const }
            borradores.splice(borradores.findIndex((x) => x.id === id), 1)
            return { id, result: 'applied' as const }
          }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borradores'] }),
  })
}

export function useDescartarBorrador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => void borradores.splice(borradores.findIndex((x) => x.id === id), 1),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borradores'] }),
  })
}
