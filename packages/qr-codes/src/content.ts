export type QrContentType = 'url' | 'wifi' | 'sms' | 'text'

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass'

export interface UrlContent {
  type: 'url'
  url: string
}

export interface WifiContent {
  type: 'wifi'
  ssid: string
  password?: string
  security?: WifiSecurity
  hidden?: boolean
}

export interface SmsContent {
  type: 'sms'
  phone: string
  message?: string
}

export interface TextContent {
  type: 'text'
  text: string
}

export type QrContent = UrlContent | WifiContent | SmsContent | TextContent

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string }

export const SMS_MESSAGE_MAX_LENGTH = 159
export const TEXT_MAX_LENGTH = 1000

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = (error: string, field?: string): Result<never> => ({
  ok: false,
  error,
  field
})

/** Turns pasted "smart" punctuation into plain ASCII so phones decode it reliably. */
export function normalizePunctuation(input: string): string {
  return input.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
}

/**
 * Accepts "pga.org", "http://pga.org/x" or "https://pga.org" and returns a
 * normalized absolute http(s) URL, or null when the input cannot be one.
 * Other schemes (javascript:, data:, ftp:) are rejected on purpose.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed || /\s/.test(trimmed)) return null

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  const hasAuthorityScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
  if (hasScheme && !hasAuthorityScheme) {
    // "localhost:3000" parses as a scheme; anything else with a bare colon
    // (mailto:, javascript:, data:) is not something we encode as a URL.
    if (!/^[^:/]+:\d+(\/|$)/.test(trimmed)) return null
  }

  const candidate = hasAuthorityScheme ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
    return null
  }
  return parsed.toString()
}

export const SUGGESTED_CAPTION_MAX_LENGTH = 40

/**
 * A short, human-friendly caption for content: "https://www.pga.com/a/b?x=1"
 * becomes "pga.com/a/b". Long paths are cut with an ellipsis. Returns "" when
 * there is nothing sensible to suggest.
 */
export function suggestCaption(content: QrContent): string {
  switch (content.type) {
    case 'url': {
      const normalized = normalizeUrl(content.url)
      if (!normalized) return ''
      const { hostname, pathname } = new URL(normalized)
      const path = pathname === '/' ? '' : pathname.replace(/\/+$/, '')
      const label = `${hostname.replace(/^www\./, '')}${path}`
      return label.length > SUGGESTED_CAPTION_MAX_LENGTH
        ? `${label.slice(0, SUGGESTED_CAPTION_MAX_LENGTH - 1).trimEnd()}\u2026`
        : label
    }
    case 'wifi':
      return content.ssid.trim().slice(0, SUGGESTED_CAPTION_MAX_LENGTH)
    default:
      return ''
  }
}

/** Escapes the characters that are special in the Wi-Fi QR format. */
export function escapeWifiField(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, '')
  return /^\+?\d{3,15}$/.test(compact) ? compact : null
}

/**
 * Validates structured content and produces the exact string that is encoded
 * into the QR code (the payload).
 */
export function encodeQrContent(content: QrContent): Result<string> {
  switch (content.type) {
    case 'url': {
      if (!content.url.trim()) return fail('Enter a URL.', 'url')
      const url = normalizeUrl(content.url)
      return url ? ok(url) : fail('Enter a valid http(s) URL.', 'url')
    }

    case 'wifi': {
      const ssid = content.ssid
      if (!ssid) return fail('Enter the network name.', 'ssid')
      const security = content.security ?? 'WPA'
      const password = content.password ?? ''
      if (security !== 'nopass' && !password) {
        return fail('Enter the network password.', 'password')
      }
      const parts = [
        `T:${security}`,
        `S:${escapeWifiField(ssid)}`,
        security === 'nopass' ? '' : `P:${escapeWifiField(password)}`,
        content.hidden ? 'H:true' : ''
      ].filter(Boolean)
      return ok(`WIFI:${parts.join(';')};;`)
    }

    case 'sms': {
      const phone = normalizePhone(content.phone)
      if (!phone) {
        return fail('Enter a phone number, e.g. +18005551212.', 'phone')
      }
      const message = normalizePunctuation(content.message ?? '')
      if (message.length > SMS_MESSAGE_MAX_LENGTH) {
        return fail(
          `Message must be ${SMS_MESSAGE_MAX_LENGTH} characters or fewer.`,
          'message'
        )
      }
      return ok(message ? `smsto:${phone}:${message}` : `smsto:${phone}`)
    }

    case 'text': {
      if (!content.text) return fail('Enter some text.', 'text')
      if (content.text.length > TEXT_MAX_LENGTH) {
        return fail(`Text must be ${TEXT_MAX_LENGTH} characters or fewer.`, 'text')
      }
      return ok(content.text)
    }
  }
}
