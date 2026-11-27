import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import {
  OPCIONES_VACANTE,
  TEXTO_EMPRESA,
  TEXTO_POSTULACION,
  TEXTO_VACANTE,
  type DatosVacante,
  type EstadoEmpresa,
  type EstadoPostulacion,
  type EstadoVacante,
  type Postulacion,
} from '@/features/bolsa/api'

export function ChipPostulacion({ estado }: { estado: EstadoPostulacion }) {
  return <span className={`estado-chip estado-chip-${estado}`}>{TEXTO_POSTULACION[estado]}</span>
}
export function ChipVacante({ estado }: { estado: EstadoVacante }) {
  return <span className={`estado-chip estado-chip-v-${estado}`}>{TEXTO_VACANTE[estado]}</span>
}
export function ChipEmpresa({ estado }: { estado: EstadoEmpresa }) {
  return <span className={`estado-chip estado-chip-e-${estado}`}>{TEXTO_EMPRESA[estado]}</span>
}

export function Volver({ a, texto }: { a: string; texto: string }) {
  return (
    <Link to={a} className="enlace-volver">
      <ArrowLeft size={18} aria-hidden="true" /> {texto}
    </Link>
  )
}

const PASOS: { estado: EstadoPostulacion; texto: string }[] = [
  { estado: 'enviada', texto: 'Enviada' },
  { estado: 'en_revision', texto: 'En revisión' },
  { estado: 'entrevista', texto: 'Entrevista' },
]

/** Avance de una postulación en 4 pasos; el último dice el resultado. */
export function AvancePostulacion({ p }: { p: Postulacion }) {
  const pasados = new Set(p.historial.map((h) => h.estado))
  const final = p.estado === 'aceptada' || p.estado === 'no_seleccionada' || p.estado === 'retirada'
  return (
    <ol className="pasos avance-postulacion" aria-label="Avance de tu postulación">
      {PASOS.map((s) => (
        <li key={s.estado} aria-current={p.estado === s.estado ? 'step' : undefined} className={pasados.has(s.estado) ? 'hecho' : undefined}>
          {s.texto}
        </li>
      ))}
      <li aria-current={final ? 'step' : undefined}>{final ? TEXTO_POSTULACION[p.estado] : 'Resultado'}</li>
    </ol>
  )
}

/** Botones tocables de opción única (más fáciles que un select en celular). */
export function OpcionesUnicas({ nombre, opciones, valor, onCambio, leyenda }: { nombre: string; opciones: readonly string[]; valor: string; onCambio: (v: string) => void; leyenda: ReactNode }) {
  return (
    <fieldset className="grupo-opciones">
      <legend>{leyenda}</legend>
      {opciones.map((o) => (
        <label key={o} className="opcion">
          <input type="radio" name={nombre} value={o} checked={valor === o} onChange={() => onCambio(o)} /> {o}
        </label>
      ))}
    </fieldset>
  )
}

/** Chips de selección múltiple. */
export function OpcionesMultiples({ opciones, valor, onCambio, etiqueta }: { opciones: readonly string[]; valor: string[]; onCambio: (v: string[]) => void; etiqueta: string }) {
  const alternar = (o: string) => onCambio(valor.includes(o) ? valor.filter((x) => x !== o) : [...valor, o])
  return (
    <div className="fila-chips" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o} type="button" className="chip chip-boton" aria-pressed={valor.includes(o)} onClick={() => alternar(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export const VACANTE_VACIA: DatosVacante = {
  puesto: '',
  sector: OPCIONES_VACANTE.sector[0]!,
  horario: OPCIONES_VACANTE.horario[0]!,
  tipoEmpleo: OPCIONES_VACANTE.tipoEmpleo[0]!,
  ubicacion: OPCIONES_VACANTE.ubicacion[0]!,
  sueldo: '',
  descripcion: '',
  requisitos: [],
}

/**
 * Formulario de vacante para empresa y Capacitación. Solo 3 campos de texto obligatorios
 * (puesto, descripción) y el resto con opciones; sueldo y requisitos son opcionales.
 */
export function FormVacante({
  inicial = VACANTE_VACIA,
  antes,
  enviando,
  textoEnviar,
  cancelarA,
  onEnviar,
}: {
  inicial?: DatosVacante
  antes?: ReactNode
  enviando: boolean
  textoEnviar: string
  cancelarA: string
  onEnviar: (d: DatosVacante) => void
}) {
  const [f, setF] = useState({ ...inicial, requisitos: inicial.requisitos.join('\n') })
  const sel = (k: keyof typeof OPCIONES_VACANTE, texto: string) => (
    <div className="campo">
      <label htmlFor={`v-${k}`}>{texto}</label>
      <select id={`v-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        {OPCIONES_VACANTE[k].map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onEnviar({
      ...f,
      puesto: f.puesto.trim(),
      sueldo: f.sueldo?.trim() || undefined,
      descripcion: f.descripcion.trim(),
      requisitos: f.requisitos.split('\n').map((r) => r.trim()).filter(Boolean),
    })
  }
  return (
    <form className="tarjeta pila" onSubmit={enviar}>
      {antes}
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="v-puesto">Puesto</label>
          <input id="v-puesto" value={f.puesto} onChange={(e) => setF({ ...f, puesto: e.target.value })} required maxLength={80} placeholder="Ej. Cajera" />
        </div>
        <div className="campo">
          <label htmlFor="v-sueldo">Sueldo (opcional)</label>
          <input id="v-sueldo" value={f.sueldo ?? ''} onChange={(e) => setF({ ...f, sueldo: e.target.value })} maxLength={40} placeholder="Ej. $8,000 al mes" />
          <span className="campo-ayuda">Las vacantes con sueldo reciben más postulaciones.</span>
        </div>
      </div>
      <div className="rejilla-2">
        {sel('sector', 'Sector')}
        {sel('horario', 'Horario')}
        {sel('tipoEmpleo', 'Tipo de empleo')}
        {sel('ubicacion', 'Ubicación')}
      </div>
      <div className="campo">
        <label htmlFor="v-desc">¿Qué hará la persona?</label>
        <textarea id="v-desc" className="area" rows={3} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} required maxLength={600} />
        <span className="campo-ayuda">Dos o tres frases sencillas.</span>
      </div>
      <div className="campo">
        <label htmlFor="v-req">Requisitos (opcional)</label>
        <textarea id="v-req" className="area" rows={3} value={f.requisitos} onChange={(e) => setF({ ...f, requisitos: e.target.value })} />
        <span className="campo-ayuda">Uno por renglón. Pide solo lo indispensable.</span>
      </div>
      <div className="fila-botones">
        <Link to={cancelarA} className="boton-secundario">
          Cancelar
        </Link>
        <button className="boton" disabled={enviando}>
          {enviando ? 'Guardando…' : textoEnviar}
        </button>
      </div>
    </form>
  )
}
