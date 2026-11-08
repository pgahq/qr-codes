import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { CAPTION_MAX_LENGTH } from '../appearance'
import { SMS_MESSAGE_MAX_LENGTH } from '../content'
import { renderQrSvg } from '../svg'
import { readLogoFile } from './logoFile'
import { QrContextMenu, type QrContextMenuItem } from './QrContextMenu'
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
  /** Set false to hide the style choices (Fluid, Classic). The builder keeps using `defaultStyle`. Default: true. */
  allowStyleChoice?: boolean
  /** Set false to hide the color choices (Navy, Black, Greyscale). The builder keeps using `defaultColor`. Default: true. */
  allowColorChoice?: boolean
  /** Focus the first field of the form when the builder mounts. Off by default so embeds don't steal focus from the host page. */
  autoFocus?: boolean
  /** Placeholder shown until the content is valid. Default: the first logo preset. */
  placeholder?: ReactNode
  /**
   * Optional link behind a "Link" button under the code (for example a URL for the generated image).
   * Pass a function to build it from the current state; return nothing to disable the button.
   */
  link?: string | ((state: QrBuilderState) => string | null | undefined)
  /** Text on the link button. Default: "Link". */
  linkLabel?: string
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'url', label: 'Open webpage' },
  { id: 'wifi', label: 'Join Wi-Fi' },
  { id: 'sms', label: 'Send a text' },
]

const TAB_BLURB: Record<BuilderTab, string> = {
  url: 'Scan the QR code to open your URL without typing.',
  wifi: 'Scan the QR code to connect to your Wi-Fi network.',
  sms: 'Scan the QR code to draft a text message you specify.',
}

