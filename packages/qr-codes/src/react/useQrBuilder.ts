import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PGA_LOGOS, PGA_NAVY, type CornerStyle, type DotStyle, type QrAppearance } from '../appearance'
import { canCopyQr, copyQrToClipboard, downloadQr } from '../browser'
import { suggestCaption, type QrContent, type QrContentType, type WifiSecurity } from '../content'
import { loadStoredLogos, saveStoredLogos } from './logoFile'
import { renderQrState } from './useQrSvg'

export type QrStyleId = 'fluid' | 'classic'
export type QrColorId = 'navy' | 'black' | 'greyscale'

/** Single-colour looks offered by the builder. */
export const QR_STYLES: readonly { id: QrStyleId; label: string; dotStyle: DotStyle; cornerStyle: CornerStyle }[] = [
  { id: 'fluid', label: 'Fluid', dotStyle: 'fluid', cornerStyle: 'fluid' },
  { id: 'classic', label: 'Classic', dotStyle: 'square', cornerStyle: 'square' }
]

/** `greyscale` is a black code with the logo desaturated, so nothing on the page has color. */
export const QR_COLORS: readonly { id: QrColorId; label: string; value: string; swatch: string; grayscale?: boolean }[] = [
  { id: 'navy', label: 'Navy', value: PGA_NAVY, swatch: PGA_NAVY },
  { id: 'black', label: 'Black', value: '#000000', swatch: '#000000' },
  { id: 'greyscale', label: 'Greyscale', value: '#000000', swatch: 'linear-gradient(135deg, #000000 50%, #9a9a9a 50%)', grayscale: true }
]

export type BuilderTab = Extract<QrContentType, 'url' | 'wifi' | 'sms'>

export interface LogoPreset {
  label: string
  src: string
}

export interface QrBuilderEvent {
  type: 'start' | 'download' | 'copy'
  tab: BuilderTab
  /** Present for download/copy. */
  hasLogo?: boolean
  hasCaption?: boolean
  style?: QrStyleId
  color?: QrColorId
}

export interface UseQrBuilderOptions {
  defaultTab?: BuilderTab
  /** URL prefilled on the URL tab. Default: empty (the field shows a placeholder). */
  defaultUrl?: string
  /** Look selected on first render. Default: fluid. */
  defaultStyle?: QrStyleId
  /** Code color selected on first render. Default: navy. */
  defaultColor?: QrColorId
  /**
   * localStorage key used to remember uploaded logos between visits.
   * Pass `null` to keep them for the current page only.
   */
  storageKey?: string | null
  /** Base styling (colors, dot/corner styles, size). Logo and caption are managed by the builder. */
  appearance?: QrAppearance
  logoPresets?: readonly LogoPreset[]
  /** Logo selected on first render. Default: the first preset. Pass `null` for none. */
  defaultLogo?: string | null
  /** Base file name for downloads when there is no caption. */
  filename?: string
  onEvent?: (event: QrBuilderEvent) => void
}

export const DEFAULT_STORAGE_KEY = 'pgahq:qr-codes:custom-logos'
export const MAX_CUSTOM_LOGOS = 5

export const DEFAULT_LOGO_PRESETS: readonly LogoPreset[] = [
  { label: PGA_LOGOS.blue.label, src: PGA_LOGOS.blue.src },
  { label: PGA_LOGOS.circle.label, src: PGA_LOGOS.circle.src }
]

export type ActionStatus = 'idle' | 'working' | 'done' | 'error'

const COPY_FEEDBACK_MS = 2_500

/**
 * Headless state for a QR builder: form fields per content type, logo and
 * caption, the derived QR, and download/copy actions. `QrBuilder` is one UI on
 * top of it; use it directly to build a different layout.
 */
