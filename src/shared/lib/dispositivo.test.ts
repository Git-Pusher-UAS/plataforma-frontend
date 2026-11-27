import { describe, expect, it } from 'vitest'
import { esMovil } from '@/shared/lib/dispositivo'

const nav = (userAgent: string, extra: Partial<Navigator> & { userAgentData?: { mobile?: boolean } } = {}) =>
  ({ userAgent, maxTouchPoints: 0, ...extra }) as unknown as Navigator

describe('esMovil', () => {
  it('reconoce celulares por el User-Agent', () => {
    expect(esMovil(nav('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'))).toBe(true)
    expect(esMovil(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'))).toBe(true)
  })
  it('usa la pista Sec-CH-UA-Mobile cuando existe', () => {
    expect(esMovil(nav('Mozilla/5.0 (X11; Linux x86_64)', { userAgentData: { mobile: true } }))).toBe(true)
  })
  it('reconoce el iPad que se anuncia como Mac', () => {
    expect(esMovil(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', { maxTouchPoints: 5 }))).toBe(true)
  })
  it('trata como escritorio a Windows y Mac', () => {
    expect(esMovil(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36'))).toBe(false)
    expect(esMovil(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'))).toBe(false)
  })
})
