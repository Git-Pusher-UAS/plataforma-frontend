type NavigatorConUAData = Navigator & {
  userAgentData?: { mobile?: boolean }
}

export type EntornoDispositivo = {
  userAgent?: string
  userAgentData?: { mobile?: boolean }
}

const REGEX_MOVIL = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Mobi/i

/**
 * Determina si el navegador actual corresponde a un dispositivo móvil usando
 * User-Agent Client Hints (Sec-CH-UA-Mobile) y User-Agent.
 */
export function esDispositivoMovil(entorno?: EntornoDispositivo): boolean {
  const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorConUAData) : undefined
  const uaData = entorno ? entorno.userAgentData : nav?.userAgentData
  if (uaData?.mobile === true) return true
  const ua = entorno ? (entorno.userAgent ?? '') : (nav?.userAgent ?? '')
  return REGEX_MOVIL.test(ua)
}
