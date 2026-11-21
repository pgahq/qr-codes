import type { NextConfig } from 'next'

const config: NextConfig = {
  // Native module used by @pga/qr-codes/server for PNG output.
  serverExternalPackages: ['@resvg/resvg-js']
}

export default config
