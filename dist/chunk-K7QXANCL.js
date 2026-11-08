// src/appearance.ts
var PGA_NAVY = "#00205B";
var DEFAULT_APPEARANCE = {
  size: 1024,
  margin: 4,
  foreground: "#000000",
  background: "#ffffff",
  dotStyle: "square",
  cornerStyle: "square"
};
var CAPTION_MAX_LENGTH = 80;
var SIZE_RANGE = { min: 64, max: 2048 };
var PGA_LOGOS = {
  blue: {
    label: "PGA of America (blue)",
    src: "https://res.cloudinary.com/pgahq/image/upload/v1695259568/PGAA-blue_2x.png"
  },
  circle: {
    label: "PGA of America (circle)",
    src: "https://res.cloudinary.com/pgahq/image/upload/v1695257901/PGAA-TM-blue-circle_2x.png"
  }
};

// src/content.ts
var SMS_MESSAGE_MAX_LENGTH = 159;
var TEXT_MAX_LENGTH = 1e3;
var ok = (value) => ({ ok: true, value });
var fail = (error, field) => ({
  ok: false,
  error,
  field
});
function normalizePunctuation(input) {
  return input.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
}
function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const hasAuthorityScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (hasScheme && !hasAuthorityScheme) {
    if (!/^[^:/]+:\d+(\/|$)/.test(trimmed)) return null;
  }
  const candidate = hasAuthorityScheme ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
    return null;
  }
  return parsed.toString();
}
var SUGGESTED_CAPTION_MAX_LENGTH = 40;
var ELLIPSIS = "\u2026";
function ellipsizeMiddle(text, max) {
  if (text.length <= max) return text;
  const head = Math.ceil((max - 1) * 0.55);
  return `${text.slice(0, head).trimEnd()}${ELLIPSIS}${text.slice(text.length - (max - 1 - head)).trimStart()}`;
}
function abbreviateAddress(host, segments, max) {
  const full = [host, ...segments].join("/");
  if (full.length <= max) return full;
  if (segments.length < 2) return ellipsizeMiddle(full, max);
  const last = segments[segments.length - 1];
  for (let keep = segments.length - 2; keep >= 0; keep--) {
    const candidate = [host, ...segments.slice(0, keep), ELLIPSIS, last].join("/");
    if (candidate.length <= max) return candidate;
  }
  return ellipsizeMiddle(full, max);
}
function suggestCaption(content) {
  switch (content.type) {
    case "url": {
      const normalized = normalizeUrl(content.url);
      if (!normalized) return "";
      const { hostname, pathname } = new URL(normalized);
      const segments = pathname.split("/").filter(Boolean);
      return abbreviateAddress(hostname.replace(/^www\./, ""), segments, SUGGESTED_CAPTION_MAX_LENGTH);
    }
    case "wifi":
      return content.ssid.trim().slice(0, SUGGESTED_CAPTION_MAX_LENGTH);
    default:
      return "";
  }
}
function escapeWifiField(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}
function normalizePhone(input) {
  const compact = input.replace(/[\s().-]/g, "");
  if (!/^\+?\d{3,15}$/.test(compact)) return null;
  if (compact.startsWith("+")) return compact;
  if (/^\d{10}$/.test(compact)) return `+1${compact}`;
  if (/^1\d{10}$/.test(compact)) return `+${compact}`;
  return compact;
}
function encodeQrContent(content) {
  switch (content.type) {
    case "url": {
      if (!content.url.trim()) return fail("Enter a URL.", "url");
      const url = normalizeUrl(content.url);
      return url ? ok(url) : fail("Enter a valid http(s) URL.", "url");
    }
    case "wifi": {
      const ssid = content.ssid;
      if (!ssid) return fail("Enter the network name.", "ssid");
      const security = content.security ?? "WPA";
      const password = content.password ?? "";
      if (security !== "nopass" && !password) {
        return fail("Enter the network password.", "password");
      }
      const parts = [
        `T:${security}`,
        `S:${escapeWifiField(ssid)}`,
        security === "nopass" ? "" : `P:${escapeWifiField(password)}`,
        content.hidden ? "H:true" : ""
      ].filter(Boolean);
      return ok(`WIFI:${parts.join(";")};;`);
    }
    case "sms": {
      const phone = normalizePhone(content.phone);
      if (!phone) {
        return fail("Enter a valid phone number.", "phone");
      }
      const message = normalizePunctuation((content.message ?? "").replace(/\r\n?/g, "\n"));
      if (message.length > SMS_MESSAGE_MAX_LENGTH) {
        return fail(
          `Message must be ${SMS_MESSAGE_MAX_LENGTH} characters or fewer.`,
          "message"
        );
      }
      if (message.includes("\n")) {
        return ok(`sms:${phone}?&body=${encodeURIComponent(message)}`);
      }
      return ok(message ? `smsto:${phone}:${message}` : `smsto:${phone}`);
    }
    case "text": {
      if (!content.text) return fail("Enter some text.", "text");
      if (content.text.length > TEXT_MAX_LENGTH) {
        return fail(`Text must be ${TEXT_MAX_LENGTH} characters or fewer.`, "text");
      }
      return ok(content.text);
    }
  }
}

