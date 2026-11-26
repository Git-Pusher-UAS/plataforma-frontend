import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MapaCalorAhome } from '@/features/tablero/MapaCalorAhome'

describe('MapaCalorAhome', () => {
  it('dibuja las 388 AGEB de Ahome dentro del lienzo, sin datos por defecto', () => {
    const { container } = render(<MapaCalorAhome />)
    const sectores = container.querySelectorAll('.mapa-sector')
    expect(sectores).toHaveLength(388)
    expect(container.querySelectorAll('.sin-datos')).toHaveLength(388)
    const box = container.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number)
    const nums = sectores[0]!.getAttribute('d')!.match(/-?[\d.]+/g)!.map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...nums)).toBeLessThanOrEqual(Math.max(box[2]!, box[3]!))
  })

  it('aplica el nivel o el patrón de suprimido por clave de AGEB', () => {
    const { container } = render(<MapaCalorAhome niveles={{ '250019092': 4, '2500100704956': 'suprimido' }} />)
    expect(container.querySelector('[data-id="250019092"]')).toHaveClass('calor-4')
    expect(container.querySelector('[data-id="2500100704956"]')).toHaveClass('suprimido')
  })
})
