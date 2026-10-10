import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GuestBanner, type GuestBannerProps } from './GuestBanner'

function setup(props: Partial<GuestBannerProps> = {}) {
  const onSave = vi.fn()
  render(<GuestBanner saveState={null} signedIn={false} memoryOnly={false} onSave={onSave} {...props} />)
  return { onSave }
}

describe('GuestBanner', () => {
  it('offers Sign up as a secondary button, so it never competes with the editor’s primary Share', async () => {
    const { onSave } = setup()
    const button = screen.getByRole('button', { name: 'Sign up' })
    expect(button).toHaveAttribute('data-variant', 'secondary')
    await userEvent.click(button)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a signed-in guest', { signedIn: true }, 'Save to account'],
    ['storage blocked by the browser', { memoryOnly: true }, 'Sign up'],
    ['a failed local save', { saveState: { status: 'error', message: 'Disk full' } as const }, 'Sign up'],
  ])('keeps the action secondary for %s', (_label, props, name) => {
    setup(props)
    expect(screen.getByRole('button', { name })).toHaveAttribute('data-variant', 'secondary')
  })

  it('tells assistive technology what is going on', () => {
    setup()
    expect(screen.getByRole('status')).toHaveTextContent('Saved in this browser')
  })

  it('shows the busy state without a second click going through', async () => {
    const { onSave } = setup({ busy: true })
    const button = screen.getByRole('button', { name: 'Sign up' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onSave).not.toHaveBeenCalled()
  })
})
