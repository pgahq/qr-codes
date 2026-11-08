import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { describe, expect, it } from 'vitest'
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import type { QrAppearance } from '../appearance'
import type { QrContent } from '../content'
import { QrRenderError, renderQrSvg } from '../svg'

// 1x1 transparent png
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

// 8x8 solid red png
const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO4IyeHFTEMLQkAid1GAXiz9RcAAAAASUVORK5CYII='

// ZXing is the decoder behind most phone scanners, so passing it is a meaningful scannability check.
const resolved = createRequire(import.meta.url).resolve('zxing-wasm/reader')
const wasmPath = join(resolved.slice(0, resolved.lastIndexOf('zxing-wasm') + 'zxing-wasm'.length), 'dist/reader/zxing_reader.wasm')
prepareZXingModule({
  overrides: { wasmBinary: readFileSync(wasmPath).buffer as ArrayBuffer },
  fireImmediately: false
})

async function decode(svg: string, width = 600): Promise<string | undefined> {
  const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render()
  const [result] = await readBarcodes(
    { data: new Uint8ClampedArray(rendered.pixels), width: rendered.width, height: rendered.height } as ImageData,
    { formats: ['QRCode'] }
  )
  return result?.text
}

describe('renderQrSvg', () => {
  const cases: [string, QrContent, string, QrAppearance?][] = [
    ['url', { type: 'url', url: 'https://www.pga.org/' }, 'https://www.pga.org/'],
    ['wifi', { type: 'wifi', ssid: 'Club', password: 'secret', security: 'WPA' }, 'WIFI:T:WPA;S:Club;P:secret;;'],
    ['sms', { type: 'sms', phone: '+18005551212', message: 'Hi' }, 'smsto:+18005551212:Hi'],
    [
      'sms with line breaks',
      { type: 'sms', phone: '+18005551212', message: 'Hi!\nSee you at 5.' },
      'sms:+18005551212?&body=Hi!%0ASee%20you%20at%205.'
    ],
    ['rounded dots', { type: 'url', url: 'pga.org' }, 'https://pga.org/', { dotStyle: 'rounded', cornerStyle: 'rounded' }],
    ['round dots', { type: 'url', url: 'pga.org' }, 'https://pga.org/', { dotStyle: 'dots', cornerStyle: 'dot' }],
    ['fluid', { type: 'url', url: 'pga.org' }, 'https://pga.org/', { dotStyle: 'fluid', cornerStyle: 'fluid' }],
    [
      'fluid navy',
      { type: 'wifi', ssid: 'Club', password: 'secret', security: 'WPA' },
      'WIFI:T:WPA;S:Club;P:secret;;',
      { dotStyle: 'fluid', cornerStyle: 'fluid', foreground: '#00205B' }
    ],
    [
      'fluid with logo and caption',
      { type: 'url', url: 'https://www.pga.org/championship/tickets' },
      'https://www.pga.org/championship/tickets',
      { dotStyle: 'fluid', cornerStyle: 'fluid', logo: { src: PIXEL, scale: 0.3 }, caption: 'PGA Championship' }
    ],
    [
      'brand colors',
      { type: 'url', url: 'pga.org' },
      'https://pga.org/',
      { foreground: '#00205B', background: '#fff', cornerSquareColor: '#000' }
    ],
    ['caption', { type: 'url', url: 'pga.org' }, 'https://pga.org/', { caption: 'Scan to visit the PGA' }],
    ['logo', { type: 'url', url: 'https://www.pga.org/championship' }, 'https://www.pga.org/championship', { logo: { src: PIXEL } }]
  ]

  it.each(cases)('produces a scannable %s code', async (_name, content, expected, appearance) => {
    for (const width of [300, 1024]) {
      expect(await decode(renderQrSvg(content, appearance), width)).toBe(expected)
    }
  })

  it('stays scannable with a logo, caption and rounded styling combined', async () => {
    const svg = renderQrSvg(
      { type: 'url', url: 'https://www.pga.org/championship/tickets' },
      { logo: { src: PIXEL, scale: 0.3 }, caption: 'PGA Championship', dotStyle: 'rounded', cornerStyle: 'rounded' }
    )
    expect(await decode(svg)).toBe('https://www.pga.org/championship/tickets')
  })

  it('accepts a raw payload', async () => {
    expect(await decode(renderQrSvg('hello world'))).toBe('hello world')
  })

  it('escapes caption text and logo sources', () => {
    const svg = renderQrSvg('x', { caption: '<script>alert(1)</script> & "q"', logo: { src: 'https://a.b/"onload="x' } })
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).not.toContain('"onload="x')
  })

  it('rejects colors that are not hex (no attribute injection)', () => {
    expect(() => renderQrSvg('x', { foreground: 'red" onload="x' })).toThrow(QrRenderError)
  })

  it('validates size, margin and content', () => {
    expect(() => renderQrSvg('x', { size: 10 })).toThrow(/size/)
    expect(() => renderQrSvg('x', { margin: -1 })).toThrow(/margin/)
    expect(() => renderQrSvg('')).toThrow(QrRenderError)
    expect(() => renderQrSvg({ type: 'url', url: 'javascript:alert(1)' })).toThrow(/valid/)
    expect(() => renderQrSvg('x'.repeat(5000))).toThrow(/too long/)
  })

  it('is deterministic', () => {
    const content: QrContent = { type: 'url', url: 'pga.org' }
    expect(renderQrSvg(content, { caption: 'a' })).toBe(renderQrSvg(content, { caption: 'a' }))
  })

  it('adds a caption strip below the code', () => {
    const plain = renderQrSvg('x')
    const captioned = renderQrSvg('x', { caption: 'hi' })
    const height = (svg: string) => Number(/ height="(\d+)"/.exec(svg)![1])
    expect(height(captioned)).toBeGreaterThan(height(plain))
  })

  describe('grayscale logo', () => {
    const centerPixel = (svg: string) => {
      const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: 400 } }).render()
      const offset = (Math.floor(rendered.height / 2) * rendered.width + Math.floor(rendered.width / 2)) * 4
      const [r, g, b] = [...rendered.pixels.slice(offset, offset + 3)]
      return { r, g, b }
    }
    const content: QrContent = { type: 'url', url: 'https://pga.com' }

    it('keeps a colored logo colored by default', () => {
      const { r, g, b } = centerPixel(renderQrSvg(content, { logo: { src: RED, scale: 0.3 } }))
      expect(r).toBeGreaterThan(150)
      expect(g).toBeLessThan(80)
      expect(b).toBeLessThan(80)
    })

    it('removes all color from the logo when asked, and stays scannable', async () => {
      const svg = renderQrSvg(content, { logo: { src: RED, scale: 0.3, grayscale: true } })
      const { r, g, b } = centerPixel(svg)
      expect(Math.abs(r - g)).toBeLessThanOrEqual(2)
      expect(Math.abs(g - b)).toBeLessThanOrEqual(2)
      expect(r).toBeLessThan(150)
      expect(await decode(svg)).toBe('https://pga.com/')
    })
  })
})
