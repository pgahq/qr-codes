import { create } from 'qrcode'
import {
  CAPTION_MAX_LENGTH,
  DEFAULT_APPEARANCE,
  SIZE_RANGE,
  type CornerStyle,
  type DotStyle,
  type QrAppearance
} from './appearance'
import { encodeQrContent, normalizePunctuation, type QrContent } from './content'

export class QrRenderError extends Error {
  readonly field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'QrRenderError'
    this.field = field
  }
}

const EYE = 7
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FONT_STACK = 'Arial, Helvetica, sans-serif'
const LOGO_SCALE = { min: 0.1, max: 0.3, fallback: 0.22 } as const
const LOGO_PADDING_MODULES = 1

interface Matrix {
  size: number
  isDark(row: number, col: number): boolean
}

function buildMatrix(payload: string, level: 'L' | 'M' | 'Q' | 'H'): Matrix {
  let qr: ReturnType<typeof create>
  try {
    qr = create(payload, { errorCorrectionLevel: level })
  } catch {
    throw new QrRenderError('Content is too long to fit in a QR code.')
  }
  const { modules } = qr
  return {
    size: modules.size,
    isDark: (row, col) => modules.get(row, col) === 1
  }
}

const xml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const num = (value: number) => String(Math.round(value * 1000) / 1000)

function color(value: string, field: string): string {
  if (!HEX_COLOR.test(value)) {
    throw new QrRenderError(`${field} must be a hex color like #00234b.`, field)
  }
  return value
}

function dotPath(style: DotStyle, x: number, y: number): string {
  switch (style) {
    case 'dots': {
      const r = 0.45
      return `M${num(x + 0.5 - r)} ${num(y + 0.5)}a${r} ${r} 0 1 0 ${num(2 * r)} 0a${r} ${r} 0 1 0 ${num(-2 * r)} 0z`
    }
    case 'rounded': {
      const r = 0.3
      const s = num(1 - 2 * r)
      return `M${num(x + r)} ${y}h${s}a${r} ${r} 0 0 1 ${r} ${r}v${s}a${r} ${r} 0 0 1 ${-r} ${r}h-${s}a${r} ${r} 0 0 1 ${-r} ${-r}v-${s}a${r} ${r} 0 0 1 ${r} ${-r}z`
    }
    case 'square':
      return `M${x} ${y}h1v1h-1z`
  }
}

function eyeMarkup(
  style: CornerStyle,
  x: number,
  y: number,
  squareColor: string,
  dotColor: string
): string {
  const ring =
    style === 'dot'
      ? `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3" fill="none" stroke="${squareColor}" stroke-width="1"/>`
      : style === 'rounded'
        ? `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.75" fill="none" stroke="${squareColor}" stroke-width="1"/>`
        : `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill="${squareColor}" fill-rule="evenodd"/>`

  const pupil =
    style === 'dot'
      ? `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${dotColor}"/>`
      : style === 'rounded'
        ? `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.8" fill="${dotColor}"/>`
        : `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${dotColor}"/>`

  return ring + pupil
}

function clampLogoScale(scale: number | undefined): number {
  if (scale === undefined || Number.isNaN(scale)) return LOGO_SCALE.fallback
  return Math.min(LOGO_SCALE.max, Math.max(LOGO_SCALE.min, scale))
}

/**
 * Renders a QR code as a self-contained SVG string.
 *
 * Pass structured {@link QrContent} (validated and encoded for you) or a raw
 * payload string. Output is deterministic, has no external dependencies other
 * than an optional logo, and escapes every interpolated value.
 *
 * @throws {QrRenderError} for invalid content or appearance.
 */
