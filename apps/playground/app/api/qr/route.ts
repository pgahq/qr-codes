import { createQrHandler } from '@pga/qr-codes/server'

// The package owns validation, logo fetching and rendering. The app owns routing,
// and is where auth, rate limiting or analytics would wrap the handler.
const handler = createQrHandler()

export const runtime = 'nodejs'
export const GET = handler
export const POST = handler
