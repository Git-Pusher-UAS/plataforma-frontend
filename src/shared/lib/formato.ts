/** Fecha corta en español de México: «25 nov 2026». Acepta AAAA-MM-DD o AAAA-MM-DDTHH:MM. */
export function fecha(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Fecha y hora: «25 nov 2026, 4:42 p.m.». */
export function fechaHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function numero(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-MX')
}
