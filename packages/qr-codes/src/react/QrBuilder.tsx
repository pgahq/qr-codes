import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { CAPTION_MAX_LENGTH } from '../appearance'
import { SMS_MESSAGE_MAX_LENGTH, normalizeUrl } from '../content'
import { QrCode } from './QrCode'
import {
  useQrBuilder,
  type BuilderTab,
  type QrBuilderState,
  type UseQrBuilderOptions
} from './useQrBuilder'

export interface QrBuilderProps extends UseQrBuilderOptions {
  className?: string
  /**
   * Upload a custom logo and return a https URL (e.g. to Cloudinary).
   * Default: the image is read locally and embedded as a data URI, so nothing leaves the browser.
   */
  onUploadLogo?: (file: File) => Promise<string>
  /** Set false to hide the custom logo upload. */
  allowLogoUpload?: boolean
  /** Placeholder shown until the content is valid. Default: the first logo preset. */
  placeholder?: ReactNode
}

const TABS: { id: BuilderTab; label: string; title: string }[] = [
  { id: 'url', label: 'Open webpage', title: 'URL' },
  { id: 'wifi', label: 'Join Wi-Fi', title: 'Wi-Fi' },
  { id: 'sms', label: 'Send a text', title: 'SMS' }
]

const TAB_COPY: Record<BuilderTab, { subtitle: string; description: string }> = {
  url: {
    subtitle: 'Quickly share any webpage:',
    description: "When someone scans the QR code from their phone, it'll open their browser to the page / URL you specify."
  },
  wifi: {
    subtitle: 'A quick way to share your Wi-Fi network:',
    description: "When someone scans the QR code from their phone, it'll connect their phone to Wi-Fi."
  },
  sms: {
    subtitle: 'Quickly send a text message:',
    description: "When someone scans the QR code from their phone, it'll pre-fill a text message to the phone number you specify."
  }
}

const MAX_UPLOAD_BYTES = 1_000_000

function readFileAsDataUri(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    return Promise.reject(new Error('Choose a png, jpeg, webp or gif image.'))
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error('Image must be smaller than 1 MB.'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image.'))
    reader.readAsDataURL(file)
  })
}

function Field({
  label,
  required,
  error,
  hint,
  id,
  children
}: {
  label: string
  required?: boolean
  error?: string | null
  hint?: string | null
  id: string
  children: ReactNode
}) {
  return (
    <div className="pga-qr-field">
      <label htmlFor={id} className="pga-qr-label">
        {label}
        {required && (
          <span className="pga-qr-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="pga-qr-error" id={`${id}-msg`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="pga-qr-hint" id={`${id}-msg`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function Tabs({ state, idPrefix }: { state: QrBuilderState; idPrefix: string }) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((t) => t.id === state.tab)
    const next =
      event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : -1
    if (next < 0) return
    event.preventDefault()
    state.setTab(TABS[next].id)
    document.getElementById(`${idPrefix}-tab-${TABS[next].id}`)?.focus()
  }

  return (
    <div role="tablist" aria-label="QR code type" className="pga-qr-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-selected={state.tab === tab.id}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={state.tab === tab.id ? 0 : -1}
          className="pga-qr-tab"
          onClick={() => state.setTab(tab.id)}
          onKeyDown={onKeyDown}
        >
          <span className="pga-qr-tab-label">{tab.label}</span>
          <span className="pga-qr-tab-title">{tab.title}</span>
        </button>
      ))}
    </div>
  )
}

