import type { QrAppearance } from './appearance'
import { QrRenderError } from './svg'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const DATA_URI = /^data:(image\/(?:png|jpeg|webp|gif));base64,[a-z0-9+/=]+$/i

export interface InlineLogoOptions {
  /**
   * Hostnames a remote logo may be fetched from (exact match or subdomain).
   * Omit in the browser (CORS already limits it); always set it on a server
   * that accepts logo URLs from callers, to avoid server-side request forgery.
   */
  allowedHosts?: readonly string[]
  maxBytes?: number
  timeoutMs?: number
  fetch?: typeof fetch
}

const hostAllowed = (host: string, allowed: readonly string[]) =>
  allowed.some((entry) => host === entry || host.endsWith(`.${entry}`))

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Resolves a logo to a `data:` URI. Required before rasterizing, because
 * browsers and renderers do not load external images referenced from an SVG
 * that is itself used as an image.
 */
export async function logoToDataUri(
  src: string,
  options: InlineLogoOptions = {}
): Promise<string> {
  if (src.startsWith('data:')) {
    if (!DATA_URI.test(src)) {
      throw new QrRenderError('Logo must be a base64 png, jpeg, webp or gif.', 'logo')
    }
    return src
  }

  let url: URL
  try {
    url = new URL(src)
  } catch {
    throw new QrRenderError('Logo must be an https URL or data URI.', 'logo')
  }
  if (url.protocol !== 'https:') {
    throw new QrRenderError('Logo URL must use https.', 'logo')
  }
  if (options.allowedHosts && !hostAllowed(url.hostname, options.allowedHosts)) {
    throw new QrRenderError(`Logo host ${url.hostname} is not allowed.`, 'logo')
  }

  const { maxBytes = 1_000_000, timeoutMs = 5_000, fetch: fetchImpl = fetch } = options

  let response: Response
  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error'
    })
  } catch {
    throw new QrRenderError('Could not load the logo image.', 'logo')
  }
  if (!response.ok) {
    throw new QrRenderError(`Logo request failed (${response.status}).`, 'logo')
  }

  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new QrRenderError('Logo must be a png, jpeg, webp or gif.', 'logo')
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > maxBytes) {
    throw new QrRenderError(`Logo must be smaller than ${Math.round(maxBytes / 1000)} KB.`, 'logo')
  }
  return `data:${type};base64,${toBase64(bytes)}`
}

/** Returns the appearance with `logo.src` replaced by an embedded data URI. */
export async function withInlinedLogo(
  appearance: QrAppearance,
  options?: InlineLogoOptions
): Promise<QrAppearance> {
  if (!appearance.logo) return appearance
  return {
    ...appearance,
    logo: { ...appearance.logo, src: await logoToDataUri(appearance.logo.src, options) }
  }
}
