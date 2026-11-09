'use client'

import { copyTextToClipboard } from '@pgahq/qr-codes'
import { useEffect, useRef, useState, type ReactNode } from 'react'

function Icon({ children, strokeWidth = 2 }: { children: ReactNode; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CodeBlock({ code, label }: { code: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await copyTextToClipboard(code)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 1500)
  }

  return (
    <div className="code-block">
      <pre aria-label={`${label} code`}>
        <code>{code}</code>
      </pre>
      <button
        type="button"
        className="copy-button"
        onClick={copy}
        aria-label={`Copy ${label} code`}
        title={status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : 'Copy'}
      >
        {status === 'copied' ? (
          <Icon strokeWidth={2.5}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </Icon>
        ) : status === 'error' ? (
          <Icon>
            <path d="M6 6l12 12M18 6L6 18" />
          </Icon>
        ) : (
          <Icon>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
          </Icon>
        )}
      </button>
      <span className="visually-hidden" role="status">
        {status === 'copied' ? `${label} code copied` : status === 'error' ? `${label} code could not be copied` : ''}
      </span>
    </div>
  )
}
