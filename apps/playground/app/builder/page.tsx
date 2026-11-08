'use client'

import { PGA_LOGOS } from '@pgahq/qr-codes'
import { QrBuilder, type QrBuilderEvent, type QrBuilderState } from '@pgahq/qr-codes/react'
import { useState } from 'react'

/** URL of the same code from this app's /api/qr route (URL codes only, since GET links should not carry secrets). */
function apiImageLink(state: QrBuilderState): string | null {
  if (typeof window === 'undefined' || state.tab !== 'url' || !state.qr.payload) return null
  const { foreground = '#000000', dotStyle = 'square', cornerStyle = 'square', caption, logo } = state.appearance
  const params = new URLSearchParams({
    url: state.qr.payload,
    format: 'png',
    fg: foreground.replace('#', ''),
    dotStyle,
    cornerStyle
  })
  if (caption) params.set('caption', caption)
  const preset = Object.entries(PGA_LOGOS).find(([, value]) => value.src === logo?.src)?.[0]
  if (preset) {
    params.set('logo', preset)
    if (logo?.grayscale) params.set('logoGrayscale', '1')
  }
  return `${window.location.origin}/api/qr?${params}`
}

export default function BuilderPage() {
  const [events, setEvents] = useState<string[]>([])

  const onEvent = (event: QrBuilderEvent) =>
    setEvents((prev) => [`${new Date().toLocaleTimeString()}  ${JSON.stringify(event)}`, ...prev].slice(0, 20))

  return (
    <div className="stack">
      <div>
        <h1>Builder</h1>
        <p className="lede">
          The full builder component. <code>onEvent</code> replaces the Google Tag Manager calls from the old Gatsby
          component, so each app decides where analytics go.
        </p>
      </div>

      <div className="card">
        <QrBuilder onEvent={onEvent} link={apiImageLink} linkLabel="Image link" />
      </div>

      <div className="card">
        <strong>onEvent log</strong>
        {events.length === 0 ? (
          <p className="muted">Interact with the builder, then download or copy.</p>
        ) : (
          <ol className="log">
            {events.map((line, i) => (
              <li key={i}>
                <code>{line}</code>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