function ContentFields({ state, idPrefix }: { state: QrBuilderState; idPrefix: string }) {
  const { tab, qr } = state
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }))
  const errorFor = (field: string) =>
    qr.error && qr.field === field && (field === 'message' || touched[field]) ? qr.error : null

  if (tab === 'url') {
    const normalized = state.url.trim() ? normalizeUrl(state.url) : null
    return (
      <Field
        id={`${idPrefix}-url`}
        label="URL"
        required
        error={errorFor('url')}
        hint={normalized && normalized !== state.url.trim() ? `Will open ${normalized}` : null}
      >
        <input
          id={`${idPrefix}-url`}
          className="pga-qr-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://pga.com"
          value={state.url}
          aria-describedby={`${idPrefix}-url-msg`}
          onChange={(event) => state.setUrl(event.target.value)}
          onBlur={() => touch('url')}
        />
      </Field>
    )
  }

  if (tab === 'wifi') {
    const { wifi } = state
    return (
      <>
        <Field id={`${idPrefix}-ssid`} label="Network name" required error={errorFor('ssid')}>
          <input
            id={`${idPrefix}-ssid`}
            className="pga-qr-input"
            type="text"
            autoComplete="off"
            value={wifi.ssid}
            aria-describedby={`${idPrefix}-ssid-msg`}
            onChange={(event) => state.setWifi({ ...wifi, ssid: event.target.value })}
            onBlur={() => touch('ssid')}
          />
        </Field>
        <Field id={`${idPrefix}-security`} label="Network type" required>
          <select
            id={`${idPrefix}-security`}
            className="pga-qr-input"
            value={wifi.security}
            onChange={(event) => state.setWifi({ ...wifi, security: event.target.value as typeof wifi.security })}
          >
            <option value="WEP">WEP</option>
            <option value="WPA">WPA/WPA2</option>
            <option value="nopass">No encryption</option>
          </select>
        </Field>
        {wifi.security !== 'nopass' && (
          <Field id={`${idPrefix}-password`} label="Password" required error={errorFor('password')}>
            <input
              id={`${idPrefix}-password`}
              className="pga-qr-input"
              type="text"
              autoComplete="off"
              value={wifi.password}
              aria-describedby={`${idPrefix}-password-msg`}
              onChange={(event) => state.setWifi({ ...wifi, password: event.target.value })}
              onBlur={() => touch('password')}
            />
          </Field>
        )}
        <label className="pga-qr-check">
          <input type="checkbox" checked={wifi.hidden} onChange={(event) => state.setWifi({ ...wifi, hidden: event.target.checked })} />
          Hidden network
        </label>
      </>
    )
  }

  const { sms } = state
  return (
    <>
      <Field
        id={`${idPrefix}-phone`}
        label="Your phone number"
        required
        error={errorFor('phone')}
        hint="Include the country code, e.g. +18005551212."
      >
        <input
          id={`${idPrefix}-phone`}
          className="pga-qr-input"
          type="tel"
          autoComplete="off"
          placeholder="+18005551212"
          value={sms.phone}
          aria-describedby={`${idPrefix}-phone-msg`}
          onChange={(event) => state.setSms({ ...sms, phone: event.target.value })}
          onBlur={() => touch('phone')}
        />
      </Field>
      <Field id={`${idPrefix}-message`} label="Custom message" error={errorFor('message')}>
        <input
          id={`${idPrefix}-message`}
          className="pga-qr-input"
          type="text"
          placeholder="Your SMS text"
          maxLength={SMS_MESSAGE_MAX_LENGTH}
          value={sms.message}
          aria-describedby={`${idPrefix}-message-msg`}
          onChange={(event) => state.setSms({ ...sms, message: event.target.value })}
        />
      </Field>
    </>
  )
}

