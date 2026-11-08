import { PGA_LOGOS } from '../appearance'
import { withInlinedLogo } from '../assets'
import { QrRenderError, renderQrSvg } from '../svg'
import { renderPng, PngUnavailableError } from './png'
import { parseQrRequest, type ParseOptions } from './request'

export interface QrHandlerOptions extends ParseOptions {
  /** Extra hosts custom `logo=<https url>` values may be fetched from. Preset hosts are always allowed. */
  allowedLogoHosts?: readonly string[]
  /** Browser/CDN cache lifetime for GET responses. Default 1 day. Use 0 to disable. */
  maxAgeSeconds?: number
  /** Font files for PNG captions on hosts without system fonts. */
  fontFiles?: string[]
  fetch?: typeof fetch
}

const DEFAULT_LOGO_PRESETS = Object.fromEntries(
  Object.entries(PGA_LOGOS).map(([key, logo]) => [key, logo.src])
)

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'"
}

const json = (status: number, body: Record<string, unknown>, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

async function readParams(request: Request): Promise<Record<string, unknown> | Response> {
  if (request.method === 'GET') {
    return Object.fromEntries(new URL(request.url).searchParams)
  }
  try {
    const body: unknown = await request.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }
  } catch {
    // fall through to the error below
  }
  return json(400, { error: 'Request body must be a JSON object.' })
}

/**
 * Creates a Web-standard `(Request) => Promise<Response>` that renders QR codes.
 *
 * - `GET  ?type=url&url=...&format=png` for `<img src>` and links.
 * - `POST` with the same fields as JSON, for secrets such as Wi-Fi passwords
 *   (URLs end up in logs and caches; bodies do not).
 *
 * It owns validation, logo fetching and rendering but not routing, auth, or
 * rate limiting; mount it from the app (e.g. `export const GET = handler`) and
 * wrap it with whatever the app needs.
 */
export function createQrHandler(options: QrHandlerOptions = {}) {
  const {
    allowedLogoHosts: extraLogoHosts = [],
    maxAgeSeconds = 86_400,
    fontFiles,
    fetch: fetchImpl,
    ...parseOptions
  } = options
  const logoPresets = parseOptions.logoPresets ?? DEFAULT_LOGO_PRESETS
  const allowedLogoHosts = [
    ...new Set([...Object.values(logoPresets).map((src) => new URL(src).hostname), ...extraLogoHosts])
  ]

  return async function handleQrRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return json(405, { error: 'Use GET or POST.' }, { Allow: 'GET, POST' })
    }

    const params = await readParams(request)
    if (params instanceof Response) return params

    const parsed = parseQrRequest(params, { ...parseOptions, logoPresets })
    if (!parsed.ok) return json(400, { error: parsed.error, field: parsed.field })
    const { content, payload, appearance, format, filename, download } = parsed.value

    try {
      const inlined = await withInlinedLogo(appearance, {
        allowedHosts: allowedLogoHosts,
        fetch: fetchImpl
      })
      const svg = renderQrSvg(payload, inlined)

      const sensitive = request.method !== 'GET' || content.type === 'wifi'
      const headers: Record<string, string> = {
        ...SECURITY_HEADERS,
        'Cache-Control':
          sensitive || maxAgeSeconds === 0
            ? 'no-store'
            : `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`
      }
      if (download) {
        headers['Content-Disposition'] = `attachment; filename="${filename.replace(/[^\w .-]+/g, '-')}.${format}"`
      }

      if (format === 'svg') {
        return new Response(svg, {
          headers: { ...headers, 'Content-Type': 'image/svg+xml; charset=utf-8' }
        })
      }

      const png = await renderPng(svg, { width: inlined.size ?? 1024, fontFiles })
      return new Response(png as BodyInit, { headers: { ...headers, 'Content-Type': 'image/png' } })
    } catch (error) {
      if (error instanceof QrRenderError) {
        return json(422, { error: error.message, field: error.field })
      }
      if (error instanceof PngUnavailableError) {
        return json(501, { error: error.message })
      }
      console.error('[qr-code] unexpected render failure', error)
      return json(500, { error: 'Could not generate the QR code.' })
    }
  }
}
