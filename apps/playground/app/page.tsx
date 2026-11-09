import Link from 'next/link'

const demos = [
  {
    href: '/builder',
    title: 'Builder',
    body: '<QrBuilder /> from @pgahq/qr-codes/react: URL, Wi-Fi and SMS codes with logo, caption, download and copy.'
  },
  {
    href: '/examples',
    title: 'Examples',
    body: '<QrCode /> rendered on the server with different content types, colors, styles, logos and captions.'
  },
  {
    href: '/api-playground',
    title: 'API',
    body: '/api/qr built with createQrHandler from @pgahq/qr-codes/server: GET for <img>, POST for secrets, SVG and PNG.'
  }
]

export default function Home() {
  return (
    <div className="stack">
      <div>
        <h1>@pgahq/qr-codes</h1>
        <p className="lede">
          Temporary playground for the shared QR package. The package is installed from a packed tarball, the same way a
          consuming app would get it.
        </p>
      </div>
      <div className="cards">
        {demos.map((demo) => (
          <Link key={demo.href} href={demo.href}>
            <div className="card">
              <h2>{demo.title}</h2>
              <p>{demo.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
