'use client'

import { QrBuilder, type QrBuilderEvent } from '@pgahq/qr-codes/react'
import { useState } from 'react'

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
        <QrBuilder appearance={{ foreground: '#00205B' }} onEvent={onEvent} />
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
