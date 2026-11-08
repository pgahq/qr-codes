import { describe, expect, it, vi } from 'vitest'
import { createQrHandler } from '../server'
import { parseQrRequest } from '../server/request'

const PIXEL_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
)

const handler = createQrHandler()
const get = (query: string) => handler(new Request(`https://qr.test/api/qr?${query}`))
const post = (body: unknown) =>
  handler(new Request('https://qr.test/api/qr', { method: 'POST', body: JSON.stringify(body) }))

describe('createQrHandler', () => {
  it('returns an svg for GET', async () => {
    const response = await get('url=pga.org&caption=Hello')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('image/svg+xml')
    expect(response.headers.get('cache-control')).toContain('public')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response.text()).toContain('<svg')
  })

  it('returns a png', async () => {
    const response = await get('url=pga.org&format=png&size=300')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(Array.from(bytes.slice(1, 4))).toEqual([0x50, 0x4e, 0x47])
  })

  it('sets a download filename', async () => {
    const response = await get('url=pga.org&format=svg&download=1&filename=My%20Code')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="My Code.svg"')
  })

  it('accepts POST json and never caches it', async () => {
    const response = await post({ type: 'wifi', ssid: 'Club', password: 'secret' })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('does not cache wifi credentials sent via GET', async () => {
    const response = await get('type=wifi&ssid=Club&password=secret')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it.each([
    ['type=nope', 'type'],
    ['', 'url'],
    ['url=javascript:alert(1)', 'url'],
    ['url=pga.org&format=gif', 'format'],
    ['url=pga.org&size=99999', 'size'],
    ['url=pga.org&dotStyle=star', 'dotStyle'],
    ['url=pga.org&fg=nothex', 'foreground'],
    ['type=sms&phone=abc', 'phone']
  ])('rejects %j', async (query, field) => {
    const response = await get(query)
    expect([400, 422]).toContain(response.status)
    expect((await response.json()).field).toBe(field)
  })

  it('rejects bad bodies and methods', async () => {
    expect((await handler(new Request('https://qr.test/', { method: 'POST', body: '[1]' }))).status).toBe(400)
    const put = await handler(new Request('https://qr.test/', { method: 'PUT' }))
    expect(put.status).toBe(405)
    expect(put.headers.get('allow')).toBe('GET, POST')
  })

  it('embeds preset logos by fetching them once', async () => {
    const fetchMock = vi.fn(async () => new Response(PIXEL_PNG, { headers: { 'content-type': 'image/png' } }))
    const withFetch = createQrHandler({ fetch: fetchMock as unknown as typeof fetch })
    const response = await withFetch(new Request('https://qr.test/?url=pga.org&logo=blue'))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('data:image/png;base64,')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('blocks logo hosts that are not allowed (SSRF guard)', async () => {
    const fetchMock = vi.fn()
    const guarded = createQrHandler({ fetch: fetchMock as unknown as typeof fetch })
    const response = await guarded(new Request('https://qr.test/?url=pga.org&logo=https://169.254.169.254/latest'))
    expect(response.status).toBe(422)
    expect((await response.json()).field).toBe('logo')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks non-image logo responses and oversize logos', async () => {
    const html = createQrHandler({ fetch: (async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })) as typeof fetch })
    expect((await html(new Request('https://qr.test/?url=pga.org&logo=blue'))).status).toBe(422)
  })

  it('can restrict logos to presets only', () => {
    const result = parseQrRequest({ url: 'pga.org', logo: 'https://evil.test/x.png' }, { logoPresets: { blue: 'https://a.test/b.png' }, allowCustomLogo: false })
    expect(result).toMatchObject({ ok: false, field: 'logo' })
  })
})

describe('parseQrRequest', () => {
  it('accepts colors without a leading #', () => {
    const result = parseQrRequest({ url: 'pga.org', fg: '00205B', bg: 'fff' })
    expect(result).toMatchObject({ ok: true, value: { appearance: { foreground: '#00205B', background: '#fff' } } })
  })
})
