import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/features/ayuda/quickExit', () => ({ quickExit: vi.fn() }))

import { quickExit } from '@/features/ayuda/quickExit'
import { QuickExitButton } from '@/features/ayuda/QuickExitButton'

describe('QuickExitButton', () => {
  it('ejecuta la salida rápida con un solo toque', async () => {
    render(<QuickExitButton />)
    await userEvent.click(screen.getByRole('button', { name: /salida rápida/i }))
    expect(quickExit).toHaveBeenCalledTimes(1)
  })
})
