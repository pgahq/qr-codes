import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import '@pgahq/qr-codes/styles.css'
import './globals.css'

export const metadata: Metadata = {
  title: '@pgahq/qr-codes test app',
  description: 'Temporary playground for the @pgahq/qr-codes package'
}

const links = [
  { href: '/builder', label: 'Builder' },
  { href: '/examples', label: 'Examples' },
  { href: '/api-playground', label: 'API' }
]

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            @pgahq/qr-codes
            <span>test app</span>
          </Link>
          <nav aria-label="Primary">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
