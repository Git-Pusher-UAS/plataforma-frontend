import { describe, expect, it } from 'vitest'
import { esDispositivoMovil } from '@/shared/lib/dispositivo'

describe('esDispositivoMovil', () => {
  it('devuelve false para User-Agents de escritorio o cadena vacía', () => {
    expect(
      esDispositivoMovil({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      }),
    ).toBe(false)
    expect(
      esDispositivoMovil({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      }),
    ).toBe(false)
    expect(
      esDispositivoMovil({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      }),
    ).toBe(false)
    expect(esDispositivoMovil({ userAgent: '' })).toBe(false)
  })

  it('devuelve true para User-Agents móviles y tablets', () => {
    expect(
      esDispositivoMovil({
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      }),
    ).toBe(true)
    expect(
      esDispositivoMovil({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      }),
    ).toBe(true)
    expect(
      esDispositivoMovil({
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      }),
    ).toBe(true)
  })

  it('prioriza userAgentData.mobile === true incluso con User-Agent de escritorio', () => {
    expect(
      esDispositivoMovil({
        userAgentData: { mobile: true },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      }),
    ).toBe(true)
  })

  it('respeta userAgentData.mobile === false en escritorio y mantiene respaldo de User-Agent en emulación', () => {
    expect(
      esDispositivoMovil({
        userAgentData: { mobile: false },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }),
    ).toBe(false)
    expect(
      esDispositivoMovil({
        userAgentData: { mobile: false },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile',
      }),
    ).toBe(true)
  })
})
