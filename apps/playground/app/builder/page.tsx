'use client'

import type { QrAppearance, QrContent } from '@pgahq/qr-codes'
import { QrBuilder, type QrBuilderEvent } from '@pgahq/qr-codes/react'
import { useState } from 'react'
import { CodeBlock } from '../code-block'
import { apiSnippet, coreSnippet, imageLink, reactSnippet } from '../code-snippets'

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div className="stack">
      <strong>{title}</strong>
      <CodeBlock code={code} label={title} />
    </div>
  )
}

export default function BuilderPage() {
  const [events, setEvents] = useState<string[]>([])
  const [snapshot, setSnapshot] = useState<{ content: QrContent; appearance: QrAppearance } | null>(null)

  const link = snapshot ? imageLink(snapshot.content, snapshot.appearance, window.location.origin) : null

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
        <QrBuilder
          autoFocus
          onEvent={onEvent}
          onChange={setSnapshot}
          link={(state) =>
            typeof window === 'undefined' ? null : imageLink(state.content, state.appearance, window.location.origin)
          }
        />
      </div>

      <div className="card stack">
        <div>
          <h2 className="section-title">Code for this QR code</h2>
          <p className="muted">Updates as you change the builder above.</p>
        </div>
        {snapshot && (
          <>
            <Snippet title={'React: <QrCode />'} code={reactSnippet(snapshot.content, snapshot.appearance)} />
            <Snippet title="Core: renderQrSvg" code={coreSnippet(snapshot.content, snapshot.appearance)} />
            <Snippet
              title="API: POST /api/qr"
              code={apiSnippet(snapshot.content, snapshot.appearance, `${window.location.origin}/api/qr`)}
            />
            <div className="stack">
              <strong>Link button URL</strong>
              {link ? (
                <CodeBlock code={link} label="Link button URL" />
              ) : (
                <p className="muted">
                  {snapshot.content.type === 'url'
                    ? 'Enter a valid URL to get a link.'
                    : 'The link is only available for URL codes. Use the POST request above for Wi-Fi and text codes.'}
                </p>
              )}
            </div>
          </>
        )}
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
