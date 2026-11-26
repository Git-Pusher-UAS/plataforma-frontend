import { QUICK_EXIT_URL } from '@/features/ayuda/config'

/**
 * Sale de la aplicación hacia una página neutra.
 * Usa replace para sustituir la entrada del historial: el botón "atrás"
 * no regresa a la aplicación.
 */
export function quickExit(url: string = QUICK_EXIT_URL): void {
  window.location.replace(url)
}
