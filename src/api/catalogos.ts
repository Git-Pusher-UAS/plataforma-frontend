import { useQuery } from '@tanstack/react-query'
import type { Area } from '@/features/expedientes/api'
import type { Rol } from '@/features/identidad/sesion'
import { pedir } from '@/shared/lib/servicio'

export type DepartamentoCatalogo = { id: string; codigo: string; nombre: string }
export type RolCatalogo = { id: string; codigo: string; nombre: string }
export type SectorCatalogo = { id: string; nombre: string; tipo: string }
export type OpcionCatalogo = { codigo: string; nombre: string }
export type PropositoCatalogo = { id: string; codigo: string; descripcion: string; opcional: boolean }

export type Catalogos = {
  departamentos: DepartamentoCatalogo[]
  roles: RolCatalogo[]
  sectores: SectorCatalogo[]
  origenesContacto: OpcionCatalogo[]
  propositosConsentimiento: PropositoCatalogo[]
}

const CATALOGOS_SIMULADOS: Catalogos = {
  departamentos: [
    { id: 'dep-ts', codigo: 'TRABAJO_SOCIAL', nombre: 'Trabajo social' },
    { id: 'dep-ps', codigo: 'PSICOLOGIA', nombre: 'Psicología' },
    { id: 'dep-ju', codigo: 'JURIDICO', nombre: 'Jurídico' },
    { id: 'dep-ca', codigo: 'CAPACITACION', nombre: 'Capacitación' },
    { id: 'dep-si', codigo: 'SISTEMAS', nombre: 'Sistemas' },
  ],
  roles: [
    { id: 'rol-ts', codigo: 'TrabajoSocial', nombre: 'Trabajo Social' },
    { id: 'rol-ps', codigo: 'Psicología', nombre: 'Psicología' },
    { id: 'rol-ju', codigo: 'Jurídico', nombre: 'Jurídico' },
    { id: 'rol-ca', codigo: 'Capacitación', nombre: 'Capacitación' },
    { id: 'rol-ti', codigo: 'AdministradorTI', nombre: 'Administrador de TI' },
    { id: 'rol-co', codigo: 'Coordinación', nombre: 'Coordinación' },
    { id: 'rol-di', codigo: 'Dirección', nombre: 'Dirección' },
    { id: 'rol-aa', codigo: 'AdministraciónAnalítica', nombre: 'Administración Analítica' },
  ],
  sectores: [
    { id: 'sec-12', nombre: 'Sector 12', tipo: 'sector' },
    { id: 'sec-7', nombre: 'Sector 7', tipo: 'sector' },
    { id: 'sec-3', nombre: 'Sector 3', tipo: 'sector' },
  ],
  origenesContacto: [
    { codigo: 'presencial', nombre: 'Presencial' },
    { codigo: 'institucion', nombre: 'Institución' },
    { codigo: 'linea_atencion', nombre: 'Línea de atención' },
    { codigo: 'patrulla_genero', nombre: 'Patrulla de género' },
    { codigo: 'emergencia_referida', nombre: 'Emergencia referida' },
  ],
  propositosConsentimiento: [
    { id: 'prop-atencion', codigo: 'atencion', descripcion: 'Atención y seguimiento', opcional: false },
    { id: 'prop-encuestas', codigo: 'encuestas', descripcion: 'Encuestas de seguimiento', opcional: true },
    { id: 'prop-estadistica', codigo: 'estadistica', descripcion: 'Estadística anonimizada', opcional: true },
  ],
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim()
}

export function areaDeDepartamento(dep?: Pick<DepartamentoCatalogo, 'codigo' | 'nombre'>): Area | null {
  if (!dep) return null
  const clave = normalizar(dep.codigo || dep.nombre)
  if (clave.includes('trabajosocial') || clave === 'ts') return 'trabajo-social'
  if (clave.includes('psicologia')) return 'psicologia'
  if (clave.includes('juridico')) return 'juridico'
  return null
}

const CLAVES_DEP_POR_ROL: Record<Rol, string[]> = {
  'trabajo-social': ['trabajosocial', 'ts'],
  psicologia: ['psicologia'],
  juridico: ['juridico'],
  capacitacion: ['capacitacion'],
  administracion: ['administracion', 'coordinacion', 'direccion', 'sistemas'],
}

export function departamentoDeRol(catalogos: Catalogos | undefined, rol: Rol): DepartamentoCatalogo | undefined {
  if (!catalogos) return undefined
  const candidatos = CLAVES_DEP_POR_ROL[rol]
  return (
    catalogos.departamentos.find((d) => {
      const clave = normalizar(d.codigo || d.nombre)
      return candidatos.some((c) => clave.includes(c))
    }) ?? catalogos.departamentos[0]
  )
}

export function mapaDepartamentos(catalogos: Catalogos | undefined): Map<string, DepartamentoCatalogo> {
  const mapa = new Map<string, DepartamentoCatalogo>()
  for (const d of catalogos?.departamentos ?? []) mapa.set(d.id, d)
  return mapa
}

export function mapaPropositos(catalogos: Catalogos | undefined): Map<string, PropositoCatalogo> {
  const mapa = new Map<string, PropositoCatalogo>()
  for (const p of catalogos?.propositosConsentimiento ?? []) mapa.set(p.id, p)
  return mapa
}

/** GET /catalogs — catálogos activos (departamentos, roles, sectores, orígenes, finalidades). */
export function useCatalogos(enabled = true) {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: () =>
      pedir<Catalogos>({
        metodo: 'GET',
        ruta: '/catalogs',
        simulado: () => CATALOGOS_SIMULADOS,
      }),
    staleTime: 60 * 60_000,
    enabled,
  })
}
