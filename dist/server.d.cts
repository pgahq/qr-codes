import { QrAppearance, QrContent, Result } from './index.cjs';

type QrFormat = 'svg' | 'png';
interface QrRequest {
    content: QrContent;
    /** Validated payload string that will be encoded. */
    payload: string;
    appearance: QrAppearance;
    format: QrFormat;
    filename: string;
    download: boolean;
}
interface ParseOptions {
    /** Named logos callers may reference as `logo=<key>`. */
    logoPresets?: Readonly<Record<string, string>>;
    defaultAppearance?: QrAppearance;
    /** When false, `logo` must be a preset key (no arbitrary URLs / data URIs). Default true. */
    allowCustomLogo?: boolean;
}
type Params = Record<string, unknown>;
/**
 * Parses a flat key/value request (URL search params or a JSON body) into a
 * validated {@link QrRequest}. Never throws; returns the first problem found.
 */
declare function parseQrRequest(params: Params, options?: ParseOptions): Result<QrRequest>;

interface QrHandlerOptions extends ParseOptions {
    /** Extra hosts custom `logo=<https url>` values may be fetched from. Preset hosts are always allowed. */
    allowedLogoHosts?: readonly string[];
    /** Browser/CDN cache lifetime for GET responses. Default 1 day. Use 0 to disable. */
    maxAgeSeconds?: number;
    /** Font files for PNG captions on hosts without system fonts. */
    fontFiles?: string[];
    fetch?: typeof fetch;
}
/**
 * Creates a Web-standard `(Request) => Promise<Response>` that renders QR codes.
 *
 * - `GET  ?type=url&url=...&format=png` for `<img src>` and links.
 * - `POST` with the same fields as JSON, for secrets such as Wi-Fi passwords
 *   (URLs end up in logs and caches; bodies do not).
 *
 * It owns validation, logo fetching and rendering but not routing, auth, or
 * rate limiting; mount it from the app (e.g. `export const GET = handler`) and
 * wrap it with whatever the app needs.
 */
declare function createQrHandler(options?: QrHandlerOptions): (request: Request) => Promise<Response>;

interface PngOptions {
    /** Output width in pixels. */
    width: number;
    /** Font files for the caption. Needed on hosts without system fonts (e.g. Vercel). */
    fontFiles?: string[];
}
declare class PngUnavailableError extends Error {
    constructor();
}
/**
 * Rasterizes an SVG produced by `renderQrSvg` to PNG using `@resvg/resvg-js`
 * (an optional peer dependency, loaded lazily so SVG-only users never pay for it).
 * The SVG must already have its logo inlined as a data URI.
 */
declare function renderPng(svg: string, { width, fontFiles }: PngOptions): Promise<Uint8Array>;

export { PngUnavailableError, createQrHandler, parseQrRequest, renderPng };
export type { ParseOptions, PngOptions, QrFormat, QrHandlerOptions, QrRequest };