// src/svg.ts
import { create } from "qrcode";
var QrRenderError = class extends Error {
  field;
  constructor(message, field) {
    super(message);
    this.name = "QrRenderError";
    this.field = field;
  }
};
var EYE = 7;
var GRAYSCALE_FILTER = '<defs><filter id="pga-qr-gray" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter></defs>';
var HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
var FONT_STACK = "Arial, Helvetica, sans-serif";
var LOGO_SCALE = { min: 0.1, max: 0.3, fallback: 0.22 };
var LOGO_PADDING_MODULES = 1;
function buildMatrix(payload, level) {
  let qr;
  try {
    qr = create(payload, { errorCorrectionLevel: level });
  } catch {
    throw new QrRenderError("Content is too long to fit in a QR code.");
  }
  const { modules } = qr;
  return {
    size: modules.size,
    isDark: (row, col) => modules.get(row, col) === 1
  };
}
var xml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var num = (value) => String(Math.round(value * 1e3) / 1e3);
function color(value, field) {
  if (!HEX_COLOR.test(value)) {
    throw new QrRenderError(`${field} must be a hex color like #00205B.`, field);
  }
  return value;
}
function dotPath(style, x, y) {
  switch (style) {
    case "dots": {
      const r = 0.45;
      return `M${num(x + 0.5 - r)} ${num(y + 0.5)}a${r} ${r} 0 1 0 ${num(2 * r)} 0a${r} ${r} 0 1 0 ${num(-2 * r)} 0z`;
    }
    case "rounded": {
      const r = 0.3;
      const s = num(1 - 2 * r);
      return `M${num(x + r)} ${y}h${s}a${r} ${r} 0 0 1 ${r} ${r}v${s}a${r} ${r} 0 0 1 ${-r} ${r}h-${s}a${r} ${r} 0 0 1 ${-r} ${-r}v-${s}a${r} ${r} 0 0 1 ${r} ${-r}z`;
    }
    case "square":
      return `M${x} ${y}h1v1h-1z`;
  }
}
function fluidPath(x, y, up, right, down, left) {
  const r = 0.5;
  const tl = !up && !left;
  const tr = !up && !right;
  const br = !down && !right;
  const bl = !down && !left;
  const c = (on) => on ? r : 0;
  return `M${num(x + c(tl))} ${num(y)}h${num(1 - c(tl) - c(tr))}` + (tr ? `a${r} ${r} 0 0 1 ${r} ${r}` : "") + `v${num(1 - c(tr) - c(br))}` + (br ? `a${r} ${r} 0 0 1 ${-r} ${r}` : "") + `h${num(-(1 - c(br) - c(bl)))}` + (bl ? `a${r} ${r} 0 0 1 ${-r} ${-r}` : "") + `v${num(-(1 - c(bl) - c(tl)))}` + (tl ? `a${r} ${r} 0 0 1 ${r} ${-r}` : "") + "z";
}
function eyeMarkup(style, x, y, squareColor, dotColor) {
  const ring = style === "dot" ? `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3" fill="none" stroke="${squareColor}" stroke-width="1"/>` : style === "fluid" ? `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="2" fill="none" stroke="${squareColor}" stroke-width="1"/>` : style === "rounded" ? `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.75" fill="none" stroke="${squareColor}" stroke-width="1"/>` : `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill="${squareColor}" fill-rule="evenodd"/>`;
  const pupil = style === "dot" || style === "fluid" ? `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${dotColor}"/>` : style === "rounded" ? `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.8" fill="${dotColor}"/>` : `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${dotColor}"/>`;
  return ring + pupil;
}
function clampLogoScale(scale) {
  if (scale === void 0 || Number.isNaN(scale)) return LOGO_SCALE.fallback;
  return Math.min(LOGO_SCALE.max, Math.max(LOGO_SCALE.min, scale));
}
function renderQrSvg(input, appearance = {}) {
  const options = { ...DEFAULT_APPEARANCE, ...stripUndefined(appearance) };
  let payload;
  if (typeof input === "string") {
    if (!input) throw new QrRenderError("Content is empty.");
    payload = input;
  } else {
    const encoded = encodeQrContent(input);
    if (!encoded.ok) throw new QrRenderError(encoded.error, encoded.field);
    payload = encoded.value;
  }
  if (options.size < SIZE_RANGE.min || options.size > SIZE_RANGE.max) {
    throw new QrRenderError(
      `size must be between ${SIZE_RANGE.min} and ${SIZE_RANGE.max}.`,
      "size"
    );
  }
  if (options.margin < 0 || options.margin > 20) {
    throw new QrRenderError(
      "margin must be between 0 and 20 modules.",
      "margin"
    );
  }
  const caption = normalizePunctuation(options.caption?.trim() ?? "");
  if (caption.length > CAPTION_MAX_LENGTH) {
    throw new QrRenderError(
      `caption must be ${CAPTION_MAX_LENGTH} characters or fewer.`,
      "caption"
    );
  }
  const foreground = color(options.foreground, "foreground");
  const background = color(options.background, "background");
  const cornerSquare = color(
    options.cornerSquareColor ?? foreground,
    "cornerSquareColor"
  );
  const cornerDot = color(
    options.cornerDotColor ?? foreground,
    "cornerDotColor"
  );
  const logo = options.logo;
  const level = options.errorCorrection ?? (logo ? "H" : "M");
  const matrix = buildMatrix(payload, level);
  const n = matrix.size;
  const q = options.margin;
  const width = n + 2 * q;
  const captionHeight = caption ? Math.max(3, width * 0.1) : 0;
  const height = width + captionHeight;
  const pixelHeight = Math.round(options.size * height / width);
  const logoSide = logo ? clampLogoScale(logo.scale) * n : 0;
  const logoZone = logo ? (() => {
    const side = logoSide + 2 * LOGO_PADDING_MODULES;
    const origin = q + (n - side) / 2;
    return { min: origin, max: origin + side };
  })() : null;
  const inEye = (r, c) => r < EYE && c < EYE || r < EYE && c >= n - EYE || r >= n - EYE && c < EYE;
  const inLogo = (r, c) => !!logoZone && c + q + 1 > logoZone.min && c + q < logoZone.max && r + q + 1 > logoZone.min && r + q < logoZone.max;
  const drawn = (r, c) => r >= 0 && c >= 0 && r < n && c < n && matrix.isDark(r, c) && !inEye(r, c) && !inLogo(r, c);
  let dots = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!drawn(r, c)) continue;
      dots += options.dotStyle === "fluid" ? fluidPath(
        c + q,
        r + q,
        drawn(r - 1, c),
        drawn(r, c + 1),
        drawn(r + 1, c),
        drawn(r, c - 1)
      ) : dotPath(options.dotStyle, c + q, r + q);
    }
  }
  const eyes = [
    [q, q],
    [q + n - EYE, q],
    [q, q + n - EYE]
  ].map(
    ([x, y]) => eyeMarkup(options.cornerStyle, x, y, cornerSquare, cornerDot)
  ).join("");
  const logoMarkup = logo && logoZone ? `<image${logo.grayscale ? ' filter="url(#pga-qr-gray)"' : ""} href="${xml(logo.src)}" x="${num(q + (n - logoSide) / 2)}" y="${num(q + (n - logoSide) / 2)}" width="${num(logoSide)}" height="${num(logoSide)}" preserveAspectRatio="xMidYMid meet"/>` : "";
  let captionMarkup = "";
  if (caption) {
    const available = width - 2 * Math.max(q, 1);
    const fontSize = Math.min(
      width * 0.055,
      available / (caption.length * 0.58)
    );
    const baseline = width + captionHeight / 2 + fontSize * 0.35 - q * 0.25;
    captionMarkup = `<text x="${num(width / 2)}" y="${num(baseline)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${num(fontSize)}" font-weight="600" fill="${foreground}">${xml(caption)}</text>`;
  }
  const title = xml(options.title ?? (caption || "QR code"));
  const rendering = options.dotStyle === "square" && options.cornerStyle === "square" ? "crispEdges" : "geometricPrecision";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" width="${options.size}" height="${pixelHeight}" role="img" aria-label="${title}"><title>${title}</title>` + (logo?.grayscale ? GRAYSCALE_FILTER : "") + `<rect width="${num(width)}" height="${num(height)}" fill="${background}"/><path d="${dots}" fill="${foreground}" shape-rendering="${rendering}"/><g shape-rendering="${rendering}">${eyes}</g>` + logoMarkup + captionMarkup + `</svg>`;
}
function stripUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== void 0)
  );
}

