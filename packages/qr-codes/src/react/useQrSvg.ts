import { useMemo } from 'react'
import type { QrAppearance } from '../appearance'
import { encodeQrContent, type QrContent, type Result } from '../content'
import { QrRenderError, renderQrSvg } from '../svg'

export interface QrSvgState {
  /** Encoded payload when content is valid. */
  payload: string | null
  svg: string | null
  error: string | null
  field: string | null
}

const EMPTY: QrSvgState = { payload: null, svg: null, error: null, field: null }

export function renderQrState(
  content: QrContent | null,
  appearance: QrAppearance
): QrSvgState {
  if (!content) return EMPTY
  const encoded: Result<string> = encodeQrContent(content)
  if (!encoded.ok) {
    return { ...EMPTY, error: encoded.error, field: encoded.field ?? null }
  }
  try {
    return { payload: encoded.value, svg: renderQrSvg(encoded.value, appearance), error: null, field: null }
  } catch (error) {
    if (error instanceof QrRenderError) {
      return { ...EMPTY, error: error.message, field: error.field ?? null }
    }
    throw error
  }
}

/** Memoized SVG for the given content and appearance. Never throws on bad input. */
export function useQrSvg(content: QrContent | null, appearance: QrAppearance): QrSvgState {
  const key = JSON.stringify([content, appearance])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => renderQrState(content, appearance), [key])
}
