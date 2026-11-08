import { PGA_LOGOS, type QrAppearance, type QrContent } from '@pgahq/qr-codes'
import { QrCode } from '@pgahq/qr-codes/react'

interface Example {
  title: string
  note: string
  content: QrContent
  appearance?: QrAppearance
}

const examples: Example[] = [
  {
    title: 'Default',
    note: 'Black on white, square modules.',
    content: { type: 'url', url: 'pga.org' }
  },
  {
    title: 'Brand colors + logo',
    note: 'Navy modules with the PGA logo. Error correction rises to H automatically.',
    content: { type: 'url', url: 'https://www.pga.org/championship' },
    appearance: { foreground: '#00205B', logo: { src: PGA_LOGOS.blue.src } }
  },
  {
    title: 'Circle logo + caption',
    note: 'Caption sits in its own strip below the code.',
    content: { type: 'url', url: 'https://www.pga.org/tickets' },
    appearance: { foreground: '#00205B', logo: { src: PGA_LOGOS.circle.src }, caption: 'Scan for tickets' }
  },
  {
    title: 'Rounded',
    note: "dotStyle 'rounded', cornerStyle 'rounded'.",
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#00205B', dotStyle: 'rounded', cornerStyle: 'rounded' }
  },
  {
    title: 'Fluid',
    note: "dotStyle 'fluid', cornerStyle 'fluid'. Neighbouring modules join; lone ones become circles.",
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#00205B', dotStyle: 'fluid', cornerStyle: 'fluid' }
  },
  {
    title: 'Dots',
    note: "dotStyle 'dots', cornerStyle 'dot', separate corner colors.",
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#00205B', cornerSquareColor: '#0053FF', cornerDotColor: '#0053FF', dotStyle: 'dots', cornerStyle: 'dot' }
  },
  {
    title: 'Inverted',
    note: 'Light modules on navy. Many scanners need dark-on-light, so test before shipping this.',
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#ffffff', background: '#00205B' }
  }
]

export default function DisplayPage() {
  return (
    <div className="stack">
      <div>
        <h1>Display</h1>
        <p className="lede">
          <code>&lt;QrCode /&gt;</code> rendered from a server component. The SVG is part of the initial HTML, so the code
          is visible before hydration and nothing shifts. For pure server output with no client component, call{' '}
          <code>renderQrSvg</code> directly.
        </p>
      </div>

      <div className="grid">
        {examples.map((example) => (
          <section key={example.title} className="card tile">
            <h2>{example.title}</h2>
            <QrCode content={example.content} appearance={{ size: 512, ...example.appearance }} />
            <p>{example.note}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
