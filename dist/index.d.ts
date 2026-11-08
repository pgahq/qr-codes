import { Q as QrContent, a as QrAppearance } from './content-BZAJQfZy.js';
export { C as CAPTION_MAX_LENGTH, b as CornerStyle, D as DEFAULT_APPEARANCE, c as DotStyle, E as ErrorCorrection, P as PGA_LOGOS, d as PGA_NAVY, e as PgaLogoKey, f as QrContentType, g as QrLogo, R as Result, S as SIZE_RANGE, h as SMS_MESSAGE_MAX_LENGTH, i as SUGGESTED_CAPTION_MAX_LENGTH, j as SmsContent, T as TEXT_MAX_LENGTH, k as TextContent, U as UrlContent, W as WifiContent, l as WifiSecurity, m as encodeQrContent, n as escapeWifiField, o as normalizePhone, p as normalizePunctuation, q as normalizeUrl, s as suggestCaption } from './content-BZAJQfZy.js';

declare class QrRenderError extends Error {
    readonly field?: string;
    constructor(message: string, field?: string);
}
/**
 * Renders a QR code as a self-contained SVG string.
 *
 * Pass structured {@link QrContent} (validated and encoded for you) or a raw
 * payload string. Output is deterministic, has no external dependencies other
 * than an optional logo, and escapes every interpolated value.
 *
 * @throws {QrRenderError} for invalid content or appearance.
 */
declare function renderQrSvg(input: QrContent | string, appearance?: QrAppearance): string;

interface InlineLogoOptions {
    /**
     * Hostnames a remote logo may be fetched from (exact match or subdomain).
     * Omit in the browser (CORS already limits it); always set it on a server
     * that accepts logo URLs from callers, to avoid server-side request forgery.
     */
    allowedHosts?: readonly string[];
    maxBytes?: number;
    timeoutMs?: number;
    fetch?: typeof fetch;
}
/**
 * Resolves a logo to a `data:` URI. Required before rasterizing, because
 * browsers and renderers do not load external images referenced from an SVG
 * that is itself used as an image.
 */
declare function logoToDataUri(src: string, options?: InlineLogoOptions): Promise<string>;
/** Returns the appearance with `logo.src` replaced by an embedded data URI. */
declare function withInlinedLogo(appearance: QrAppearance, options?: InlineLogoOptions): Promise<QrAppearance>;

interface QrRasterOptions {
    /** Output width in pixels. Default 1024. */
    width?: number;
    logo?: InlineLogoOptions;
}
/** Draws the QR code to a canvas and returns it as a PNG blob. Browser only. */
declare function renderQrPngBlob(input: QrContent | string, appearance?: QrAppearance, { width, logo }?: QrRasterOptions): Promise<Blob>;
interface DownloadQrOptions extends QrRasterOptions {
    /** File name without extension. Default `qr-code`. */
    filename?: string;
    format?: 'png' | 'svg';
}
/** Triggers a browser download of the QR code. */
declare function downloadQr(input: QrContent | string, appearance?: QrAppearance, { filename, format, ...raster }?: DownloadQrOptions): Promise<void>;
/** Whether `copyQrToClipboard` can work here (not available on iOS Safari webviews, insecure origins, etc.). */
declare function canCopyQr(): boolean;
/** Copies the QR code to the clipboard as a PNG image. */
declare function copyQrToClipboard(input: QrContent | string, appearance?: QrAppearance, raster?: QrRasterOptions): Promise<void>;
/** Copies the QR code to the clipboard as SVG markup (pastes into design tools and editors). */
declare function copyQrSvgToClipboard(input: QrContent | string, appearance?: QrAppearance, raster?: QrRasterOptions): Promise<void>;
/** Copies text to the clipboard, falling back to a hidden textarea where the async API is unavailable (e.g. plain http). */
declare function copyTextToClipboard(text: string): Promise<void>;

export { QrAppearance, QrContent, QrRenderError, canCopyQr, copyQrSvgToClipboard, copyQrToClipboard, copyTextToClipboard, downloadQr, logoToDataUri, renderQrPngBlob, renderQrSvg, withInlinedLogo };
export type { DownloadQrOptions, InlineLogoOptions, QrRasterOptions };
