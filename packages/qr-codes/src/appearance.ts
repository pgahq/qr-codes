/** `fluid` joins neighbouring modules into soft shapes; isolated modules become circles. */
export type DotStyle = 'square' | 'rounded' | 'dots' | 'fluid'
/** `fluid` is a rounded-square ring around a round centre. */
export type CornerStyle = 'square' | 'rounded' | 'dot' | 'fluid'
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H'

export interface QrLogo {
  /** https URL or base64 `data:image/...` URI. */
  src: string
  /** Logo width as a fraction of the QR code width. Clamped to 0.1-0.3. */
  scale?: number
  /** Render the logo in greyscale, whatever its original colors. */
  grayscale?: boolean
}

export interface QrAppearance {
  /** Rendered width in pixels. Height follows (a caption adds a strip below). */
  size?: number
  /** Quiet zone around the code, in modules. Scanners need at least 4. */
  margin?: number
  foreground?: string
  background?: string
  /** Defaults to `foreground`. */
  cornerSquareColor?: string
  /** Defaults to `foreground`. */
  cornerDotColor?: string
  dotStyle?: DotStyle
  cornerStyle?: CornerStyle
  logo?: QrLogo
  /** Text rendered under the code. */
  caption?: string
  /** Defaults to `H` when a logo is present (it hides modules), `M` otherwise. */
  errorCorrection?: ErrorCorrection
  /** Accessible name embedded in the SVG. */
  title?: string
}

export const PGA_NAVY = '#00205B'

export const DEFAULT_APPEARANCE = {
  size: 1024,
  margin: 4,
  foreground: '#000000',
  background: '#ffffff',
  dotStyle: 'square',
  cornerStyle: 'square'
} as const satisfies QrAppearance

export const CAPTION_MAX_LENGTH = 80
export const SIZE_RANGE = { min: 64, max: 2048 } as const

export const PGA_LOGOS = {
  blue: {
    label: 'PGA of America (blue)',
    src: 'https://res.cloudinary.com/pgahq/image/upload/v1695259568/PGAA-blue_2x.png'
  },
  circle: {
    label: 'PGA of America (circle)',
    src: 'https://res.cloudinary.com/pgahq/image/upload/v1695257901/PGAA-TM-blue-circle_2x.png'
  }
} as const

export type PgaLogoKey = keyof typeof PGA_LOGOS