function Field({
  label,
  required,
  error,
  hint,
  id,
  children,
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

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function DiskIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M7 3v5h8V3" />
      <rect x="7" y="13" width="10" height="8" rx="1" />
    </svg>
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
        <Field id={`${idPrefix}-phone`} label="Your phone number" required error={errorFor('phone')}>
          <input
            id={`${idPrefix}-phone`}
            className="pga-qr-input"
            type="tel"
            autoComplete="off"
            placeholder="(800) 555-1212"
            value={sms.phone}
            aria-describedby={`${idPrefix}-phone-msg`}
            onChange={(event) => state.setSms({ ...sms, phone: event.target.value })}
            onBlur={() => touch('phone')}
          />
        </Field>
        {captionField}
      </FieldRow>
      <Field id={`${idPrefix}-message`} label="Custom message" error={errorFor('message')}>
        <textarea
          id={`${idPrefix}-message`}
          className="pga-qr-input pga-qr-textarea"
          rows={2}
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
  onUploadLogo,
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

function StylePicker({ state, showStyles, showColors }: { state: QrBuilderState; showStyles: boolean; showColors: boolean }) {
  const color = QR_COLORS.find((item) => item.id === state.colorId)?.value ?? QR_COLORS[0].value
  const payload = state.qr.payload ?? PREVIEW_SAMPLE

  // Tiles show the user's own content, so each one is a true miniature of the final code.
  const previews = useMemo(() => QR_STYLES.map((style) => previewFor(payload, style, color)), [payload, color])

  if (!showStyles && !showColors) return null

  return (
    <div className="pga-qr-appearance">
      {showStyles && (
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
      )}

      {showColors && (
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
                <span className="pga-qr-swatch" style={{ background: item.swatch }} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
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
  autoFocus = false,
  allowStyleChoice = true,
  allowColorChoice = true,
  placeholder,
  link,
  linkLabel = 'Link',
  ...options
}: QrBuilderProps) {
  const idPrefix = useId()
  const state = useQrBuilder(options)
  const ready = !!state.qr.svg
  const linkUrl = typeof link === 'function' ? link(state) : link
  const [menu, setMenu] = useState<{
    kind: 'download' | 'copy' | 'context'
    x: number
    y: number
    label: string
    items: QrContextMenuItem[]
    focusFirst: boolean
  } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) panel.current?.querySelector<HTMLElement>('input:not([type="checkbox"]), textarea')?.focus({ preventScroll: true })
  }, [autoFocus])

  const pngCopyLabel = state.copySupported ? 'PNG' : 'PNG (not supported here)'

  const toggleFormatMenu = (event: MouseEvent<HTMLButtonElement>, kind: 'download' | 'copy') => {
    if (menu?.kind === kind) return setMenu(null)
    const rect = event.currentTarget.getBoundingClientRect()
    const run = kind === 'download' ? state.download : state.copy
    setMenu({
      kind,
      x: rect.left,
      y: rect.bottom + 4,
      label: kind === 'download' ? 'Download image as' : 'Copy image as',
      focusFirst: event.detail === 0,
      items: [
        { label: 'SVG', onSelect: () => run('svg') },
        { label: kind === 'copy' ? pngCopyLabel : 'PNG', onSelect: () => run('png'), disabled: kind === 'copy' && !state.copySupported },
      ],
    })
  }

  const onStageContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!ready) return
    event.preventDefault()
    setMenu({
      kind: 'context',
      x: event.clientX,
      y: event.clientY,
      label: 'QR code actions',
      focusFirst: false,
      items: [
        { label: 'Copy PNG', onSelect: () => state.copy('png'), disabled: !state.copySupported },
        { label: 'Copy SVG', onSelect: () => state.copy('svg') },
        { label: 'Download PNG', onSelect: () => state.download('png') },
        { label: 'Download SVG', onSelect: () => state.download('svg') },
      ],
    })
  }

  const linkCopied = state.linkStatus === 'done' && copiedUrl === linkUrl
  const copyLink = async () => {
    if (!linkUrl) return
    setCopiedUrl(linkUrl)
    await state.copyLink(linkUrl)
  }
  const disabledHint = 'Enter a valid value to enable'
  const copyBusy = state.copyStatus === 'working'
  const announcement = state.copyStatus === 'done' ? 'Image copied' : linkCopied ? `${linkLabel} copied` : ''

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

        <div ref={panel} role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${state.tab}`} className="pga-qr-panel">
          <p className="pga-qr-blurb">{TAB_BLURB[state.tab]}</p>
          <ContentFields key={state.tab} state={state} idPrefix={idPrefix} captionField={captionField} />
        </div>

        <LogoPicker state={state} allowUpload={allowLogoUpload} onUploadLogo={onUploadLogo} />
        <StylePicker state={state} showStyles={allowStyleChoice} showColors={allowColorChoice} />
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
          <button
            type="button"
            className="pga-qr-button pga-qr-button-secondary pga-qr-action"
            aria-label="Download image"
            aria-haspopup="menu"
            aria-expanded={menu?.kind === 'download'}
            data-pga-qr-menu-trigger=""
            title={ready ? undefined : disabledHint}
            disabled={!ready || state.downloadStatus === 'working'}
            onClick={(event) => toggleFormatMenu(event, 'download')}
          >
            <DiskIcon />
            <span aria-hidden="true">{state.downloadStatus === 'working' ? 'Preparing…' : 'Image'}</span>
          </button>
          <button
            type="button"
            className="pga-qr-button pga-qr-button-secondary pga-qr-action"
            aria-label="Copy image"
            aria-haspopup="menu"
            aria-expanded={menu?.kind === 'copy'}
            data-pga-qr-menu-trigger=""
            title={ready ? undefined : disabledHint}
            disabled={!ready || copyBusy}
            onClick={(event) => toggleFormatMenu(event, 'copy')}
          >
            {state.copyStatus === 'done' ? <CheckIcon /> : <CopyIcon />}
            <span aria-hidden="true">{state.copyStatus === 'done' ? 'Copied!' : 'Image'}</span>
          </button>
          {link !== undefined && (
            <button
              type="button"
              className="pga-qr-button pga-qr-button-secondary pga-qr-action"
              aria-label={`Copy ${linkLabel.toLowerCase()}`}
              title={linkUrl ?? disabledHint}
              disabled={!linkUrl}
              onClick={copyLink}
            >
              {linkCopied ? <CheckIcon /> : <CopyIcon />}
              <span aria-hidden="true">{linkCopied ? 'Copied!' : linkLabel}</span>
            </button>
          )}
        </div>
        <span className="pga-qr-sr-only" role="status">
          {announcement}
        </span>
        {state.actionError && (
          <p className="pga-qr-error" role="alert">
            {state.actionError}
          </p>
        )}
      </div>

      {menu && (
        <QrContextMenu x={menu.x} y={menu.y} label={menu.label} items={menu.items} focusFirst={menu.focusFirst} onClose={closeMenu} />
      )}
    </div>
  )
}
