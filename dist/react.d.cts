import * as react from 'react';
import { ReactNode, CSSProperties } from 'react';
import { QrContent, QrAppearance, QrContentType, DotStyle, CornerStyle, WifiSecurity, UrlContent, WifiContent, SmsContent } from './index.cjs';

interface QrSvgState {
    /** Encoded payload when content is valid. */
    payload: string | null;
    svg: string | null;
    error: string | null;
    field: string | null;
}
declare function renderQrState(content: QrContent | null, appearance: QrAppearance): QrSvgState;
/** Memoized SVG for the given content and appearance. Never throws on bad input. */
declare function useQrSvg(content: QrContent | null, appearance: QrAppearance): QrSvgState;

type QrStyleId = 'fluid' | 'classic';
type QrColorId = 'navy' | 'black' | 'greyscale';
/** Single-colour looks offered by the builder. */
declare const QR_STYLES: readonly {
    id: QrStyleId;
    label: string;
    dotStyle: DotStyle;
    cornerStyle: CornerStyle;
}[];
/** `greyscale` is a black code with the logo desaturated, so nothing on the page has color. */
declare const QR_COLORS: readonly {
    id: QrColorId;
    label: string;
    value: string;
    swatch: string;
    grayscale?: boolean;
}[];
type ImageFormat = 'png' | 'svg';
type BuilderTab = Extract<QrContentType, 'url' | 'wifi' | 'sms'>;
interface LogoPreset {
    label: string;
    src: string;
}
interface QrBuilderEvent {
    type: 'start' | 'download' | 'copy' | 'copy-link';
    tab: BuilderTab;
    /** Present for download/copy. */
    hasLogo?: boolean;
    hasCaption?: boolean;
    format?: ImageFormat;
    style?: QrStyleId;
    color?: QrColorId;
}
interface UseQrBuilderOptions {
    defaultTab?: BuilderTab;
    /** URL prefilled on the URL tab. Default: empty (the field shows a placeholder). */
    defaultUrl?: string;
    /** Look selected on first render. Default: fluid. */
    defaultStyle?: QrStyleId;
    /** Code color selected on first render. Default: navy. */
    defaultColor?: QrColorId;
    /**
     * localStorage key used to remember uploaded logos between visits.
     * Pass `null` to keep them for the current page only.
     */
    storageKey?: string | null;
    /** Base styling (colors, dot/corner styles, size). Logo and caption are managed by the builder. */
    appearance?: QrAppearance;
    logoPresets?: readonly LogoPreset[];
    /** Logo selected on first render. Default: the first preset. Pass `null` for none. */
    defaultLogo?: string | null;
    /** Base file name for downloads when there is no caption. */
    filename?: string;
    onEvent?: (event: QrBuilderEvent) => void;
}
declare const DEFAULT_STORAGE_KEY = "pgahq:qr-codes:custom-logos";
declare const MAX_CUSTOM_LOGOS = 5;
declare const DEFAULT_LOGO_PRESETS: readonly LogoPreset[];
type ActionStatus = 'idle' | 'working' | 'done' | 'error';
/**
 * Headless state for a QR builder: form fields per content type, logo and
 * caption, the derived QR, and download/copy actions. `QrBuilder` is one UI on
 * top of it; use it directly to build a different layout.
 */
