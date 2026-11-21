/** `fluid` joins neighbouring modules into soft shapes; isolated modules become circles. */
type DotStyle = 'square' | 'rounded' | 'dots' | 'fluid';
/** `fluid` is a rounded-square ring around a round centre. */
type CornerStyle = 'square' | 'rounded' | 'dot' | 'fluid';
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';
interface QrLogo {
    /** https URL or base64 `data:image/...` URI. */
    src: string;
    /** Logo width as a fraction of the QR code width. Clamped to 0.1-0.3. */
    scale?: number;
    /** Render the logo in greyscale, whatever its original colors. */
    grayscale?: boolean;
}
interface QrAppearance {
    /** Rendered width in pixels. Height follows (a caption adds a strip below). */
    size?: number;
    /** Quiet zone around the code, in modules. Scanners need at least 4. */
    margin?: number;
    foreground?: string;
    background?: string;
    /** Defaults to `foreground`. */
    cornerSquareColor?: string;
    /** Defaults to `foreground`. */
    cornerDotColor?: string;
    dotStyle?: DotStyle;
    cornerStyle?: CornerStyle;
    logo?: QrLogo;
    /** Text rendered under the code. */
    caption?: string;
    /** Defaults to `H` when a logo is present (it hides modules), `M` otherwise. */
    errorCorrection?: ErrorCorrection;
    /** Accessible name embedded in the SVG. */
    title?: string;
}
declare const PGA_NAVY = "#00205B";
declare const DEFAULT_APPEARANCE: {
    readonly size: 1024;
    readonly margin: 4;
    readonly foreground: "#000000";
    readonly background: "#ffffff";
    readonly dotStyle: "square";
    readonly cornerStyle: "square";
};
declare const CAPTION_MAX_LENGTH = 80;
declare const SIZE_RANGE: {
    readonly min: 64;
    readonly max: 2048;
};
declare const PGA_LOGOS: {
    readonly blue: {
        readonly label: "PGA of America (blue)";
        readonly src: "https://res.cloudinary.com/pgahq/image/upload/v1695259568/PGAA-blue_2x.png";
    };
    readonly circle: {
        readonly label: "PGA of America (circle)";
        readonly src: "https://res.cloudinary.com/pgahq/image/upload/v1695257901/PGAA-TM-blue-circle_2x.png";
    };
};
type PgaLogoKey = keyof typeof PGA_LOGOS;
/**
 * What the builder opens with (Navy, Fluid, PGA blue logo) and what the API
 * renders when a request does not say otherwise. `QR_COLORS` and `QR_STYLES`
 * in the builder resolve to the same values (covered by a test), so the two
 * cannot drift apart.
 */
declare const PGA_DEFAULT_APPEARANCE: {
    readonly foreground: "#00205B";
    readonly dotStyle: "fluid";
    readonly cornerStyle: "fluid";
    readonly logo: {
        readonly src: "https://res.cloudinary.com/pgahq/image/upload/v1695259568/PGAA-blue_2x.png";
    };
};

type QrContentType = 'url' | 'wifi' | 'sms' | 'text';
type WifiSecurity = 'WPA' | 'WEP' | 'nopass';
interface UrlContent {
    type: 'url';
    url: string;
}
interface WifiContent {
    type: 'wifi';
    ssid: string;
    password?: string;
    security?: WifiSecurity;
    hidden?: boolean;
}
interface SmsContent {
    type: 'sms';
    phone: string;
    message?: string;
}
interface TextContent {
    type: 'text';
    text: string;
}
type QrContent = UrlContent | WifiContent | SmsContent | TextContent;
type Result<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
    field?: string;
};
declare const SMS_MESSAGE_MAX_LENGTH = 159;
declare const TEXT_MAX_LENGTH = 1000;
/** Turns pasted "smart" punctuation into plain ASCII so phones decode it reliably. */
declare function normalizePunctuation(input: string): string;
/**
 * Accepts "pga.org", "http://pga.org/x" or "https://pga.org" and returns a
 * normalized absolute http(s) URL, or null when the input cannot be one.
 * Other schemes (javascript:, data:, ftp:) are rejected on purpose.
 */
declare function normalizeUrl(input: string): string | null;
declare const SUGGESTED_CAPTION_MAX_LENGTH = 40;
/**
 * A short, human-friendly caption for content: "https://www.pga.com/a/b?x=1"
 * becomes "pga.com/a/b". Long addresses lose their middle path segments
 * ("vercel.com/pgahq/\u2026/and-this-page") so the domain and the page stay
 * visible. Returns "" when there is nothing sensible to suggest.
 */
declare function suggestCaption(content: QrContent): string;
/** Escapes the characters that are special in the Wi-Fi QR format. */
declare function escapeWifiField(value: string): string;
/**
 * Returns the number in international form. Numbers typed without a country
 * code are assumed to be US/Canada (+1): 10 digits, or 11 starting with 1.
 * Other digit-only values (short codes such as 800) are left as typed.
 */
declare function normalizePhone(input: string): string | null;
/**
 * Validates structured content and produces the exact string that is encoded
 * into the QR code (the payload).
 */
declare function encodeQrContent(content: QrContent): Result<string>;

export { CAPTION_MAX_LENGTH as C, DEFAULT_APPEARANCE as D, PGA_DEFAULT_APPEARANCE as P, SIZE_RANGE as S, TEXT_MAX_LENGTH as T, PGA_LOGOS as d, PGA_NAVY as e, SMS_MESSAGE_MAX_LENGTH as i, SUGGESTED_CAPTION_MAX_LENGTH as j, encodeQrContent as n, escapeWifiField as o, normalizePhone as p, normalizePunctuation as q, normalizeUrl as r, suggestCaption as s };
export type { ErrorCorrection as E, QrContent as Q, Result as R, UrlContent as U, WifiContent as W, QrAppearance as a, CornerStyle as b, DotStyle as c, PgaLogoKey as f, QrContentType as g, QrLogo as h, SmsContent as k, TextContent as l, WifiSecurity as m };
