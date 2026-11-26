import { useMutation, useQuery } from '@tanstack/react-query'
import { pedir } from '@/shared/lib/servicio'

export type Contacto = { id: string; nombre: string; descripcion: string; telefono: string; horario: string; prioritario: boolean }
export type Alerta = { id: string; estado: 'enviada' | 'recibida' | 'cancelada'; ubicacionCompartida: boolean; contactosAvisados: boolean }

// Directorio de ejemplo. Los teléfonos reales los define la Secretaría en el backend.
const CONTACTOS: Contacto[] = [
  { id: 'c1', nombre: 'Emergencias', descripcion: 'Si estás en peligro inmediato', telefono: '911', horario: '24 horas', prioritario: true },
  { id: 'c2', nombre: 'Línea de atención 24/7', descripcion: 'Orientación y acompañamiento', telefono: '6680000000', horario: '24 horas', prioritario: true },
  { id: 'c3', nombre: 'Secretaría de las Mujeres de Ahome', descripcion: 'Trabajo social, psicología y jurídico', telefono: '6680000001', horario: 'Lunes a viernes, 8:00 a 15:00', prioritario: false },
  { id: 'c4', nombre: 'Patrulla de género', descripcion: 'Apoyo en el lugar', telefono: '6680000002', horario: '24 horas', prioritario: false },
]

/** GET /institutional-contacts (pública). */
export function useDirectorio() {
  return useQuery({
    queryKey: ['directorio'],
    queryFn: () => pedir({ metodo: 'GET', ruta: '/institutional-contacts', simulado: () => CONTACTOS }),
    staleTime: Infinity,
  })
}

/** POST /help-alerts — la usuaria pide ayuda; se envía su ubicación si la autorizó. */
export function useEnviarAlerta() {
  return useMutation({
    mutationFn: (cuerpo: { lat?: number; lon?: number; operationId: string }) =>
      pedir<Alerta>({
        metodo: 'POST',
        ruta: '/help-alerts',
        cuerpo,
        simulado: () => ({ id: 'al-1', estado: 'recibida', ubicacionCompartida: cuerpo.lat !== undefined, contactosAvisados: false }),
      }),
  })
}

/** POST /help-alerts/{id}/trusted-contacts — avisa solo a contactos autorizados antes. */
export function useAvisarContactos() {
  return useMutation({
    mutationFn: (id: string) =>
      pedir<Alerta>({
        metodo: 'POST',
        ruta: `/help-alerts/${id}/trusted-contacts`,
        simulado: () => ({ id, estado: 'recibida', ubicacionCompartida: true, contactosAvisados: true }),
      }),
  })
}

/** POST /help-alerts/{id}/cancellation */
export function useCancelarAlerta() {
  return useMutation({
    mutationFn: (cuerpo: { id: string; motivo: string }) =>
      pedir<Alerta>({
        metodo: 'POST',
        ruta: `/help-alerts/${cuerpo.id}/cancellation`,
        cuerpo: { motivo: cuerpo.motivo },
        simulado: () => ({ id: cuerpo.id, estado: 'cancelada', ubicacionCompartida: false, contactosAvisados: false }),
      }),
  })
}

/** POST /help-events — el personal registra que abrió el marcador (opcional, solo con conexión). */
export function useRegistrarLlamada() {
  return useMutation({
    mutationFn: (cuerpo: { contactId: string; operationId: string }) =>
      pedir<void>({ metodo: 'POST', ruta: '/help-events', cuerpo: { ...cuerpo, action: 'dialer_opened', occurredAt: new Date().toISOString() }, simulado: () => undefined }),
  })
}