export function useQrBuilder(options: UseQrBuilderOptions = {}) {
  const {
    defaultTab = 'url',
    defaultUrl = '',
    defaultStyle = 'fluid',
    defaultColor = 'navy',
    storageKey = DEFAULT_STORAGE_KEY,
    appearance: baseAppearance,
    logoPresets = DEFAULT_LOGO_PRESETS,
    filename = 'PGA-qr-code',
    onEvent
  } = options

  const [tab, setTabState] = useState<BuilderTab>(defaultTab)
  const [url, setUrl] = useState(defaultUrl)
  const [wifi, setWifi] = useState<{
    ssid: string
    password: string
    security: WifiSecurity
    hidden: boolean
  }>({ ssid: '', password: '', security: 'WPA', hidden: false })
  const [sms, setSms] = useState({ phone: '', message: '' })
  const [captionOverride, setCaptionOverride] = useState<string | null>(null)
  const [styleId, setStyleId] = useState<QrStyleId>(defaultStyle)
  const [colorId, setColorId] = useState<QrColorId>(defaultColor)
  const [customLogos, setCustomLogos] = useState<string[]>([])
  const [logo, setLogoState] = useState<string | null>(
    options.defaultLogo === undefined ? (logoPresets[0]?.src ?? null) : options.defaultLogo
  )
  const [logoEnabled, setLogoEnabled] = useState(true)
  const [copyStatus, setCopyStatus] = useState<ActionStatus>('idle')
  const [downloadStatus, setDownloadStatus] = useState<ActionStatus>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  const started = useRef(false)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const emit = useCallback((event: Omit<QrBuilderEvent, 'tab'>, currentTab: BuilderTab) => {
    onEventRef.current?.({ ...event, tab: currentTab })
  }, [])

  const markStarted = useCallback(
    (currentTab: BuilderTab) => {
      if (started.current) return
      started.current = true
      emit({ type: 'start' }, currentTab)
    },
    [emit]
  )

  const content: QrContent = useMemo(() => {
    switch (tab) {
      case 'url':
        return { type: 'url', url }
      case 'wifi':
        return { type: 'wifi', ...wifi }
      case 'sms':
        return { type: 'sms', ...sms }
    }
  }, [tab, url, wifi, sms])

  const caption = captionOverride ?? suggestCaption(content)
  const look = QR_STYLES.find((style) => style.id === styleId) ?? QR_STYLES[0]
  const color = QR_COLORS.find((item) => item.id === colorId) ?? QR_COLORS[0]

  const appearance: QrAppearance = useMemo(
    () => ({
      ...baseAppearance,
      foreground: color.value,
      cornerSquareColor: undefined,
      cornerDotColor: undefined,
      dotStyle: look.dotStyle,
      cornerStyle: look.cornerStyle,
      caption: caption.trim() || undefined,
      logo: logoEnabled && logo ? { src: logo, grayscale: color.grayscale } : undefined
    }),
    [baseAppearance, caption, color, look, logo, logoEnabled]
  )

  const qr = useMemo(() => renderQrState(content, appearance), [content, appearance])

  const setTab = useCallback(
    (next: BuilderTab) => {
      setTabState(next)
      markStarted(next)
    },
    [markStarted]
  )

  /** Wraps a field setter so the first edit is reported once. */
  const track = useCallback(
    <A extends unknown[]>(setter: (...args: A) => void) =>
      (...args: A) => {
        markStarted(tab)
        setter(...args)
      },
    [markStarted, tab]
  )

  const setLogo = useCallback((src: string) => {
    setLogoState(src)
    setLogoEnabled(true)
  }, [])

  const customLogosRef = useRef<string[]>([])
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    if (!storageKey) return
    const stored = loadStoredLogos(storageKey, MAX_CUSTOM_LOGOS)
    customLogosRef.current = stored
    setCustomLogos(stored)
  }, [storageKey])

  const commitCustomLogos = useCallback(
    (next: string[]) => {
      customLogosRef.current = next
      setCustomLogos(next)
      if (storageKey) setStorageWarning(!saveStoredLogos(storageKey, next))
    },
    [storageKey]
  )

  const addCustomLogo = useCallback(
    (src: string) => {
      const current = customLogosRef.current
      if (!current.includes(src)) {
        if (current.length >= MAX_CUSTOM_LOGOS) return
        commitCustomLogos([...current, src])
      }
      setLogo(src)
    },
    [commitCustomLogos, setLogo]
  )

  const removeCustomLogo = useCallback(
    (src: string) => {
      commitCustomLogos(customLogosRef.current.filter((item) => item !== src))
      setLogoState((selected) => (selected === src ? (logoPresets[0]?.src ?? null) : selected))
    },
    [commitCustomLogos, logoPresets]
  )

  const download = useCallback(async () => {
    if (!qr.payload) return
    setDownloadStatus('working')
    setActionError(null)
    try {
      await downloadQr(qr.payload, appearance, { filename: caption.trim() || filename })
      setDownloadStatus('done')
      emit({ type: 'download', hasLogo: !!appearance.logo, hasCaption: !!appearance.caption, style: styleId, color: colorId }, tab)
    } catch (error) {
      setDownloadStatus('error')
      setActionError(error instanceof Error ? error.message : 'Download failed.')
    }
  }, [appearance, caption, colorId, emit, filename, qr.payload, styleId, tab])

  const copy = useCallback(async () => {
    if (!qr.payload) return
    setCopyStatus('working')
    setActionError(null)
    try {
      await copyQrToClipboard(qr.payload, appearance)
      setCopyStatus('done')
      emit({ type: 'copy', hasLogo: !!appearance.logo, hasCaption: !!appearance.caption, style: styleId, color: colorId }, tab)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopyStatus('idle'), COPY_FEEDBACK_MS)
    } catch (error) {
      setCopyStatus('error')
      setActionError(error instanceof Error ? error.message : 'Copy failed.')
    }
  }, [appearance, colorId, emit, qr.payload, styleId, tab])

  useEffect(() => {
    clearTimeout(copyTimer.current)
    setCopyStatus('idle')
    setDownloadStatus('idle')
    setActionError(null)
  }, [qr.svg])

  const [copySupported, setCopySupported] = useState(false)
  useEffect(() => setCopySupported(canCopyQr()), [])

  return {
    tab,
    setTab,
    url,
    setUrl: track(setUrl),
    wifi,
    setWifi: track(setWifi),
    sms,
    setSms: track(setSms),
    caption,
    setCaption: track(setCaptionOverride),
    logo,
    logoEnabled,
    setLogo: track(setLogo),
    setLogoEnabled: track(setLogoEnabled),
    styleId,
    setStyleId: track(setStyleId),
    colorId,
    setColorId: track(setColorId),
    logoPresets,
    customLogos,
    maxCustomLogos: MAX_CUSTOM_LOGOS,
    addCustomLogo: track(addCustomLogo),
    removeCustomLogo,
    storageWarning,
    content,
    appearance,
    qr,
    download,
    copy,
    copyStatus,
    downloadStatus,
    copySupported,
    actionError
  }
}

export type QrBuilderState = ReturnType<typeof useQrBuilder>
