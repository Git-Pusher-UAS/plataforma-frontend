// El navegador expone las mismas cabeceras que envía al servidor:
// `Sec-CH-UA-Mobile` (navigator.userAgentData.mobile) y `User-Agent` (navigator.userAgent).
type NavegadorConPistas = Navigator & { userAgentData?: { mobile?: boolean } }

const UA_MOVIL = /Android|iPhone|iPod|iPad|Mobile|Opera Mini|IEMobile|Windows Phone|BlackBerry/i

/** true si la petición viene de un celular o tableta. */
export function esMovil(nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false
  const pista = (nav as NavegadorConPistas).userAgentData?.mobile
  if (typeof pista === 'boolean' && pista) return true
  if (UA_MOVIL.test(nav.userAgent)) return true
  // iPadOS se anuncia como Mac de escritorio; se distingue por la pantalla táctil.
  return /Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1
}
