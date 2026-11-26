import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Rol = 'trabajo-social' | 'psicologia' | 'juridico' | 'capacitacion' | 'administracion'

export const ROLES: { valor: Rol; texto: string; clase: string }[] = [
  { valor: 'trabajo-social', texto: 'Trabajo social', clase: 'etiqueta-trabajo-social' },
  { valor: 'psicologia', texto: 'Psicología', clase: 'etiqueta-psicologia' },
  { valor: 'juridico', texto: 'Jurídico', clase: 'etiqueta-juridico' },
  { valor: 'capacitacion', texto: 'Capacitación', clase: 'etiqueta-capacitacion' },
  { valor: 'administracion', texto: 'Administración', clase: 'etiqueta-administracion' },
]

export const textoRol = (rol: Rol) => ROLES.find((r) => r.valor === rol)?.texto ?? rol
export const esAtencion = (rol: Rol) => rol === 'trabajo-social' || rol === 'psicologia' || rol === 'juridico'

export type Personal = { usuario: string; nombre: string; rol: Rol }
export type Usuaria = { alias: string }

type Sesion = {
  personal: Personal | null
  usuaria: Usuaria | null
  /** Usuario que pasó la contraseña y aún no el segundo factor (nunca entra a pantallas de negocio). */
  preautenticado: string | null
  iniciarPreautenticacion: (usuario: string | null) => void
  iniciarPersonal: (p: Personal) => void
  iniciarUsuaria: (u: Usuaria) => void
  cerrar: () => void
}

const Contexto = createContext<Sesion | null>(null)

// La sesión vive solo en memoria: al recargar la página se pide entrar de nuevo.
// Con el backend, la fuente de verdad será la cookie HttpOnly y GET /users/me.
export function SesionProvider({ children, inicial }: { children: ReactNode; inicial?: Partial<Pick<Sesion, 'personal' | 'usuaria'>> }) {
  const [personal, setPersonal] = useState<Personal | null>(inicial?.personal ?? null)
  const [usuaria, setUsuaria] = useState<Usuaria | null>(inicial?.usuaria ?? null)
  const [preautenticado, setPre] = useState<string | null>(null)

  const valor = useMemo<Sesion>(
    () => ({
      personal,
      usuaria,
      preautenticado,
      iniciarPreautenticacion: setPre,
      iniciarPersonal: (p) => {
        setPre(null)
        setPersonal(p)
      },
      iniciarUsuaria: setUsuaria,
      cerrar: () => {
        setPersonal(null)
        setUsuaria(null)
        setPre(null)
      },
    }),
    [personal, usuaria, preautenticado],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): Sesion {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return s
}
