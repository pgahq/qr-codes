import { useCallback, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { CAPTION_MAX_LENGTH } from '../appearance'
import { SMS_MESSAGE_MAX_LENGTH } from '../content'
import { renderQrSvg } from '../svg'
import { readLogoFile } from './logoFile'
import { QrContextMenu } from './QrContextMenu'
import { QrCode } from './QrCode'
import { QR_COLORS, QR_STYLES, useQrBuilder, type BuilderTab, type QrBuilderState, type UseQrBuilderOptions } from './useQrBuilder'

export interface QrBuilderProps extends UseQrBuilderOptions {
  className?: string
  /**
   * Upload a custom logo and return a https URL (e.g. to Cloudinary).
   * Default: the image is shrunk and embedded as a data URI, so nothing leaves the browser.
   * Uploaded logos (up to 5) are remembered on this device; see `storageKey`.
   */
  onUploadLogo?: (file: File) => Promise<string>
  /** Set false to hide the custom logo upload. */
  allowLogoUpload?: boolean
  /** Placeholder shown until the content is valid. Default: the first logo preset. */
  placeholder?: ReactNode
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'url', label: 'Open webpage' },
  { id: 'wifi', label: 'Join Wi-Fi' },
  { id: 'sms', label: 'Send a text' }
]

const TAB_BLURB: Record<BuilderTab, string> = {
  url: 'People can visit your page just by scanning the QR code, with no typing.',
  wifi: 'People can connect to your Wi-Fi network just by scanning the QR code.',
  sms: 'Scanning the QR code will draft a text message on their phone.'
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
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function FieldRow({ children }: { children: ReactNode }) {
  return <div className="pga-qr-row">{children}</div>
}

function ContentFields({ state, idPrefix, captionField }: { state: QrBuilderState; idPrefix: string; captionField: ReactNode }) {
  const { tab, qr } = state
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }))
  const errorFor = (field: string) => (qr.error && qr.field === field && (field === 'message' || touched[field]) ? qr.error : null)

  if (tab === 'url') {
    return (
      <FieldRow>
        <Field id={`${idPrefix}-url`} label="URL" required error={errorFor('url')}>
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
        {captionField}
      </FieldRow>
    )
  }

  if (tab === 'wifi') {
    const { wifi } = state
    return (
      <>
        <FieldRow>
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
          {captionField}
        </FieldRow>
        <FieldRow>
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
        </FieldRow>
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
      <FieldRow>
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
        {captionField}
      </FieldRow>
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

function NoLogoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 17.5l11-11" />
    </svg>
  )
}

