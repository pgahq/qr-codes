"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







var _chunkIW2QKMFYcjs = require('./chunk-IW2QKMFY.cjs');

// src/server/png.ts
var PngUnavailableError = class extends Error {
  constructor() {
    super('PNG output requires the optional "@resvg/resvg-js" package to be installed.');
    this.name = "PngUnavailableError";
  }
};
async function renderPng(svg, { width, fontFiles }) {
  let resvg;
  try {
    resvg = await Promise.resolve().then(() => _interopRequireWildcard(require("@resvg/resvg-js")));
  } catch (e) {
    throw new PngUnavailableError();
  }
  const renderer = new resvg.Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true, fontFiles, defaultFontFamily: "Arial" }
  });
  return renderer.render().asPng();
}

// src/server/request.ts
var fail = (error, field) => ({ ok: false, error, field });
var str = (params, ...keys) => {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value !== "") return value;
    if (typeof value === "number") return String(value);
  }
  return void 0;
};
var bool = (params, key) => {
  const value = params[key];
  return value === true || value === "true" || value === "1" || value === 1;
};
var oneOf = (value, allowed) => {
  if (value === void 0) return void 0;
  return allowed.includes(value) ? value : null;
};
var hexColor = (value) => value === void 0 ? void 0 : /^[0-9a-f]{3,8}$/i.test(value) ? `#${value}` : value;
function parseQrRequest(params, options = {}) {
  const type = _nullishCoalesce(str(params, "type"), () => ( "url"));
  let content;
  switch (type) {
    case "url":
      content = { type, url: _nullishCoalesce(str(params, "url"), () => ( "")) };
      break;
    case "wifi": {
      const security = oneOf(str(params, "security"), ["WPA", "WEP", "nopass"]);
      if (security === null) return fail("security must be WPA, WEP or nopass.", "security");
      content = {
        type,
        ssid: _nullishCoalesce(str(params, "ssid"), () => ( "")),
        password: str(params, "password"),
        security,
        hidden: bool(params, "hidden")
      };
      break;
    }
    case "sms":
      content = { type, phone: _nullishCoalesce(str(params, "phone"), () => ( "")), message: str(params, "message") };
      break;
    case "text":
      content = { type, text: _nullishCoalesce(str(params, "text"), () => ( "")) };
      break;
    default:
      return fail("type must be one of url, wifi, sms, text.", "type");
  }
  const encoded = _chunkIW2QKMFYcjs.encodeQrContent.call(void 0, content);
  if (!encoded.ok) return encoded;
  const format = oneOf(str(params, "format"), ["svg", "png"]);
  if (format === null) return fail("format must be svg or png.", "format");
  const dotStyle = oneOf(str(params, "dotStyle"), ["square", "rounded", "dots", "fluid"]);
  if (dotStyle === null) return fail("dotStyle must be square, rounded, dots or fluid.", "dotStyle");
  const cornerStyle = oneOf(str(params, "cornerStyle"), ["square", "rounded", "dot", "fluid"]);
  if (cornerStyle === null) return fail("cornerStyle must be square, rounded, dot or fluid.", "cornerStyle");
  const errorCorrection = oneOf(str(params, "errorCorrection"), ["L", "M", "Q", "H"]);
  if (errorCorrection === null) return fail("errorCorrection must be L, M, Q or H.", "errorCorrection");
  const numeric = (key) => {
    const raw = str(params, key);
    if (raw === void 0) return void 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const size = numeric("size");
  if (size === null || size !== void 0 && (size < _chunkIW2QKMFYcjs.SIZE_RANGE.min || size > _chunkIW2QKMFYcjs.SIZE_RANGE.max)) {
    return fail(`size must be a number between ${_chunkIW2QKMFYcjs.SIZE_RANGE.min} and ${_chunkIW2QKMFYcjs.SIZE_RANGE.max}.`, "size");
  }
  const margin = numeric("margin");
  if (margin === null) return fail("margin must be a number.", "margin");
  const logoScale = numeric("logoScale");
  if (logoScale === null) return fail("logoScale must be a number.", "logoScale");
  const caption = str(params, "caption");
  const logoGrayscale = bool(params, "logoGrayscale");
  if (caption !== void 0 && caption.length > _chunkIW2QKMFYcjs.CAPTION_MAX_LENGTH) {
    return fail(`caption must be ${_chunkIW2QKMFYcjs.CAPTION_MAX_LENGTH} characters or fewer.`, "caption");
  }
  let logoSrc;
  const logoParam = str(params, "logo");
  if (logoParam !== void 0) {
    const preset = _optionalChain([options, 'access', _ => _.logoPresets, 'optionalAccess', _2 => _2[logoParam]]);
    if (preset) {
      logoSrc = preset;
    } else if (options.allowCustomLogo === false) {
      const keys = Object.keys(_nullishCoalesce(options.logoPresets, () => ( {}))).join(", ") || "none configured";
      return fail(`logo must be one of: ${keys}.`, "logo");
    } else {
      logoSrc = logoParam;
    }
  }
  const appearance = {
    ...options.defaultAppearance,
    ...size !== void 0 && { size },
    ...margin !== void 0 && { margin },
    ...caption !== void 0 && { caption },
    ...dotStyle && { dotStyle },
    ...cornerStyle && { cornerStyle },
    ...errorCorrection && { errorCorrection },
    ...str(params, "fg", "foreground") && { foreground: hexColor(str(params, "fg", "foreground")) },
    ...str(params, "bg", "background") && { background: hexColor(str(params, "bg", "background")) },
    ...str(params, "cornerSquareColor") && { cornerSquareColor: hexColor(str(params, "cornerSquareColor")) },
    ...str(params, "cornerDotColor") && { cornerDotColor: hexColor(str(params, "cornerDotColor")) },
    ...logoSrc && { logo: { src: logoSrc, ...logoScale !== void 0 && { scale: logoScale }, ...logoGrayscale && { grayscale: true } } }
  };
  return {
    ok: true,
    value: {
      content,
      payload: encoded.value,
      appearance,
      format: _nullishCoalesce(format, () => ( "svg")),
      filename: (_nullishCoalesce(_nullishCoalesce(str(params, "filename"), () => ( caption)), () => ( "PGA-qr-code"))).replace(/[\\/:*?"<>|\r\n]+/g, "-").slice(0, 100),
      download: bool(params, "download")
    }
  };
}

// src/server/handler.ts
var DEFAULT_LOGO_PRESETS = Object.fromEntries(
  Object.entries(_chunkIW2QKMFYcjs.PGA_LOGOS).map(([key, logo]) => [key, logo.src])
);
var SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'"
};
var json = (status, body, headers) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
async function readParams(request) {
  if (request.method === "GET") {
    return Object.fromEntries(new URL(request.url).searchParams);
  }
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body;
    }
  } catch (e2) {
  }
  return json(400, { error: "Request body must be a JSON object." });
}
function createQrHandler(options = {}) {
  const {
    allowedLogoHosts: extraLogoHosts = [],
    maxAgeSeconds = 86400,
    fontFiles,
    fetch: fetchImpl,
    ...parseOptions
  } = options;
  const logoPresets = _nullishCoalesce(parseOptions.logoPresets, () => ( DEFAULT_LOGO_PRESETS));
  const allowedLogoHosts = [
    .../* @__PURE__ */ new Set([...Object.values(logoPresets).map((src) => new URL(src).hostname), ...extraLogoHosts])
  ];
  return async function handleQrRequest(request) {
    if (request.method !== "GET" && request.method !== "POST") {
      return json(405, { error: "Use GET or POST." }, { Allow: "GET, POST" });
    }
    const params = await readParams(request);
    if (params instanceof Response) return params;
    const parsed = parseQrRequest(params, { ...parseOptions, logoPresets });
    if (!parsed.ok) return json(400, { error: parsed.error, field: parsed.field });
    const { content, payload, appearance, format, filename, download } = parsed.value;
    try {
      const inlined = await _chunkIW2QKMFYcjs.withInlinedLogo.call(void 0, appearance, {
        allowedHosts: allowedLogoHosts,
        fetch: fetchImpl
      });
      const svg = _chunkIW2QKMFYcjs.renderQrSvg.call(void 0, payload, inlined);
      const sensitive = request.method !== "GET" || content.type === "wifi";
      const headers = {
        ...SECURITY_HEADERS,
        "Cache-Control": sensitive || maxAgeSeconds === 0 ? "no-store" : `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`
      };
      if (download) {
        headers["Content-Disposition"] = `attachment; filename="${filename.replace(/[^\w .-]+/g, "-")}.${format}"`;
      }
      if (format === "svg") {
        return new Response(svg, {
          headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" }
        });
      }
      const png = await renderPng(svg, { width: _nullishCoalesce(inlined.size, () => ( 1024)), fontFiles });
      return new Response(png, { headers: { ...headers, "Content-Type": "image/png" } });
    } catch (error) {
      if (error instanceof _chunkIW2QKMFYcjs.QrRenderError) {
        return json(422, { error: error.message, field: error.field });
      }
      if (error instanceof PngUnavailableError) {
        return json(501, { error: error.message });
      }
      console.error("[qr-code] unexpected render failure", error);
      return json(500, { error: "Could not generate the QR code." });
    }
  };
}





exports.PngUnavailableError = PngUnavailableError; exports.createQrHandler = createQrHandler; exports.parseQrRequest = parseQrRequest; exports.renderPng = renderPng;
//# sourceMappingURL=server.cjs.map