export function renderQrSvg(
  input: QrContent | string,
  appearance: QrAppearance = {}
): string {
  const options = { ...DEFAULT_APPEARANCE, ...stripUndefined(appearance) }

  let payload: string
  if (typeof input === 'string') {
    if (!input) throw new QrRenderError('Content is empty.')
    payload = input
  } else {
    const encoded = encodeQrContent(input)
    if (!encoded.ok) throw new QrRenderError(encoded.error, encoded.field)
    payload = encoded.value
  }

  if (options.size < SIZE_RANGE.min || options.size > SIZE_RANGE.max) {
    throw new QrRenderError(
      `size must be between ${SIZE_RANGE.min} and ${SIZE_RANGE.max}.`,
      'size'
    )
  }
  if (options.margin < 0 || options.margin > 20) {
    throw new QrRenderError('margin must be between 0 and 20 modules.', 'margin')
  }
  const caption = normalizePunctuation(options.caption?.trim() ?? '')
  if (caption.length > CAPTION_MAX_LENGTH) {
    throw new QrRenderError(
      `caption must be ${CAPTION_MAX_LENGTH} characters or fewer.`,
      'caption'
    )
  }

  const foreground = color(options.foreground, 'foreground')
  const background = color(options.background, 'background')
  const cornerSquare = color(options.cornerSquareColor ?? foreground, 'cornerSquareColor')
  const cornerDot = color(options.cornerDotColor ?? foreground, 'cornerDotColor')

  const logo = options.logo
  const level = options.errorCorrection ?? (logo ? 'H' : 'M')
  const matrix = buildMatrix(payload, level)

  const n = matrix.size
  const q = options.margin
  const width = n + 2 * q
  const captionHeight = caption ? Math.max(3, width * 0.1) : 0
  const height = width + captionHeight
  const pixelHeight = Math.round((options.size * height) / width)

  const logoSide = logo ? clampLogoScale(logo.scale) * n : 0
  const logoZone = logo
    ? (() => {
        const side = logoSide + 2 * LOGO_PADDING_MODULES
        const origin = q + (n - side) / 2
        return { min: origin, max: origin + side }
      })()
    : null

  const inEye = (r: number, c: number) =>
    (r < EYE && c < EYE) || (r < EYE && c >= n - EYE) || (r >= n - EYE && c < EYE)

  const inLogo = (r: number, c: number) =>
    !!logoZone &&
    c + q + 1 > logoZone.min &&
    c + q < logoZone.max &&
    r + q + 1 > logoZone.min &&
    r + q < logoZone.max

  let dots = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix.isDark(r, c) || inEye(r, c) || inLogo(r, c)) continue
      dots += dotPath(options.dotStyle, c + q, r + q)
    }
  }

  const eyes = [
    [q, q],
    [q + n - EYE, q],
    [q, q + n - EYE]
  ]
    .map(([x, y]) => eyeMarkup(options.cornerStyle, x, y, cornerSquare, cornerDot))
    .join('')

  const logoMarkup =
    logo && logoZone
      ? `<image href="${xml(logo.src)}" x="${num(q + (n - logoSide) / 2)}" y="${num(q + (n - logoSide) / 2)}" width="${num(logoSide)}" height="${num(logoSide)}" preserveAspectRatio="xMidYMid meet"/>`
      : ''

  let captionMarkup = ''
  if (caption) {
    // Shrink long captions so they stay inside the quiet zone.
    const available = width - 2 * Math.max(q, 1)
    const fontSize = Math.min(width * 0.055, available / (caption.length * 0.58))
    const baseline = width + captionHeight / 2 + fontSize * 0.35 - q * 0.25
    captionMarkup = `<text x="${num(width / 2)}" y="${num(baseline)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${num(fontSize)}" font-weight="600" fill="${foreground}">${xml(caption)}</text>`
  }

  const title = xml(options.title ?? (caption || 'QR code'))
  const rendering =
    options.dotStyle === 'square' && options.cornerStyle === 'square'
      ? 'crispEdges'
      : 'geometricPrecision'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" width="${options.size}" height="${pixelHeight}" role="img" aria-label="${title}">` +
    `<title>${title}</title>` +
    `<rect width="${num(width)}" height="${num(height)}" fill="${background}"/>` +
    `<path d="${dots}" fill="${foreground}" shape-rendering="${rendering}"/>` +
    `<g shape-rendering="${rendering}">${eyes}</g>` +
    logoMarkup +
    captionMarkup +
    `</svg>`
  )
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}