function LogoPicker({
  state,
  idPrefix,
  allowUpload,
  onUploadLogo
}: {
  state: QrBuilderState
  idPrefix: string
  allowUpload: boolean
  onUploadLogo?: (file: File) => Promise<string>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const isPreset = state.logoPresets.some((preset) => preset.src === state.logo)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      state.setLogo(await (onUploadLogo ?? readFileAsDataUri)(file))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <fieldset className="pga-qr-fieldset">
      <legend className="pga-qr-legend">Logo</legend>
      <div className="pga-qr-logos" role="radiogroup" aria-label="Logo examples">
        {state.logoPresets.map((preset) => {
          const selected = state.logoEnabled && state.logo === preset.src
          return (
            <button
              key={preset.src}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              className="pga-qr-logo-option"
              onClick={() => state.setLogo(preset.src)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.src} alt="" width={56} height={56} />
            </button>
          )
        })}
        {state.logo && !isPreset && (
          <button
            type="button"
            role="radio"
            aria-checked={state.logoEnabled}
            aria-label="Your uploaded logo"
            className="pga-qr-logo-option"
            onClick={() => state.setLogo(state.logo!)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.logo} alt="" width={56} height={56} />
          </button>
        )}
      </div>

      {allowUpload && (
        <>
          <input
            ref={fileInput}
            id={`${idPrefix}-logo-file`}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={onFile}
          />
          <button type="button" className="pga-qr-button pga-qr-button-secondary" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? 'Uploading…' : 'Upload a custom image'}
          </button>
        </>
      )}
      {uploadError && (
        <p className="pga-qr-error" role="alert">
          {uploadError}
        </p>
      )}

      {state.logo && (
        <label className="pga-qr-check">
          <input type="checkbox" checked={!state.logoEnabled} onChange={(event) => state.setLogoEnabled(!event.target.checked)} />
          No logo
        </label>
      )}
    </fieldset>
  )
}

/**
 * Full QR builder: choose a type (URL, Wi-Fi, SMS), add a logo and caption,
 * preview, then download or copy. Import `@pgahq/qr-codes/styles.css` once.
 */
export function QrBuilder({
  className,
  onUploadLogo,
  allowLogoUpload = true,
  placeholder,
  ...options
}: QrBuilderProps) {
  const idPrefix = useId()
  const state = useQrBuilder(options)
  const ready = !!state.qr.svg
  const copy = TAB_COPY[state.tab]

  return (
    <div className={['pga-qr-builder', className].filter(Boolean).join(' ')}>
      <div className="pga-qr-settings">
        <Tabs state={state} idPrefix={idPrefix} />

        <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${state.tab}`} className="pga-qr-panel">
          <p className="pga-qr-subtitle">{copy.subtitle}</p>
          <p className="pga-qr-description">{copy.description}</p>
          <ContentFields key={state.tab} state={state} idPrefix={idPrefix} />
        </div>

        {ready && (
          <>
            <LogoPicker state={state} idPrefix={idPrefix} allowUpload={allowLogoUpload} onUploadLogo={onUploadLogo} />
            <Field id={`${idPrefix}-caption`} label="Caption below QR code">
              <input
                id={`${idPrefix}-caption`}
                className="pga-qr-input"
                type="text"
                maxLength={CAPTION_MAX_LENGTH}
                value={state.caption}
                onChange={(event) => state.setCaption(event.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <div className="pga-qr-preview">
        <div className="pga-qr-stage" aria-live="polite">
          {ready ? (
            <QrCode content={state.content} appearance={state.appearance} />
          ) : (
            (placeholder ?? (
              <div className="pga-qr-placeholder">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {state.logoPresets[0] && <img src={state.logoPresets[0].src} alt="" />}
                <span>Your QR code will appear here</span>
              </div>
            ))
          )}
        </div>

        <div className="pga-qr-actions">
          <button type="button" className="pga-qr-button" disabled={!ready || state.downloadStatus === 'working'} onClick={state.download}>
            {state.downloadStatus === 'working' ? 'Preparing…' : 'Download'}
          </button>
          {state.copySupported && (
            <button type="button" className="pga-qr-button" disabled={!ready || state.copyStatus === 'working' || state.copyStatus === 'done'} onClick={state.copy}>
              {state.copyStatus === 'done' ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        {state.actionError && (
          <p className="pga-qr-error" role="alert">
            {state.actionError}
          </p>
        )}
      </div>
    </div>
  )
}