declare function useQrBuilder(options?: UseQrBuilderOptions): {
    tab: BuilderTab;
    setTab: (next: BuilderTab) => void;
    url: string;
    setUrl: (value: react.SetStateAction<string>) => void;
    wifi: {
        ssid: string;
        password: string;
        security: WifiSecurity;
        hidden: boolean;
    };
    setWifi: (value: react.SetStateAction<{
        ssid: string;
        password: string;
        security: WifiSecurity;
        hidden: boolean;
    }>) => void;
    sms: {
        phone: string;
        message: string;
    };
    setSms: (value: react.SetStateAction<{
        phone: string;
        message: string;
    }>) => void;
    caption: string;
    setCaption: (value: react.SetStateAction<string | null>) => void;
    logo: string | null;
    logoEnabled: boolean;
    setLogo: (src: string) => void;
    setLogoEnabled: (value: react.SetStateAction<boolean>) => void;
    styleId: QrStyleId;
    setStyleId: (value: react.SetStateAction<QrStyleId>) => void;
    colorId: QrColorId;
    setColorId: (value: react.SetStateAction<QrColorId>) => void;
    logoPresets: readonly LogoPreset[];
    customLogos: string[];
    maxCustomLogos: number;
    addCustomLogo: (src: string) => void;
    removeCustomLogo: (src: string) => void;
    storageWarning: boolean;
    content: UrlContent | WifiContent | SmsContent;
    appearance: QrAppearance;
    qr: QrSvgState;
    download: (format?: ImageFormat) => Promise<void>;
    copy: (format?: ImageFormat) => Promise<void>;
    copyStatus: ActionStatus;
    linkStatus: ActionStatus;
    copyLink: (text: string) => Promise<void>;
    downloadStatus: ActionStatus;
    copySupported: boolean;
    actionError: string | null;
};
type QrBuilderState = ReturnType<typeof useQrBuilder>;

interface QrBuilderProps extends UseQrBuilderOptions {
    className?: string;
    /**
     * Upload a custom logo and return a https URL (e.g. to Cloudinary).
     * Default: the image is shrunk and embedded as a data URI, so nothing leaves the browser.
     * Uploaded logos (up to 5) are remembered on this device; see `storageKey`.
     */
    onUploadLogo?: (file: File) => Promise<string>;
    /** Set false to hide the custom logo upload. */
    allowLogoUpload?: boolean;
    /** Set false to hide the style choices (Fluid, Classic). The builder keeps using `defaultStyle`. Default: true. */
    allowStyleChoice?: boolean;
    /** Set false to hide the color choices (Navy, Black, Greyscale). The builder keeps using `defaultColor`. Default: true. */
    allowColorChoice?: boolean;
    /** Focus the first field of the form when the builder mounts. Off by default so embeds don't steal focus from the host page. */
    autoFocus?: boolean;
    /** Placeholder shown until the content is valid. Default: the first logo preset. */
    placeholder?: ReactNode;
    /**
     * Optional link behind a "Link" button under the code (for example a URL for the generated image).
     * Pass a function to build it from the current state; return nothing to disable the button.
     */
    link?: string | ((state: QrBuilderState) => string | null | undefined);
    /** Text on the link button. Default: "Link". */
    linkLabel?: string;
    /**
     * Called on mount and whenever the content or appearance the builder renders changes, so a host page can
     * show matching code or sync its own state. The values are the exact inputs to `renderQrSvg` / `<QrCode />`.
     */
    onChange?: (value: {
        content: QrContent;
        appearance: QrAppearance;
    }) => void;
}
/**
 * Full QR builder: choose a type (URL, Wi-Fi, SMS), add a logo and caption,
 * preview, then download or copy. Import `@pga/qr-codes/styles.css` once.
 */
declare function QrBuilder({ className, onUploadLogo, allowLogoUpload, autoFocus, allowStyleChoice, allowColorChoice, placeholder, link, linkLabel, onChange, ...options }: QrBuilderProps): react.JSX.Element;

interface QrCodeProps {
    content: QrContent;
    appearance?: QrAppearance;
    /** Rendered when the content is incomplete or invalid. Default: nothing. */
    fallback?: ReactNode | ((error: string) => ReactNode);
    className?: string;
    style?: CSSProperties;
}
/**
 * Displays a QR code. Renders the same SVG the server produces, so SSR output
 * matches the client and no layout shift occurs.
 */
declare function QrCode({ content, appearance, fallback, className, style }: QrCodeProps): react.JSX.Element;

export { DEFAULT_LOGO_PRESETS, DEFAULT_STORAGE_KEY, MAX_CUSTOM_LOGOS, QR_COLORS, QR_STYLES, QrBuilder, QrCode, renderQrState, useQrBuilder, useQrSvg };
export type { ActionStatus, BuilderTab, ImageFormat, LogoPreset, QrBuilderEvent, QrBuilderProps, QrBuilderState, QrCodeProps, QrColorId, QrStyleId, QrSvgState, UseQrBuilderOptions };