// src/assets.ts
var ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
var DATA_URI = /^data:(image\/(?:png|jpeg|webp|gif));base64,[a-z0-9+/=]+$/i;
var hostAllowed = (host, allowed) => allowed.some((entry) => host === entry || host.endsWith(`.${entry}`));
function toBase64(bytes) {
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
async function logoToDataUri(src, options = {}) {
  if (src.startsWith("data:")) {
    if (!DATA_URI.test(src)) {
      throw new QrRenderError("Logo must be a base64 png, jpeg, webp or gif.", "logo");
    }
    return src;
  }
  let url;
  try {
    url = new URL(src);
  } catch {
    throw new QrRenderError("Logo must be an https URL or data URI.", "logo");
  }
  if (url.protocol !== "https:") {
    throw new QrRenderError("Logo URL must use https.", "logo");
  }
  if (options.allowedHosts && !hostAllowed(url.hostname, options.allowedHosts)) {
    throw new QrRenderError(`Logo host ${url.hostname} is not allowed.`, "logo");
  }
  const { maxBytes = 1e6, timeoutMs = 5e3, fetch: fetchImpl = fetch } = options;
  let response;
  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error"
    });
  } catch {
    throw new QrRenderError("Could not load the logo image.", "logo");
  }
  if (!response.ok) {
    throw new QrRenderError(`Logo request failed (${response.status}).`, "logo");
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new QrRenderError("Logo must be a png, jpeg, webp or gif.", "logo");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new QrRenderError(`Logo must be smaller than ${Math.round(maxBytes / 1e3)} KB.`, "logo");
  }
  return `data:${type};base64,${toBase64(bytes)}`;
}
async function withInlinedLogo(appearance, options) {
  if (!appearance.logo) return appearance;
  return {
    ...appearance,
    logo: { ...appearance.logo, src: await logoToDataUri(appearance.logo.src, options) }
  };
}

export {
  PGA_NAVY,
  DEFAULT_APPEARANCE,
  CAPTION_MAX_LENGTH,
  SIZE_RANGE,
  PGA_LOGOS,
  SMS_MESSAGE_MAX_LENGTH,
  TEXT_MAX_LENGTH,
  normalizePunctuation,
  normalizeUrl,
  SUGGESTED_CAPTION_MAX_LENGTH,
  suggestCaption,
  escapeWifiField,
  normalizePhone,
  encodeQrContent,
  QrRenderError,
  renderQrSvg,
  logoToDataUri,
  withInlinedLogo
};
//# sourceMappingURL=chunk-K7QXANCL.js.map