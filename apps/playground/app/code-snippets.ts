import { encodeQrContent, PGA_LOGOS, type QrAppearance, type QrContent } from '@pga/qr-codes'

const logoExpressions = new Map<string, string>(
  Object.entries(PGA_LOGOS).map(([name, logo]) => [logo.src, `PGA_LOGOS.${name}.src`])
)

const quote = (value: string) =>
  `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`

const isPresetLogo = (src?: string) => !!src && logoExpressions.has(src)

/** The API route and the GET link only accept the PGA preset logos. */
const hasCustomLogo = (appearance: QrAppearance) => !!appearance.logo && !isPresetLogo(appearance.logo.src)

/** An uploaded logo lives in the browser as a data URI, so copied code cannot carry it. Hosted https logos can be copied as is. */
const hasLocalLogo = (appearance: QrAppearance) => !!appearance.logo?.src.startsWith('data:')

const CUSTOM_LOGO_NOTE =
  "Uploaded logo not included: host the image and add `logo: { src: 'https://...' }` with its https address."

/** Prints a value as TypeScript source, using `PGA_LOGOS` for preset logos and skipping undefined and false-only noise. */
export function toSource(value: unknown, indent = 1): string {
  if (typeof value === 'string') return logoExpressions.get(value) ?? quote(value)
  if (!value || typeof value !== 'object') return String(value)
  const entries = Object.entries(value).filter(([key, v]) => v !== undefined && !(key === 'grayscale' && v === false))
  const inline = `{ ${entries.map(([key, v]) => `${key}: ${toSource(v, indent + 1)}`).join(', ')} }`
  if (inline.length <= 60 && !inline.includes('\n')) return inline
  const pad = '  '.repeat(indent + 1)
  const lines = entries.map(([key, v]) => `${pad}${key}: ${toSource(v, indent + 1)}`)
  return `{\n${lines.join(',\n')}\n${'  '.repeat(indent)}}`
}

/** Drops an uploaded logo so copied code never contains an unusable image source. */
function forSource(appearance: QrAppearance): QrAppearance {
  if (!hasLocalLogo(appearance)) return appearance
  const { logo: _logo, ...rest } = appearance
  return rest
}

const WIFI_PASSWORD_PLACEHOLDER = 'YOUR_WIFI_PASSWORD'

/** The live code never shows or copies the typed Wi-Fi password. */
function redact(content: QrContent): QrContent {
  return content.type === 'wifi' && content.password ? { ...content, password: WIFI_PASSWORD_PLACEHOLDER } : content
}

const secretComment = (content: QrContent, prefix: string) =>
  content.type === 'wifi' && content.password ? [`${prefix} Replace ${WIFI_PASSWORD_PLACEHOLDER} with the network password.`] : []

function coreImports(...bodies: string[]): string[] {
  return bodies.some((body) => body.includes('PGA_LOGOS')) ? ['PGA_LOGOS'] : []
}

const sourceComments = (content: QrContent, appearance: QrAppearance) => [
  ...secretComment(content, '//'),
  ...(hasLocalLogo(appearance) ? [`// ${CUSTOM_LOGO_NOTE}`] : [])
]

export function reactSnippet(content: QrContent, appearance: QrAppearance): string {
  const contentSource = toSource(redact(content))
  const appearanceSource = toSource(forSource(appearance))
  const imports = coreImports(appearanceSource)
  return [
    ...sourceComments(content, appearance),
    ...(imports.length ? [`import { ${imports.join(', ')} } from '@pga/qr-codes'`] : []),
    `import { QrCode } from '@pga/qr-codes/react'`,
    `import '@pga/qr-codes/styles.css'`,
    '',
    '<QrCode',
    `  content={${contentSource}}`,
    `  appearance={${appearanceSource}}`,
    '/>'
  ].join('\n')
}

export function coreSnippet(content: QrContent, appearance: QrAppearance): string {
  const contentSource = toSource(redact(content), 0)
  const appearanceSource = toSource(forSource(appearance), 0)
  return [
    ...sourceComments(content, appearance),
    `import { ${[...coreImports(appearanceSource), 'renderQrSvg'].join(', ')} } from '@pga/qr-codes'`,
    '',
    `const svg = renderQrSvg(${contentSource}, ${appearanceSource})`
  ].join('\n')
}

/** Appearance as /api/qr request fields. Uploaded logos cannot be sent, so they become `logo: 'none'`. */
function appearanceFields(appearance: QrAppearance): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean | undefined> = {
    size: appearance.size,
    margin: appearance.margin,
    fg: appearance.foreground,
    bg: appearance.background,
    cornerSquareColor: appearance.cornerSquareColor,
    cornerDotColor: appearance.cornerDotColor,
    dotStyle: appearance.dotStyle,
    cornerStyle: appearance.cornerStyle,
    errorCorrection: appearance.errorCorrection,
    caption: appearance.caption ?? ''
  }
  const logoSrc = appearance.logo?.src
  const preset = Object.entries(PGA_LOGOS).find(([, logo]) => logo.src === logoSrc)?.[0]
  fields.logo = preset ?? 'none'
  if (preset) {
    if (appearance.logo?.grayscale) fields.logoGrayscale = true
    if (appearance.logo?.scale !== undefined) fields.logoScale = appearance.logo.scale
  }
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Record<
    string,
    string | number | boolean
  >
}

const COLOR_FIELDS = new Set(['fg', 'bg', 'cornerSquareColor', 'cornerDotColor'])

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

export function apiSnippet(content: QrContent, appearance: QrAppearance, endpoint: string): string {
  const body = { ...redact(content), format: 'png', ...appearanceFields(appearance) }
  const notes = [
    ...secretComment(content, '#'),
    ...(hasCustomLogo(appearance)
      ? ['# Custom logo not included: this API route only accepts the "blue" and "circle" presets, so the request sends "logo":"none".']
      : [])
  ]
  const note = notes.map((line) => `${line}\n`).join('')
  return `${note}curl -X POST ${shellQuote(endpoint)} -H 'content-type: application/json' \\\n  -d ${shellQuote(JSON.stringify(body))} -o qr.png`
}

export type ImageLink = { url: string } | { reason: string }

/** URL of the same code from this app's /api/qr route (URL codes only, since GET links should not carry secrets). */
export function imageLinkState(content: QrContent, appearance: QrAppearance, origin: string): ImageLink {
  if (content.type !== 'url') {
    return { reason: 'The link is only available for URL codes. Use the POST request above for Wi-Fi and text codes.' }
  }
  const encoded = encodeQrContent(content)
  if (!encoded.ok) return { reason: 'Enter a valid URL to get a link.' }
  if (hasCustomLogo(appearance)) {
    return { reason: 'The link is not available with a custom logo. Pick a PGA logo or no logo to get one.' }
  }
  const params = new URLSearchParams({ url: encoded.value, format: 'png' })
  for (const [key, value] of Object.entries(appearanceFields(appearance))) {
    params.set(key, COLOR_FIELDS.has(key) ? String(value).replace(/^#/, '') : String(value))
  }
  return { url: `${origin}/api/qr?${params}` }
}

export function imageLink(content: QrContent, appearance: QrAppearance, origin: string): string | null {
  const result = imageLinkState(content, appearance, origin)
  return 'url' in result ? result.url : null
}
