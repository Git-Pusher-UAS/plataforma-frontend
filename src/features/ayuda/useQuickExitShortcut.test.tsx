import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useQuickExitShortcut } from '@/features/ayuda/useQuickExitShortcut'

function pressEsc() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

describe('useQuickExitShortcut', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('no sale con una sola pulsación de Esc', () => {
    const onExit = vi.fn()
    renderHook(() => useQuickExitShortcut(onExit))
    pressEsc()
    expect(onExit).not.toHaveBeenCalled()
  })

  it('sale con dos pulsaciones seguidas de Esc', () => {
    const onExit = vi.fn()
    renderHook(() => useQuickExitShortcut(onExit))
    pressEsc()
    vi.advanceTimersByTime(300)
    pressEsc()
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('no sale si pasa demasiado tiempo entre pulsaciones', () => {
    const onExit = vi.fn()
    renderHook(() => useQuickExitShortcut(onExit))
    pressEsc()
    vi.advanceTimersByTime(2000)
    pressEsc()
    expect(onExit).not.toHaveBeenCalled()
  })

  it('ignora otras teclas', () => {
    const onExit = vi.fn()
    renderHook(() => useQuickExitShortcut(onExit))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(onExit).not.toHaveBeenCalled()
  })

  it('deja de escuchar al desmontarse', () => {
    const onExit = vi.fn()
    const { unmount } = renderHook(() => useQuickExitShortcut(onExit))
    unmount()
    pressEsc()
    pressEsc()
    expect(onExit).not.toHaveBeenCalled()
  })
})
