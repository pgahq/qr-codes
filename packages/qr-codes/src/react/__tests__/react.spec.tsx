// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QrBuilder } from '../QrBuilder'
import { QrCode } from '../QrCode'

vi.mock('../../browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../browser')>()),
  canCopyQr: () => true,
  downloadQr: vi.fn(async () => undefined),
  copyQrToClipboard: vi.fn(async () => undefined)
}))

const browser = await import('../../browser')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('<QrCode />', () => {
  it('renders an accessible svg for valid content', () => {
    render(<QrCode content={{ type: 'url', url: 'pga.org' }} appearance={{ caption: 'Scan me' }} />)
    expect(screen.getByRole('img', { name: 'Scan me' })).toBeTruthy()
  })

  it('renders the fallback instead of throwing for invalid content', () => {
    render(<QrCode content={{ type: 'url', url: 'javascript:alert(1)' }} fallback={(error) => <p>bad: {error}</p>} />)
    expect(screen.getByText(/bad: Enter a valid/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('<QrBuilder />', () => {
  const setup = (props = {}) => {
    const onEvent = vi.fn()
    const user = userEvent.setup()
    render(<QrBuilder onEvent={onEvent} {...props} />)
    return { user, onEvent }
  }

  it('shows a placeholder and disables actions until the content is valid', async () => {
    const { user } = setup()
    expect(screen.getByText('Your QR code will appear here')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement).disabled).toBe(true)

    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    expect(screen.getByText('Will open https://pga.org/')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('img', { name: 'QR code' })).toBeTruthy()
  })

  it('only shows validation after the field was touched', async () => {
    const { user } = setup()
    const input = screen.getByLabelText(/^URL/)
    await user.type(input, 'not a url')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.tab()
    expect((await screen.findByRole('alert')).textContent).toMatch(/valid http\(s\) URL/)
  })

  it('switches tabs with the arrow keys and keeps one tab in the tab order', async () => {
    const { user } = setup()
    screen.getByRole('tab', { name: /Open webpage/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Join Wi-Fi/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: /Open webpage/ }).getAttribute('tabindex')).toBe('-1')
    expect(screen.getByLabelText(/^Network name/)).toBeTruthy()
  })

  it('requires a password for secured Wi-Fi and hides it for open networks', async () => {
    const { user } = setup({ defaultTab: 'wifi' })
    await user.type(screen.getByLabelText(/^Network name/), 'Club')
    await user.tab()
    await user.tab()
    await user.tab()
    expect((await screen.findByRole('alert')).textContent).toMatch(/password/i)
    await user.selectOptions(screen.getByLabelText(/^Network type/), 'nopass')
    expect(screen.queryByLabelText(/^Password/)).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('downloads using the caption as the file name and reports events once', async () => {
    const { user, onEvent } = setup()
    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    await user.type(screen.getByLabelText('Caption below QR code'), 'Tickets')
    await user.click(screen.getByRole('button', { name: 'Download' }))

    await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(1))
    const [payload, appearance, options] = vi.mocked(browser.downloadQr).mock.calls[0]
    expect(payload).toBe('https://pga.org/')
    expect(appearance).toMatchObject({ caption: 'Tickets', logo: { src: expect.stringContaining('cloudinary') } })
    expect(options).toMatchObject({ filename: 'Tickets' })

    const types = onEvent.mock.calls.map(([event]) => event.type)
    expect(types).toEqual(['start', 'download'])
  })

  it('copies, then resets the copied state when the code changes', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeTruthy()
    await user.type(screen.getByLabelText('Caption below QR code'), 'x')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })

  it('can remove the logo', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    await user.click(screen.getByLabelText('No logo'))
    await user.click(screen.getByRole('button', { name: 'Download' }))
    await waitFor(() => expect(browser.downloadQr).toHaveBeenCalled())
    expect(vi.mocked(browser.downloadQr).mock.calls[0]![1]!.logo).toBeUndefined()
  })

  it('rejects oversized or non-image uploads with a message', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    // Browsers filter by `accept`, but drag-and-drop and some pickers do not, so the component must check too.
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/png, jpeg, webp or gif/)
  })

  it('uses onUploadLogo for custom logos', async () => {
    const onUploadLogo = vi.fn(async () => 'https://res.cloudinary.com/pgahq/custom.png')
    const { user } = setup({ onUploadLogo })
    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'logo.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Your uploaded logo' }).getAttribute('aria-checked')).toBe('true'))
    expect(onUploadLogo).toHaveBeenCalledTimes(1)
  })
})
