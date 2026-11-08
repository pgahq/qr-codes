'use client'

import { useEffect, useMemo, useState } from 'react'

type Type = 'url' | 'wifi' | 'sms' | 'text'

interface Form {
  type: Type
  url: string
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
  phone: string
  message: string
  text: string
  format: 'svg' | 'png'
  size: string
  fg: string
  bg: string
  dotStyle: string
  cornerStyle: string
  caption: string
  logo: string
  method: 'GET' | 'POST'
}

const initial: Form = {
  type: 'url',
  url: 'https://www.pga.org/championship',
  ssid: 'Club House',
  password: 'fairway123',
  security: 'WPA',
  hidden: false,
  phone: '+18005551212',
  message: 'Hello from the PGA',
  text: 'PGA of America',
  format: 'svg',
  size: '512',
  fg: '#00234b',
  bg: '#ffffff',
  dotStyle: 'square',
  cornerStyle: 'square',
  caption: '',
  logo: '',
  method: 'GET'
}

const FIELDS_BY_TYPE: Record<Type, (keyof Form)[]> = {
  url: ['url'],
  wifi: ['ssid', 'password', 'security', 'hidden'],
  sms: ['phone', 'message'],
  text: ['text']
}

function buildParams(form: Form): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = { type: form.type, format: form.format }
  for (const key of FIELDS_BY_TYPE[form.type]) {
    const value = form[key]
    if (value !== '' && value !== false) params[key] = value as string | boolean
  }
  for (const key of ['size', 'dotStyle', 'cornerStyle', 'caption', 'logo'] as const) {
    if (form[key]) params[key] = form[key]
  }
  params.fg = form.fg.replace('#', '')
  params.bg = form.bg.replace('#', '')
  return params
}

export default function ApiPlayground() {
  const [form, setForm] = useState<Form>(initial)
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const params = useMemo(() => buildParams(form), [form])
  const query = useMemo(() => new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString(), [params])
  const getPath = `/api/qr?${query}`

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null

    const timer = setTimeout(async () => {
      try {
        const response =
          form.method === 'GET'
            ? await fetch(getPath, { signal: controller.signal })
            : await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
                signal: controller.signal
              })

        setStatus(`${response.status} ${response.headers.get('content-type') ?? ''} | cache-control: ${response.headers.get('cache-control') ?? ''}`)
        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: response.statusText }))
          setError(body.field ? `${body.field}: ${body.error}` : body.error)
          setSrc(null)
          return
        }
        objectUrl = URL.createObjectURL(await response.blob())
        setError(null)
        setSrc(objectUrl)
      } catch (cause) {
        if ((cause as Error).name !== 'AbortError') setError('Request failed.')
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 1_000)
    }
  }, [form.method, getPath, params])

  const curl =
    form.method === 'GET'
      ? `curl -o qr.${form.format} '<origin>${getPath}'`
      : `curl -X POST <origin>/api/qr \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(params)}' \\\n  -o qr.${form.format}`

  const text = (key: keyof Form, label: string, type = 'text') => (
    <label key={key}>
      {label}
      <input type={type} value={String(form[key])} onChange={(e) => set(key, e.target.value as never)} />
    </label>
  )

  const select = (key: keyof Form, label: string, options: string[]) => (
    <label key={key}>
      {label}
      <select value={String(form[key])} onChange={(e) => set(key, e.target.value as never)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option || '(none)'}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="stack">
      <div>
        <h1>API</h1>
        <p className="lede">
          <code>/api/qr</code> is a two-line route over <code>createQrHandler</code>. Use <code>GET</code> for
          <code> &lt;img src&gt;</code> and links, and <code>POST</code> for secrets like Wi-Fi passwords, since URLs end up in
          logs and caches.
        </p>
      </div>

      <div className="two-col">
        <div className="card stack">
          <div className="form-grid">
            {select('type', 'Type', ['url', 'wifi', 'sms', 'text'])}
            {select('method', 'HTTP method', ['GET', 'POST'])}
            {select('format', 'Format', ['svg', 'png'])}
          </div>

          <div className="form-grid">
            {form.type === 'url' && text('url', 'URL')}
            {form.type === 'wifi' && (
              <>
                {text('ssid', 'Network name')}
                {select('security', 'Security', ['WPA', 'WEP', 'nopass'])}
                {form.security !== 'nopass' && text('password', 'Password')}
                <label>
                  Hidden network
                  <input type="checkbox" checked={form.hidden} onChange={(e) => set('hidden', e.target.checked)} />
                </label>
              </>
            )}
            {form.type === 'sms' && (
              <>
                {text('phone', 'Phone')}
                {text('message', 'Message')}
              </>
            )}
            {form.type === 'text' && text('text', 'Text')}
          </div>

          <div className="form-grid">
            {text('size', 'Size (px)', 'number')}
            {text('fg', 'Foreground', 'color')}
            {text('bg', 'Background', 'color')}
            {select('dotStyle', 'Dot style', ['square', 'rounded', 'dots'])}
            {select('cornerStyle', 'Corner style', ['square', 'rounded', 'dot'])}
            {select('logo', 'Logo preset', ['', 'blue', 'circle'])}
            {text('caption', 'Caption')}
          </div>

          <div className="stack">
            <strong>Request</strong>
            <pre>{form.method === 'GET' ? `GET ${getPath}` : `POST /api/qr\n${JSON.stringify(params, null, 2)}`}</pre>
            <strong>curl</strong>
            <pre>{curl}</pre>
            <strong>Response</strong>
            <pre>{status || '...'}</pre>
          </div>
        </div>

        <div className="stack">
          <div className="preview" aria-live="polite">
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="Generated QR code" />
            ) : (
              <span className="muted">Generating…</span>
            )}
          </div>
          {form.method === 'GET' && !error && (
            <div className="row">
              <a className="btn secondary" href={`${getPath}&download=1`} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Download via API
              </a>
              <a className="btn secondary" href={getPath} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Open raw response
              </a>
            </div>
          )}
          {form.type === 'wifi' && form.method === 'GET' && (
            <p className="muted">GET with a Wi-Fi password puts it in the URL. The handler marks these responses no-store, but prefer POST.</p>
          )}
        </div>
      </div>
    </div>
  )
}
