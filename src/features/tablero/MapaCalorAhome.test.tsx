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

  it('marca los puntos numerados dentro del lienzo y resalta el activo', () => {
    const puntos = [
      { id: 'a', nombre: 'Punto A', lat: 25.7845, lon: -108.9953 },
      { id: 'b', nombre: 'Punto B', lat: 25.7836, lon: -108.9931 },
    ]
    const { container } = render(<MapaCalorAhome vista="los-mochis" puntos={puntos} activo="b" />)
    const marcas = container.querySelectorAll('.mapa-punto')
    expect(marcas).toHaveLength(2)
    expect(container.querySelector('[data-punto="a"]')).toHaveTextContent('1')
    // El activo se dibuja al final para quedar encima.
    expect(marcas[1]).toHaveAttribute('data-punto', 'b')
    expect(container.querySelector('[data-punto="b"]')).toHaveClass('activo')
    const [bx, by, bw, bh] = container.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number)
    for (const m of marcas) {
      const [x, y] = m.getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number)
      expect(x).toBeGreaterThan(bx!)
      expect(x).toBeLessThan(bx! + bw!)
      expect(y).toBeGreaterThan(by!)
      expect(y).toBeLessThan(by! + bh!)
    }
  })

  it('separa los marcadores que quedarían encimados', () => {
    const mismo = { lat: 25.7845, lon: -108.9953 }
    const { container } = render(<MapaCalorAhome vista="puntos" puntos={[{ id: 'a', nombre: 'A', ...mismo }, { id: 'b', nombre: 'B', ...mismo }]} />)
    const [a, b] = [...container.querySelectorAll('.mapa-punto')].map((m) => m.getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number))
    const r = Number(container.querySelector('.mapa-punto circle')!.getAttribute('r'))
    expect(Math.hypot(a![0]! - b![0]!, a![1]! - b![1]!)).toBeGreaterThanOrEqual(r * 2.2)
  })
})
