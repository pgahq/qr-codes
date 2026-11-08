import {
  CAPTION_MAX_LENGTH,
  SIZE_RANGE,
  type CornerStyle,
  type DotStyle,
  type ErrorCorrection,
  type QrAppearance
} from '../appearance'
import { encodeQrContent, type QrContent, type Result, type WifiSecurity } from '../content'

export type QrFormat = 'svg' | 'png'

export interface QrRequest {
  content: QrContent
  /** Validated payload string that will be encoded. */
  payload: string
  appearance: QrAppearance
  format: QrFormat
  filename: string
  download: boolean
}

export interface ParseOptions {
  /** Named logos callers may reference as `logo=<key>`. */
  logoPresets?: Readonly<Record<string, string>>
  defaultAppearance?: QrAppearance
  /** When false, `logo` must be a preset key (no arbitrary URLs / data URIs). Default true. */
  allowCustomLogo?: boolean
}

type Params = Record<string, unknown>

const fail = (error: string, field?: string): Result<never> => ({ ok: false, error, field })

const str = (params: Params, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = params[key]
    if (typeof value === 'string' && value !== '') return value
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

const bool = (params: Params, key: string): boolean => {
  const value = params[key]
  return value === true || value === 'true' || value === '1' || value === 1
}

const oneOf = <T extends string>(value: string | undefined, allowed: readonly T[]): T | null | undefined => {
  if (value === undefined) return undefined
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

const hexColor = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : /^[0-9a-f]{3,8}$/i.test(value) ? `#${value}` : value

/**
 * Parses a flat key/value request (URL search params or a JSON body) into a
 * validated {@link QrRequest}. Never throws; returns the first problem found.
 */
export function parseQrRequest(params: Params, options: ParseOptions = {}): Result<QrRequest> {
  const type = str(params, 'type') ?? 'url'
  let content: QrContent
  switch (type) {
    case 'url':
      content = { type, url: str(params, 'url') ?? '' }
      break
    case 'wifi': {
      const security = oneOf<WifiSecurity>(str(params, 'security'), ['WPA', 'WEP', 'nopass'])
      if (security === null) return fail('security must be WPA, WEP or nopass.', 'security')
      content = {
        type,
        ssid: str(params, 'ssid') ?? '',
        password: str(params, 'password'),
        security,
        hidden: bool(params, 'hidden')
      }
      break
    }
    case 'sms':
      content = { type, phone: str(params, 'phone') ?? '', message: str(params, 'message') }
      break
    case 'text':
      content = { type, text: str(params, 'text') ?? '' }
      break
    default:
      return fail('type must be one of url, wifi, sms, text.', 'type')
  }

  const encoded = encodeQrContent(content)
  if (!encoded.ok) return encoded

  const format = oneOf<QrFormat>(str(params, 'format'), ['svg', 'png'])
  if (format === null) return fail('format must be svg or png.', 'format')

  const dotStyle = oneOf<DotStyle>(str(params, 'dotStyle'), ['square', 'rounded', 'dots'])
  if (dotStyle === null) return fail('dotStyle must be square, rounded or dots.', 'dotStyle')
  const cornerStyle = oneOf<CornerStyle>(str(params, 'cornerStyle'), ['square', 'rounded', 'dot'])
  if (cornerStyle === null) return fail('cornerStyle must be square, rounded or dot.', 'cornerStyle')
  const errorCorrection = oneOf<ErrorCorrection>(str(params, 'errorCorrection'), ['L', 'M', 'Q', 'H'])
  if (errorCorrection === null) return fail('errorCorrection must be L, M, Q or H.', 'errorCorrection')

  const numeric = (key: string): number | undefined | null => {
    const raw = str(params, key)
    if (raw === undefined) return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }
  const size = numeric('size')
  if (size === null || (size !== undefined && (size < SIZE_RANGE.min || size > SIZE_RANGE.max))) {
    return fail(`size must be a number between ${SIZE_RANGE.min} and ${SIZE_RANGE.max}.`, 'size')
  }
  const margin = numeric('margin')
  if (margin === null) return fail('margin must be a number.', 'margin')
  const logoScale = numeric('logoScale')
  if (logoScale === null) return fail('logoScale must be a number.', 'logoScale')

  const caption = str(params, 'caption')
  if (caption !== undefined && caption.length > CAPTION_MAX_LENGTH) {
    return fail(`caption must be ${CAPTION_MAX_LENGTH} characters or fewer.`, 'caption')
  }

  let logoSrc: string | undefined
  const logoParam = str(params, 'logo')
  if (logoParam !== undefined) {
    const preset = options.logoPresets?.[logoParam]
    if (preset) {
      logoSrc = preset
    } else if (options.allowCustomLogo === false) {
      const keys = Object.keys(options.logoPresets ?? {}).join(', ') || 'none configured'
      return fail(`logo must be one of: ${keys}.`, 'logo')
    } else {
      logoSrc = logoParam
    }
  }

  const appearance: QrAppearance = {
    ...options.defaultAppearance,
    ...(size !== undefined && { size }),
    ...(margin !== undefined && { margin }),
    ...(caption !== undefined && { caption }),
    ...(dotStyle && { dotStyle }),
    ...(cornerStyle && { cornerStyle }),
    ...(errorCorrection && { errorCorrection }),
    ...(str(params, 'fg', 'foreground') && { foreground: hexColor(str(params, 'fg', 'foreground')) }),
    ...(str(params, 'bg', 'background') && { background: hexColor(str(params, 'bg', 'background')) }),
    ...(str(params, 'cornerSquareColor') && { cornerSquareColor: hexColor(str(params, 'cornerSquareColor')) }),
    ...(str(params, 'cornerDotColor') && { cornerDotColor: hexColor(str(params, 'cornerDotColor')) }),
    ...(logoSrc && { logo: { src: logoSrc, ...(logoScale !== undefined && { scale: logoScale }) } })
  }

  return {
    ok: true,
    value: {
      content,
      payload: encoded.value,
      appearance,
      format: format ?? 'svg',
      filename: (str(params, 'filename') ?? caption ?? 'PGA-qr-code').replace(/[\\/:*?"<>|\r\n]+/g, '-').slice(0, 100),
      download: bool(params, 'download')
    }
  }
}
