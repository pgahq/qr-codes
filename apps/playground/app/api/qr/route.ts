import { createQrHandler } from '@pgahq/qr-codes/server'

// The package owns validation, logo fetching and rendering. The app owns routing,
// and is where auth, rate limiting or analytics would wrap the handler.
const handler = createQrHandler({
  defaultAppearance: { foreground: '#00205B' }
})

export const runtime = 'nodejs'
export const GET = handler
export const POST = handler
