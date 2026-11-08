export interface PngOptions {
  /** Output width in pixels. */
  width: number
  /** Font files for the caption. Needed on hosts without system fonts (e.g. Vercel). */
  fontFiles?: string[]
}

export class PngUnavailableError extends Error {
  constructor() {
    super('PNG output requires the optional "@resvg/resvg-js" package to be installed.')
    this.name = 'PngUnavailableError'
  }
}

/**
 * Rasterizes an SVG produced by `renderQrSvg` to PNG using `@resvg/resvg-js`
 * (an optional peer dependency, loaded lazily so SVG-only users never pay for it).
 * The SVG must already have its logo inlined as a data URI.
 */
export async function renderPng(svg: string, { width, fontFiles }: PngOptions): Promise<Uint8Array> {
  let resvg: typeof import('@resvg/resvg-js')
  try {
    resvg = await import('@resvg/resvg-js')
  } catch {
    throw new PngUnavailableError()
  }
  const renderer = new resvg.Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, fontFiles, defaultFontFamily: 'Arial' }
  })
  return renderer.render().asPng()
}
