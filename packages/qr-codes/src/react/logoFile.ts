export const LOGO_UPLOAD_MAX_BYTES = 1_000_000
const LOGO_MAX_EDGE = 256

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Downscales large images so five saved logos stay well inside localStorage
 * limits. Returns null when the browser cannot do it or it is not needed.
 */
async function downscale(file: File): Promise<string | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1) {
      bitmap.close()
      return null
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/** Validates an uploaded logo and returns it as a (small) data URI. Nothing leaves the browser. */
export async function readLogoFile(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    throw new Error('Choose a png, jpeg, webp or gif image.')
  }
  if (file.size > LOGO_UPLOAD_MAX_BYTES) {
    throw new Error('Image must be smaller than 1 MB.')
  }
  return (await downscale(file)) ?? readAsDataUri(file)
}

const STORED_LOGO = /^(data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+|https:\/\/\S+)$/i

export function loadStoredLogos(storageKey: string, max: number): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && STORED_LOGO.test(item)))].slice(0, max)
  } catch {
    return []
  }
}

/** Returns false when the browser refused to store it (private mode, quota). */
export function saveStoredLogos(storageKey: string, logos: readonly string[]): boolean {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(logos))
    return true
  } catch {
    return false
  }
}