function LogoPicker({
  state,
  allowUpload,
  onUploadLogo
}: {
  state: QrBuilderState
  allowUpload: boolean
  onUploadLogo?: (file: File) => Promise<string>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { logo, logoEnabled, logoPresets, customLogos, maxCustomLogos } = state
  const atLimit = customLogos.length >= maxCustomLogos
  const known = [...logoPresets.map((preset) => preset.src), ...customLogos]
  const otherLogo = logo && !known.includes(logo) ? logo : null
  const noLogo = !logoEnabled || !logo

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      state.addCustomLogo(await (onUploadLogo ?? readLogoFile)(file))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const option = (src: string, label: string, removable: boolean) => (
    <div className="pga-qr-logo-item" key={src}>
      <button
        type="button"
        role="radio"
        aria-checked={!noLogo && logo === src}
        aria-label={label}
        className="pga-qr-logo-option"
        onClick={() => state.setLogo(src)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={38} height={38} />
      </button>
      {removable && (
        <button
          type="button"
          className="pga-qr-logo-remove"
          aria-label={`Remove ${label.toLowerCase()}`}
          onClick={() => state.removeCustomLogo(src)}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  )

  return (
    <fieldset className="pga-qr-fieldset">
      <legend className="pga-qr-legend">Logo</legend>
      <div className="pga-qr-logos" role="radiogroup" aria-label="Logo">
        <div className="pga-qr-logo-item">
          <button
            type="button"
            role="radio"
            aria-checked={noLogo}
            aria-label="No logo"
            title="No logo"
            className="pga-qr-logo-option"
            onClick={() => state.setLogoEnabled(false)}
          >
            <NoLogoIcon />
          </button>
        </div>
        {logoPresets.map((preset) => option(preset.src, preset.label, false))}
        {customLogos.map((src, index) => option(src, `Uploaded logo ${index + 1}`, true))}
        {otherLogo && option(otherLogo, 'Custom logo', false)}
        {allowUpload && (
          <div className="pga-qr-logo-item">
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onFile} />
            <button
              type="button"
              className="pga-qr-logo-option pga-qr-logo-add"
              aria-label="Upload a custom image"
              title={atLimit ? `You can keep ${maxCustomLogos} uploaded logos. Remove one to add another.` : 'Upload a custom image'}
              disabled={uploading || atLimit}
              onClick={() => fileInput.current?.click()}
            >
              <span aria-hidden="true">{uploading ? '\u2026' : '+'}</span>
            </button>
          </div>
        )}
      </div>
      {uploadError && (
        <p className="pga-qr-error" role="alert">
          {uploadError}
        </p>
      )}
      {state.storageWarning && (
        <p className="pga-qr-hint">Your uploaded logos could not be saved for next time (browser storage is unavailable).</p>
      )}
    </fieldset>
  )
}

const PREVIEW_SAMPLE = 'https://pga.com'

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

function previewFor(payload: string, style: (typeof QR_STYLES)[number], foreground: string): string {
  const appearance = { size: 64, margin: 0, foreground, dotStyle: style.dotStyle, cornerStyle: style.cornerStyle } as const
  try {
    return toDataUri(renderQrSvg(payload, appearance))
  } catch {
    return toDataUri(renderQrSvg(PREVIEW_SAMPLE, appearance))
  }
}

function StylePicker({ state }: { state: QrBuilderState }) {
  const color = QR_COLORS.find((item) => item.id === state.colorId)?.value ?? QR_COLORS[0].value
  const payload = state.qr.payload ?? PREVIEW_SAMPLE

  // Tiles show the user's own content, so each one is a true miniature of the final code.
  const previews = useMemo(() => QR_STYLES.map((style) => previewFor(payload, style, color)), [payload, color])

  return (
    <div className="pga-qr-appearance">
      <fieldset className="pga-qr-fieldset">
        <legend className="pga-qr-legend">Style</legend>
        <div className="pga-qr-logos" role="radiogroup" aria-label="Style">
          {QR_STYLES.map((style, index) => (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={state.styleId === style.id}
              aria-label={style.label}
              title={style.label}
              className="pga-qr-logo-option pga-qr-style-option"
              onClick={() => state.setStyleId(style.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[index]} alt="" width={40} height={40} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pga-qr-fieldset">
        <legend className="pga-qr-legend">Color</legend>
        <div className="pga-qr-logos" role="radiogroup" aria-label="Color">
          {QR_COLORS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={state.colorId === item.id}
              aria-label={item.label}
              title={item.label}
              className="pga-qr-logo-option"
              onClick={() => state.setColorId(item.id)}
            >
              <span className="pga-qr-swatch" style={{ background: item.value }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/**
 * Full QR builder: choose a type (URL, Wi-Fi, SMS), add a logo and caption,
 * preview, then download or copy. Import `@pgahq/qr-codes/styles.css` once.
 */
export function QrBuilder({ className, onUploadLogo, allowLogoUpload = true, placeholder, ...options }: QrBuilderProps) {
  const idPrefix = useId()
  const state = useQrBuilder(options)
  const ready = !!state.qr.svg
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  const onStageContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!ready) return
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY })
  }

  const captionField = (
    <Field id={`${idPrefix}-caption`} label="Caption">
      <input
        id={`${idPrefix}-caption`}
        className="pga-qr-input"
        type="text"
        maxLength={CAPTION_MAX_LENGTH}
        placeholder={state.tab === 'url' ? 'pga.com' : 'Shown below the code'}
        value={state.caption}
        onChange={(event) => state.setCaption(event.target.value)}
      />
    </Field>
  )

  return (
    <div className={['pga-qr-builder', className].filter(Boolean).join(' ')}>
      <div className="pga-qr-settings">
        <Tabs state={state} idPrefix={idPrefix} />

        <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${state.tab}`} className="pga-qr-panel">
          <p className="pga-qr-blurb">{TAB_BLURB[state.tab]}</p>
          <ContentFields key={state.tab} state={state} idPrefix={idPrefix} captionField={captionField} />
        </div>

        <LogoPicker state={state} allowUpload={allowLogoUpload} onUploadLogo={onUploadLogo} />
        <StylePicker state={state} />
      </div>

      <div className="pga-qr-preview">
        <div className="pga-qr-stage" aria-live="polite" onContextMenu={onStageContextMenu}>
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
            <button
              type="button"
              className="pga-qr-button"
              disabled={!ready || state.copyStatus === 'working' || state.copyStatus === 'done'}
              onClick={state.copy}
            >
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

      {menu && (
        <QrContextMenu
          x={menu.x}
          y={menu.y}
          label="QR code actions"
          onClose={closeMenu}
          items={[
            ...(state.copySupported ? [{ label: 'Copy image', onSelect: state.copy }] : []),
            { label: 'Download image', onSelect: state.download }
          ]}
        />
      )}
    </div>
  )
}
