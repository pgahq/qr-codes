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
  window.localStorage.clear()
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

  const replaceUrl = async (user: ReturnType<typeof userEvent.setup>, value: string) => {
    const input = screen.getByLabelText(/^URL/)
    await user.clear(input)
    await user.type(input, value)
  }

  const replaceCaption = async (user: ReturnType<typeof userEvent.setup>, value: string) => {
    const input = screen.getByLabelText('Caption')
    await user.clear(input)
    await user.type(input, value)
  }

  it('starts empty with example text as placeholders rather than real values', () => {
    setup()
    const url = screen.getByLabelText(/^URL/) as HTMLInputElement
    expect(url.value).toBe('')
    expect(url.placeholder).toBe('https://pga.com')
    const caption = screen.getByLabelText('Caption') as HTMLInputElement
    expect(caption.value).toBe('')
    expect(caption.placeholder).toBe('pga.com')
    expect(screen.getByText('Your QR code will appear here')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a placeholder and disables actions until the content is valid', async () => {
    const { user } = setup()
    expect(screen.getByText('Your QR code will appear here')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement).disabled).toBe(true)

    await replaceUrl(user, 'pga.org')
    expect(screen.queryByText(/Will open/)).toBeNull()
    expect((screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('img', { name: 'pga.org' })).toBeTruthy()
  })

  it('only shows validation after the field was touched', async () => {
    const { user } = setup()
    const input = screen.getByLabelText(/^URL/)
    await user.clear(input)
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
    await user.tab()
    expect((await screen.findByRole('alert')).textContent).toMatch(/password/i)
    await user.selectOptions(screen.getByLabelText(/^Network type/), 'nopass')
    expect(screen.queryByLabelText(/^Password/)).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('downloads using the caption as the file name and reports events once', async () => {
    const { user, onEvent } = setup()
    await replaceUrl(user, 'pga.org')
    await replaceCaption(user, 'Tickets')
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
    await replaceUrl(user, 'pga.org')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeTruthy()
    await user.type(screen.getByLabelText('Caption'), 'x')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })

  it('can remove the logo', async () => {
    const { user } = setup()
    await replaceUrl(user, 'pga.org')
    await user.click(screen.getByRole('radio', { name: 'No logo' }))
    await user.click(screen.getByRole('button', { name: 'Download' }))
    await waitFor(() => expect(browser.downloadQr).toHaveBeenCalled())
    expect(vi.mocked(browser.downloadQr).mock.calls[0]![1]!.logo).toBeUndefined()
  })

  it('rejects oversized or non-image uploads with a message', async () => {
    const { user } = setup()
    await replaceUrl(user, 'pga.org')
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    // Browsers filter by `accept`, but drag-and-drop and some pickers do not, so the component must check too.
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/png, jpeg, webp or gif/)
  })

  it('uses onUploadLogo for custom logos', async () => {
    const onUploadLogo = vi.fn(async () => 'https://res.cloudinary.com/pgahq/custom.png')
    const { user } = setup({ onUploadLogo })
    await replaceUrl(user, 'pga.org')
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'logo.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Uploaded logo 1' }).getAttribute('aria-checked')).toBe('true'))
    expect(onUploadLogo).toHaveBeenCalledTimes(1)
  })

  it('suggests a caption from the URL until the user writes their own', async () => {
    const { user } = setup()
    const caption = screen.getByLabelText('Caption') as HTMLInputElement
    expect(caption.value).toBe('')

    await replaceUrl(user, 'https://www.pga.com/championship/')
    expect(caption.value).toBe('pga.com/championship')

    await replaceCaption(user, 'Scan for tickets')
    await replaceUrl(user, 'pga.com/other')
    expect(caption.value).toBe('Scan for tickets')
  })

  it('puts the caption on the same row as the main field', () => {
    setup()
    const row = screen.getByLabelText(/^URL/).closest('.pga-qr-row')
    expect(row?.contains(screen.getByLabelText('Caption'))).toBe(true)
  })

  describe('custom logos', () => {
    const png = (name = 'logo.png') => new File(['x'], name, { type: 'image/png' })
    const upload = async (user: ReturnType<typeof userEvent.setup>, file = png()) => {
      await user.upload(document.querySelector('input[type=file]') as HTMLInputElement, file)
    }

    it('adds, selects, persists and removes uploaded logos', async () => {
      const { user } = setup()
      await upload(user)
      const tile = await screen.findByRole('radio', { name: 'Uploaded logo 1' })
      expect(tile.getAttribute('aria-checked')).toBe('true')

      const stored = JSON.parse(window.localStorage.getItem('pgahq:qr-codes:custom-logos') ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatch(/^data:image\/png;base64,/)

      cleanup()
      setup()
      expect(await screen.findByRole('radio', { name: 'Uploaded logo 1' })).toBeTruthy()

      await user.click(screen.getByRole('button', { name: 'Remove uploaded logo 1' }))
      expect(screen.queryByRole('radio', { name: 'Uploaded logo 1' })).toBeNull()
      expect(JSON.parse(window.localStorage.getItem('pgahq:qr-codes:custom-logos') ?? '[]')).toEqual([])
    })

    it('falls back to the first preset when the selected upload is removed', async () => {
      const { user } = setup()
      await upload(user)
      await user.click(await screen.findByRole('button', { name: 'Remove uploaded logo 1' }))
      expect(screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
      expect(screen.getByRole('radio', { name: 'PGA of America (blue)' }).getAttribute('aria-checked')).toBe('true')
    })

    it('allows at most five uploads', async () => {
      const { user } = setup({ onUploadLogo: (file: File) => Promise.resolve(`https://res.cloudinary.com/pgahq/${file.name}`) })
      for (let i = 1; i <= 5; i++) await upload(user, png(`logo${i}.png`))
      await waitFor(() => expect(screen.getAllByRole('button', { name: /^Remove uploaded logo/ })).toHaveLength(5))
      expect((screen.getByRole('button', { name: 'Upload a custom image' }) as HTMLButtonElement).disabled).toBe(true)
    })

    it('ignores corrupt or unsafe stored values and can skip storage entirely', async () => {
      window.localStorage.setItem(
        'pgahq:qr-codes:custom-logos',
        JSON.stringify(['javascript:alert(1)', 'http://insecure.test/a.png', 'https://res.cloudinary.com/pgahq/ok.png', 42])
      )
      setup()
      expect(await screen.findByRole('radio', { name: 'Uploaded logo 1' })).toBeTruthy()
      expect(screen.queryByRole('radio', { name: 'Uploaded logo 2' })).toBeNull()

      cleanup()
      window.localStorage.setItem('mine', '[]')
      const { user } = setup({ storageKey: null })
      expect(screen.queryByRole('radio', { name: 'Uploaded logo 1' })).toBeNull()
      await upload(user)
      await screen.findByRole('radio', { name: 'Uploaded logo 1' })
      expect(window.localStorage.getItem('pgahq:qr-codes:custom-logos')).toContain('ok.png')
    })
  })

  describe('right-click menu', () => {
    it('offers copy and download on the code and runs them', async () => {
      const { user } = setup({ defaultUrl: 'https://pga.com' })
      const code = screen.getByRole('img', { name: /QR code|pga\.com/ })
      await user.pointer({ keys: '[MouseRight]', target: code })

      const menu = await screen.findByRole('menu', { name: 'QR code actions' })
      expect(menu).toBeTruthy()
      await user.click(screen.getByRole('menuitem', { name: 'Copy image' }))
      await waitFor(() => expect(browser.copyQrToClipboard).toHaveBeenCalledTimes(1))
      expect(screen.queryByRole('menu')).toBeNull()

      await user.pointer({ keys: '[MouseRight]', target: code })
      await user.click(await screen.findByRole('menuitem', { name: 'Download image' }))
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(1))
    })

    it('closes on Escape and is not offered before there is a code', async () => {
      const { user } = setup({ defaultUrl: 'https://pga.com' })
      await user.pointer({ keys: '[MouseRight]', target: screen.getByRole('img', { name: /QR code|pga\.com/ }) })
      await screen.findByRole('menu')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).toBeNull()

      cleanup()
      setup()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Your QR code will appear here') })
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })
})
