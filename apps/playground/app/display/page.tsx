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
    title: 'Plain URL',
    note: "Defaults: black on white, square modules. Bare 'pga.org' is normalized to https.",
    content: { type: 'url', url: 'pga.org' }
  },
  {
    title: 'Brand colors + logo',
    note: 'Navy modules with the PGA logo. Error correction rises to H automatically.',
    content: { type: 'url', url: 'https://www.pga.org/championship' },
    appearance: { foreground: '#00234b', logo: { src: PGA_LOGOS.blue.src } }
  },
  {
    title: 'Circle logo + caption',
    note: 'Caption sits in its own strip below the code.',
    content: { type: 'url', url: 'https://www.pga.org/tickets' },
    appearance: { foreground: '#00234b', logo: { src: PGA_LOGOS.circle.src }, caption: 'Scan for tickets' }
  },
  {
    title: 'Rounded',
    note: "dotStyle 'rounded', cornerStyle 'rounded'.",
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#00234b', dotStyle: 'rounded', cornerStyle: 'rounded' }
  },
  {
    title: 'Dots',
    note: "dotStyle 'dots', cornerStyle 'dot', separate corner colors.",
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#00234b', cornerSquareColor: '#9c7a1f', cornerDotColor: '#9c7a1f', dotStyle: 'dots', cornerStyle: 'dot' }
  },
  {
    title: 'Inverted',
    note: 'Light modules on navy. Many scanners need dark-on-light, so test before shipping this.',
    content: { type: 'url', url: 'https://www.pga.org/' },
    appearance: { foreground: '#ffffff', background: '#00234b' }
  },
  {
    title: 'Wi-Fi',
    note: 'Special characters in the SSID and password are escaped per the Wi-Fi QR format.',
    content: { type: 'wifi', ssid: 'Club;House', password: 'p:ssw,rd', security: 'WPA' },
    appearance: { foreground: '#00234b', caption: 'Guest Wi-Fi' }
  },
  {
    title: 'Open Wi-Fi (hidden)',
    note: 'security: nopass, hidden: true. No password is encoded.',
    content: { type: 'wifi', ssid: 'Guest', security: 'nopass', hidden: true },
    appearance: { foreground: '#00234b' }
  },
  {
    title: 'SMS',
    note: 'Pre-fills a text message. Smart quotes are normalized.',
    content: { type: 'sms', phone: '+1 (800) 555-1212', message: 'I\u2019d like tee times' },
    appearance: { foreground: '#00234b' }
  },
  {
    title: 'Plain text',
    note: 'Any text, up to 1000 characters.',
    content: { type: 'text', text: 'PGA of America' },
    appearance: { foreground: '#00234b' }
  },
  {
    title: 'Invalid content',
    note: 'Invalid input renders the fallback instead of throwing.',
    content: { type: 'url', url: 'javascript:alert(1)' }
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
            <QrCode
              content={example.content}
              appearance={{ size: 512, ...example.appearance }}
              fallback={<div className="preview error">Not a valid URL, nothing rendered.</div>}
            />
            <p>{example.note}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
