// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QrBuilder } from '../QrBuilder'
import { QrCode } from '../QrCode'

vi.mock('../../browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../browser')>()),
  canCopyQr: () => true,
  downloadQr: vi.fn(async () => undefined),
  copyQrToClipboard: vi.fn(async () => undefined),
  copyQrSvgToClipboard: vi.fn(async () => undefined),
  copyTextToClipboard: vi.fn(async () => undefined),
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

  it('reports the rendered content and appearance through onChange', async () => {
    const onChange = vi.fn()
    const { user } = setup({ onChange })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: { type: 'url', url: '' } }))
    await replaceUrl(user, 'pga.org')
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.content).toEqual({ type: 'url', url: 'pga.org' })
    expect(last.appearance).toMatchObject({ foreground: '#00205B', dotStyle: 'fluid', caption: 'pga.org' })
  })

  it('does not loop when the host passes an inline appearance and stores the change in state', async () => {
    const seen: unknown[] = []
    function Host() {
      const [value, setValue] = useState<unknown>(null)
      return (
        <>
          <QrBuilder
            appearance={{ size: 512 }}
            onChange={(next) => {
              seen.push(next)
              setValue(next)
            }}
          />
          <output data-testid="has-value">{value ? 'yes' : 'no'}</output>
        </>
      )
    }
    const user = userEvent.setup()
    render(<Host />)
    await waitFor(() => expect(screen.getByTestId('has-value').textContent).toBe('yes'))
    expect(seen).toHaveLength(1)
    await user.type(screen.getByLabelText(/^URL/), 'pga.org')
    expect(seen.length).toBeGreaterThan(1)
    expect(seen.length).toBeLessThan(20)
  })

  const choose = async (user: ReturnType<typeof userEvent.setup>, button: string, format: 'SVG' | 'PNG') => {
    await user.click(screen.getByRole('button', { name: button }))
    await user.click(await screen.findByRole('menuitem', { name: new RegExp(`^${format}`) }))
  }
  const downloadPng = (user: ReturnType<typeof userEvent.setup>) => choose(user, 'Download image', 'PNG')

  it('starts empty with example text as placeholders rather than real values', () => {
    setup()
    const url = screen.getByLabelText(/^URL/) as HTMLInputElement
    expect(url.value).toBe('')
    expect(url.placeholder).toBe('https://pga.com')
    const caption = screen.getByLabelText('Caption') as HTMLInputElement
    expect(caption.value).toBe('')
    expect(caption.placeholder).toBe('pga.com')
    expect(screen.getByText('Your QR code will appear here')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Download image' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a placeholder and disables actions until the content is valid', async () => {
    const { user } = setup()
    expect(screen.getByText('Your QR code will appear here')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Download image' }) as HTMLButtonElement).disabled).toBe(true)

    await replaceUrl(user, 'pga.org')
    expect(screen.queryByText(/Will open/)).toBeNull()
    expect((screen.getByRole('button', { name: 'Download image' }) as HTMLButtonElement).disabled).toBe(false)
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
    await downloadPng(user)

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
    await choose(user, 'Copy image', 'PNG')
    expect((await screen.findByRole('status')).textContent).toBe('Image copied')
    await user.type(screen.getByLabelText('Caption'), 'x')
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('can remove the logo', async () => {
    const { user } = setup()
    await replaceUrl(user, 'pga.org')
    await user.click(screen.getByRole('radio', { name: 'No logo' }))
    await downloadPng(user)
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

    const paste = (target: Element | Document, files: File[], text = '') =>
      fireEvent.paste(target, { clipboardData: { files, types: files.length ? ['Files'] : ['text/plain'], getData: () => text } })

    it('adds a pasted image as a logo, even when nothing is focused', async () => {
      setup()
      paste(document.body, [png('image.png')])
      const tile = await screen.findByRole('radio', { name: 'Uploaded logo 1' })
      expect(tile.getAttribute('aria-checked')).toBe('true')
    })

    it('pastes an image while a field is focused, but plain text still pastes as text', async () => {
      const { user } = setup()
      const url = screen.getByLabelText(/^URL/)
      await user.click(url)
      paste(url, [png()], 'https://pga.com')
      expect(screen.queryByRole('radio', { name: 'Uploaded logo 1' })).toBeNull()
      paste(url, [png()])
      expect(await screen.findByRole('radio', { name: 'Uploaded logo 1' })).toBeTruthy()
    })

    it('ignores pasted files that are not images, and pasting is off when uploads are off', async () => {
      setup()
      paste(document.body, [new File(['x'], 'notes.txt', { type: 'text/plain' })])
      expect(screen.queryByRole('radio', { name: 'Uploaded logo 1' })).toBeNull()
      cleanup()
      setup({ allowLogoUpload: false })
      paste(document.body, [png()])
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(screen.queryByRole('radio', { name: 'Uploaded logo 1' })).toBeNull()
    })

    it('explains when pasting would exceed five logos', async () => {
      const { user } = setup({ onUploadLogo: (file: File) => Promise.resolve(`https://res.cloudinary.com/pgahq/${file.name}`) })
      for (let i = 1; i <= 5; i++) await upload(user, png(`logo${i}.png`))
      await waitFor(() => expect(screen.getAllByRole('button', { name: /^Remove uploaded logo/ })).toHaveLength(5))
      paste(document.body, [png('extra.png')])
      expect((await screen.findByRole('alert')).textContent).toContain('5 uploaded logos')
    })

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
      const logos = within(screen.getByRole('radiogroup', { name: 'Logo' }))
      expect(logos.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
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
        JSON.stringify(['javascript:alert(1)', 'http://insecure.test/a.png', 'https://res.cloudinary.com/pgahq/ok.png', 42]),
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
      await user.click(screen.getByRole('menuitem', { name: 'Copy PNG' }))
      await waitFor(() => expect(browser.copyQrToClipboard).toHaveBeenCalledTimes(1))
      expect(screen.queryByRole('menu')).toBeNull()

      await user.pointer({ keys: '[MouseRight]', target: code })
      await user.click(await screen.findByRole('menuitem', { name: 'Download SVG' }))
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(1))
      expect(vi.mocked(browser.downloadQr).mock.calls[0]![2]).toMatchObject({ format: 'svg' })
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

  describe('style and color', () => {
    const downloaded = () => vi.mocked(browser.downloadQr).mock.calls[0]![1]!

    it('defaults to the fluid look in navy and offers two looks (default first) and three colors', async () => {
      const { user } = setup({ defaultUrl: 'https://pga.com' })
      expect(screen.getAllByRole('radio', { name: /^(Classic|Rounded|Dots|Fluid)$/ }).map((r) => r.getAttribute('aria-label'))).toEqual([
        'Fluid',
        'Classic',
      ])
      expect(screen.getAllByRole('radio', { name: /^(Navy|Black|Greyscale)$/ }).map((r) => r.getAttribute('aria-label'))).toEqual([
        'Navy',
        'Black',
        'Greyscale',
      ])
      await downloadPng(user)
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalled())
      expect(downloaded()).toMatchObject({ foreground: '#00205B', dotStyle: 'fluid', cornerStyle: 'fluid' })
      expect(screen.getByRole('radio', { name: 'Fluid' }).getAttribute('aria-checked')).toBe('true')
      expect(screen.getByRole('radio', { name: 'Navy' }).getAttribute('aria-checked')).toBe('true')
    })

    it('applies the chosen look and color as a single color, ignoring separate corner colors from the host', async () => {
      const { user, onEvent } = setup({
        defaultUrl: 'https://pga.com',
        appearance: { cornerSquareColor: '#0053FF', cornerDotColor: '#0053FF' },
      })
      await user.click(screen.getByRole('radio', { name: 'Classic' }))
      await user.click(screen.getByRole('radio', { name: 'Black' }))
      expect(screen.getByRole('radio', { name: 'Classic' }).getAttribute('aria-checked')).toBe('true')
      expect(screen.getByRole('radio', { name: 'Fluid' }).getAttribute('aria-checked')).toBe('false')

      await downloadPng(user)
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalled())
      expect(downloaded()).toMatchObject({ foreground: '#000000', dotStyle: 'square', cornerStyle: 'square' })
      expect(downloaded().cornerSquareColor).toBeUndefined()
      expect(downloaded().cornerDotColor).toBeUndefined()
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'download', style: 'classic', color: 'black' }))
    })

    it('greyscale makes the code black and the logo colorless; other colors leave the logo alone', async () => {
      const { user, onEvent } = setup({ defaultUrl: 'https://pga.com' })
      await user.click(screen.getByRole('radio', { name: 'Greyscale' }))
      await downloadPng(user)
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(1))
      expect(downloaded()).toMatchObject({ foreground: '#000000', logo: { grayscale: true } })
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'download', color: 'greyscale' }))

      await user.click(screen.getByRole('radio', { name: 'Black' }))
      await downloadPng(user)
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(2))
      const second = vi.mocked(browser.downloadQr).mock.calls[1]![1]!
      expect(second).toMatchObject({ foreground: '#000000' })
      expect(second.logo?.grayscale).toBeFalsy()
    })

    it('shows miniature previews of the current content in each look', () => {
      setup({ defaultUrl: 'https://pga.com' })
      const tile = screen.getByRole('radio', { name: 'Fluid' })
      const src = tile.querySelector('img')!.getAttribute('src')!
      expect(src.startsWith('data:image/svg+xml')).toBe(true)
      expect(decodeURIComponent(src)).toContain('fill="#00205B"')
    })
  })

  describe('optional style and color choices', () => {
    it('shows both by default', () => {
      setup()
      expect(screen.getByRole('radiogroup', { name: 'Style' })).toBeTruthy()
      expect(screen.getByRole('radiogroup', { name: 'Color' })).toBeTruthy()
    })

    it('can hide the styles and keeps rendering the default one', () => {
      setup({ allowStyleChoice: false, defaultUrl: 'https://pga.com' })
      expect(screen.queryByRole('radiogroup', { name: 'Style' })).toBeNull()
      expect(screen.getByRole('radiogroup', { name: 'Color' })).toBeTruthy()
    })

    it('can hide the colors and keeps rendering the default one', () => {
      setup({ allowColorChoice: false, defaultColor: 'black', defaultUrl: 'https://pga.com' })
      expect(screen.queryByRole('radiogroup', { name: 'Color' })).toBeNull()
      expect(screen.getByRole('radiogroup', { name: 'Style' })).toBeTruthy()
      expect(document.querySelector('.pga-qr-stage svg')?.outerHTML).toContain('#000000')
    })

    it('renders nothing for the section when both are hidden', () => {
      setup({ allowStyleChoice: false, allowColorChoice: false })
      expect(document.querySelector('.pga-qr-appearance')).toBeNull()
    })
  })

  describe('sms message', () => {
    it('is a multi-line field and Enter inserts a line break', async () => {
      const { user } = setup({ defaultTab: 'sms' })
      await user.type(screen.getByLabelText(/Your phone number/), '+18005551212')
      const message = screen.getByLabelText('Custom message') as HTMLTextAreaElement
      expect(message.tagName).toBe('TEXTAREA')
      await user.type(message, 'Hi!{Enter}See you at 5.')
      expect(message.value).toBe('Hi!\nSee you at 5.')
      expect(screen.getByRole('img', { name: /./ })).toBeTruthy()
    })
  })

  describe('autoFocus', () => {
    it('does not take focus by default', () => {
      setup()
      expect(document.activeElement).toBe(document.body)
    })

    it('focuses the URL field on mount when enabled', () => {
      setup({ autoFocus: true })
      expect(document.activeElement).toBe(screen.getByLabelText(/URL/))
    })
  })

  describe('format menus', () => {
    it('offers SVG and PNG for downloads and passes the choice through', async () => {
      const { user, onEvent } = setup({ defaultUrl: 'https://pga.com' })
      await user.click(screen.getByRole('button', { name: 'Download image' }))
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['SVG', 'PNG'])
      await user.click(screen.getByRole('menuitem', { name: 'SVG' }))
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(1))
      expect(vi.mocked(browser.downloadQr).mock.calls[0]![2]).toMatchObject({ format: 'svg' })
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'download', format: 'svg' }))
      expect(screen.queryByRole('menu')).toBeNull()

      await downloadPng(user)
      await waitFor(() => expect(browser.downloadQr).toHaveBeenCalledTimes(2))
      expect(vi.mocked(browser.downloadQr).mock.calls[1]![2]).toMatchObject({ format: 'png' })
    })

    it('copies SVG as markup and PNG as an image', async () => {
      const { user, onEvent } = setup({ defaultUrl: 'https://pga.com' })
      await choose(user, 'Copy image', 'SVG')
      await waitFor(() => expect(browser.copyQrSvgToClipboard).toHaveBeenCalledTimes(1))
      expect(browser.copyQrToClipboard).not.toHaveBeenCalled()
      await choose(user, 'Copy image', 'PNG')
      await waitFor(() => expect(browser.copyQrToClipboard).toHaveBeenCalledTimes(1))
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'copy', format: 'svg' }))
    })

    it('toggles the menu when the same button is pressed again and closes on Escape', async () => {
      const { user } = setup({ defaultUrl: 'https://pga.com' })
      const button = screen.getByRole('button', { name: 'Download image' })
      await user.click(button)
      expect(button.getAttribute('aria-expanded')).toBe('true')
      await user.click(button)
      expect(screen.queryByRole('menu')).toBeNull()
      await user.click(button)
      await screen.findByRole('menu', { name: 'Download image as' })
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('has three non-primary buttons under the code, with the image ones disabled until there is a code', () => {
      setup({ link: 'https://img.test/x' })
      const names = ['Download image', 'Copy image', 'Copy link']
      for (const name of names) expect(screen.getByRole('button', { name }).className).toContain('pga-qr-button-secondary')
      expect((screen.getByRole('button', { name: 'Download image' }) as HTMLButtonElement).disabled).toBe(true)
      expect((screen.getByRole('button', { name: 'Copy image' }) as HTMLButtonElement).disabled).toBe(true)
      expect((screen.getByRole('button', { name: 'Copy link' }) as HTMLButtonElement).disabled).toBe(false)
    })
  })

  describe('link button', () => {
    it('is not shown unless a link is provided', () => {
      setup()
      expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull()
    })

    it('copies the link, confirms, and reports the event', async () => {
      const { user, onEvent } = setup({ link: 'https://qr.pga.org/api/qr?url=pga.com' })
      const button = screen.getByRole('button', { name: 'Copy link' })
      expect(button.textContent).toBe('Link')
      await user.click(button)
      await waitFor(() => expect(browser.copyTextToClipboard).toHaveBeenCalledWith('https://qr.pga.org/api/qr?url=pga.com'))
      expect((await screen.findByRole('status')).textContent).toBe('Link copied')
      expect(button.textContent).toBe('Copied!')
      expect(onEvent.mock.calls.map(([event]) => event.type)).toContain('copy-link')
    })

    it('can be built from the builder state, renamed, and disabled when empty', async () => {
      const { user } = setup({
        link: (state: { qr: { payload: string | null } }) => (state.qr.payload ? `https://img.test/?u=${state.qr.payload}` : null),
        linkLabel: 'Image link',
      })
      expect((screen.getByRole('button', { name: 'Copy image link' }) as HTMLButtonElement).disabled).toBe(true)
      await replaceUrl(user, 'pga.com')
      const button = screen.getByRole('button', { name: 'Copy image link' })
      expect((button as HTMLButtonElement).disabled).toBe(false)
      expect(button.textContent).toBe('Image link')
      await user.click(button)
      await waitFor(() => expect(browser.copyTextToClipboard).toHaveBeenCalledWith('https://img.test/?u=https://pga.com/'))
    })

    it('says so when copying fails', async () => {
      vi.mocked(browser.copyTextToClipboard).mockRejectedValueOnce(new Error('denied'))
      const { user } = setup({ link: 'https://example.test/x' })
      await user.click(screen.getByRole('button', { name: 'Copy link' }))
      await waitFor(() => expect(browser.copyTextToClipboard).toHaveBeenCalled())
      expect(screen.getByRole('button', { name: 'Copy link' }).textContent).toBe('Link')
    })
  })
})
