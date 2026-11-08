import type { QrAppearance } from './appearance'
import type { QrContent } from './content'
import { withInlinedLogo, type InlineLogoOptions } from './assets'
import { renderQrSvg } from './svg'

export interface QrRasterOptions {
  /** Output width in pixels. Default 1024. */
  width?: number
  logo?: InlineLogoOptions
}

/** Draws the QR code to a canvas and returns it as a PNG blob. Browser only. */
export async function renderQrPngBlob(
  input: QrContent | string,
  appearance: QrAppearance = {},
  { width = 1024, logo }: QrRasterOptions = {}
): Promise<Blob> {
  const inlined = await withInlinedLogo({ ...appearance, size: width }, logo)
  const svg = renderQrSvg(input, inlined)

  const image = new Image()
  image.decoding = 'async'
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Could not rasterize the QR code.'))
  })
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await loaded

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || width
  canvas.height = image.naturalHeight || width
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('PNG encoding failed.')),
      'image/png'
    )
  )
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export interface DownloadQrOptions extends QrRasterOptions {
  /** File name without extension. Default `qr-code`. */
  filename?: string
  format?: 'png' | 'svg'
}

/** Triggers a browser download of the QR code. */
export async function downloadQr(
  input: QrContent | string,
  appearance: QrAppearance = {},
  { filename = 'qr-code', format = 'png', ...raster }: DownloadQrOptions = {}
): Promise<void> {
  const safeName = filename.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'qr-code'
  if (format === 'svg') {
    const inlined = await withInlinedLogo(appearance, raster.logo)
    const svg = renderQrSvg(input, inlined)
    saveBlob(new Blob([svg], { type: 'image/svg+xml' }), `${safeName}.svg`)
    return
  }
  saveBlob(await renderQrPngBlob(input, appearance, raster), `${safeName}.png`)
}

/** Whether `copyQrToClipboard` can work here (not available on iOS Safari webviews, insecure origins, etc.). */
export function canCopyQr(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.ClipboardItem !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function'
  )
}

/** Copies the QR code to the clipboard as a PNG image. */
export async function copyQrToClipboard(
  input: QrContent | string,
  appearance: QrAppearance = {},
  raster: QrRasterOptions = {}
): Promise<void> {
  // Passing the promise (not the awaited blob) keeps Safari inside the user gesture.
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': renderQrPngBlob(input, appearance, raster)
    })
  ])
}

/** Copies the QR code to the clipboard as SVG markup (pastes into design tools and editors). */
export async function copyQrSvgToClipboard(
  input: QrContent | string,
  appearance: QrAppearance = {},
  raster: QrRasterOptions = {}
): Promise<void> {
  const inlined = await withInlinedLogo(appearance, raster.logo)
  await copyTextToClipboard(renderQrSvg(input, inlined))
}

/** Copies text to the clipboard, falling back to a hidden textarea where the async API is unavailable (e.g. plain http). */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Permission or focus problems: try the legacy path below.
    }
  }
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.cssText =
    'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(field)
  field.select()
  const copied = document.execCommand('copy')
  field.remove()
  if (!copied) throw new Error('Could not copy to the clipboard.')
}
