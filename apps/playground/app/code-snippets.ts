import { encodeQrContent, PGA_LOGOS, type QrAppearance, type QrContent } from '@pgahq/qr-codes'

const logoExpressions: Record<string, string> = Object.fromEntries(
  Object.entries(PGA_LOGOS).map(([name, logo]) => [logo.src, `PGA_LOGOS.${name}.src`])
)

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

/** Prints a value as TypeScript source, using `PGA_LOGOS` for preset logos and skipping undefined and false-only noise. */
export function toSource(value: unknown, indent = 1): string {
  if (typeof value === 'string') {
    if (logoExpressions[value]) return logoExpressions[value]
    if (value.startsWith('data:')) return quote(`${value.slice(0, value.indexOf(',') + 1)}...`)
    return quote(value)
  }
  if (!value || typeof value !== 'object') return String(value)
  const entries = Object.entries(value).filter(([key, v]) => v !== undefined && !(key === 'grayscale' && v === false))
  const inline = `{ ${entries.map(([key, v]) => `${key}: ${toSource(v, indent + 1)}`).join(', ')} }`
  if (inline.length <= 60 && !inline.includes('\n')) return inline
  const pad = '  '.repeat(indent + 1)
  const lines = entries.map(([key, v]) => `${pad}${key}: ${toSource(v, indent + 1)}`)
  return `{\n${lines.join(',\n')}\n${'  '.repeat(indent)}}`
}

function coreImports(...bodies: string[]): string[] {
  return bodies.some((body) => body.includes('PGA_LOGOS')) ? ['PGA_LOGOS'] : []
}

export function reactSnippet(content: QrContent, appearance: QrAppearance): string {
  const contentSource = toSource(content)
  const appearanceSource = toSource(appearance)
  const imports = coreImports(appearanceSource)
  return [
    ...(imports.length ? [`import { ${imports.join(', ')} } from '@pgahq/qr-codes'`] : []),
    `import { QrCode } from '@pgahq/qr-codes/react'`,
    '',
    '<QrCode',
    `  content={${contentSource}}`,
    `  appearance={${appearanceSource}}`,
    '/>'
  ].join('\n')
}

export function coreSnippet(content: QrContent, appearance: QrAppearance): string {
  const contentSource = toSource(content, 0)
  const appearanceSource = toSource(appearance, 0)
  return [
    `import { ${[...coreImports(appearanceSource), 'renderQrSvg'].join(', ')} } from '@pgahq/qr-codes'`,
    '',
    `const svg = renderQrSvg(${contentSource}, ${appearanceSource})`
  ].join('\n')
}

export function apiSnippet(content: QrContent, appearance: QrAppearance, endpoint: string): string {
  const preset = Object.entries(PGA_LOGOS).find(([, logo]) => logo.src === appearance.logo?.src)?.[0]
  const logoSrc = appearance.logo?.src
  const body: Record<string, unknown> = {
    ...content,
    format: 'png',
    fg: appearance.foreground,
    dotStyle: appearance.dotStyle,
    cornerStyle: appearance.cornerStyle,
    caption: appearance.caption ?? '',
    logo: preset ?? (logoSrc?.startsWith('https://') ? logoSrc : 'none')
  }
  if (appearance.logo?.grayscale && body.logo !== 'none') body.logoGrayscale = true
  const json = JSON.stringify(body).replace(/'/g, `'\\''`)
  const note = logoSrc && !preset && !logoSrc.startsWith('https://') ? '# Uploaded logos kept in the browser are not sent: host the image and pass its https URL as "logo".\n' : ''
  return `${note}curl -X POST ${endpoint} -H 'content-type: application/json' \\\n  -d '${json}' -o qr.png`
}

/** URL of the same code from this app's /api/qr route (URL codes only, since GET links should not carry secrets). */
export function imageLink(content: QrContent, appearance: QrAppearance, origin: string): string | null {
  if (content.type !== 'url') return null
  const encoded = encodeQrContent(content)
  if (!encoded.ok) return null
  const { foreground = '#000000', dotStyle = 'square', cornerStyle = 'square', caption, logo } = appearance
  const params = new URLSearchParams({
    url: encoded.value,
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
  return `${origin}/api/qr?${params}`
}
