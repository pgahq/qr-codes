import { PGA_DEFAULT_APPEARANCE, PGA_LOGOS, suggestCaption, type QrAppearance, type QrContent } from '@pgahq/qr-codes'
import { QrCode } from '@pgahq/qr-codes/react'

interface Example {
  title: string
  note: string
  content: QrContent
  appearance?: QrAppearance
}

const defaultContent: QrContent = { type: 'url', url: 'https://www.pga.org/championship' }

const defaultSettings = [
  ['Color', 'Navy (#00205B) on white'],
  ['Style', 'Fluid dots and corners'],
  ['Logo', 'PGA of America (blue)'],
  ['Caption', 'Follows the content, e.g. pga.org/championship']
] as const

const examples: Example[] = [
  {
    title: 'No styling',
    note: 'What renderQrSvg draws with no appearance at all: black on white, square modules, no logo. Apps normally start from the default above.',
    content: { type: 'url', url: 'pga.org' }
  },
  {
    title: 'Classic style + logo',
    note: 'Navy square modules with the PGA logo. Error correction rises to H automatically.',
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
    title: 'Fluid, no logo',
    note: "The default's dotStyle 'fluid' and cornerStyle 'fluid' without the logo. Neighbouring modules join; lone ones become circles.",
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

      <section className="card default-card" aria-labelledby="default-heading">
        <QrCode
          content={defaultContent}
          appearance={{ size: 512, ...PGA_DEFAULT_APPEARANCE, caption: suggestCaption(defaultContent) }}
        />
        <div className="stack">
          <div>
            <span className="badge">Default</span>
            <h2 id="default-heading">The default configuration</h2>
          </div>
          <p>
            This is where <code>&lt;QrBuilder /&gt;</code> opens, and what <code>/api/qr</code> renders when a request
            sets no styling. It comes from <code>PGA_DEFAULT_APPEARANCE</code>, so all three stay in step. Everything
            below is a variation of it.
          </p>
          <dl className="settings">
            {defaultSettings.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <h2 className="section-title">Variations</h2>
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
