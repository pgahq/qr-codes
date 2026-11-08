"use client";
"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }





var _chunkLE7SSCJJcjs = require('./chunk-LE7SSCJJ.cjs');









var _chunkWVCFQM67cjs = require('./chunk-WVCFQM67.cjs');

// src/react/QrBuilder.tsx







var _react = require('react');

// src/react/logoFile.ts
var LOGO_UPLOAD_MAX_BYTES = 1e6;
var LOGO_MAX_EDGE = 256;
function readAsDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}
async function downscale(file) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
}
async function readLogoFile(file) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    throw new Error("Choose a png, jpeg, webp or gif image.");
  }
  if (file.size > LOGO_UPLOAD_MAX_BYTES) {
    throw new Error("Image must be smaller than 1 MB.");
  }
  return await _asyncNullishCoalesce(await downscale(file), async () => ( readAsDataUri(file)));
}
var STORED_LOGO = /^(data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+|https:\/\/\S+)$/i;
function loadStoredLogos(storageKey, max) {
  try {
    const parsed = JSON.parse(_nullishCoalesce(window.localStorage.getItem(storageKey), () => ( "[]")));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item) => typeof item === "string" && STORED_LOGO.test(item)))].slice(0, max);
  } catch (e2) {
    return [];
  }
}
function saveStoredLogos(storageKey, logos) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(logos));
    return true;
  } catch (e3) {
    return false;
  }
}

// src/react/QrContextMenu.tsx

var _reactdom = require('react-dom');
var _jsxruntime = require('react/jsx-runtime');
var VIEWPORT_MARGIN = 8;
function QrContextMenu({ x, y, label, items, onClose, focusFirst = false }) {
  const menu = _react.useRef.call(void 0, null);
  const [position, setPosition] = _react.useState.call(void 0, { left: x, top: y });
  _react.useLayoutEffect.call(void 0, () => {
    const box = _optionalChain([menu, 'access', _ => _.current, 'optionalAccess', _2 => _2.getBoundingClientRect, 'call', _3 => _3()]);
    if (!box) return;
    setPosition({
      left: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - box.width - VIEWPORT_MARGIN)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - box.height - VIEWPORT_MARGIN))
    });
  }, [x, y]);
  _react.useEffect.call(void 0, () => {
    if (focusFirst) _optionalChain([menu, 'access', _4 => _4.current, 'optionalAccess', _5 => _5.querySelector, 'call', _6 => _6("button:not(:disabled)"), 'optionalAccess', _7 => _7.focus, 'call', _8 => _8()]);
    else _optionalChain([menu, 'access', _9 => _9.current, 'optionalAccess', _10 => _10.focus, 'call', _11 => _11({ preventScroll: true })]);
    const close = (event) => {
      if (event.target instanceof Node && _optionalChain([menu, 'access', _12 => _12.current, 'optionalAccess', _13 => _13.contains, 'call', _14 => _14(event.target)])) return;
      if (event.target instanceof Element && event.target.closest("[data-pga-qr-menu-trigger]")) return;
      onClose();
    };
    const dismiss = () => onClose();
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("contextmenu", close, true);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("contextmenu", close, true);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
    };
  }, [onClose, focusFirst]);
  const onKeyDown = (event) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [..._nullishCoalesce(_optionalChain([menu, 'access', _15 => _15.current, 'optionalAccess', _16 => _16.querySelectorAll, 'call', _17 => _17("button:not(:disabled)")]), () => ( []))];
    const index = buttons.indexOf(document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const target = index < 0 ? step === 1 ? 0 : buttons.length - 1 : (index + step + buttons.length) % buttons.length;
    _optionalChain([buttons, 'access', _18 => _18[target], 'optionalAccess', _19 => _19.focus, 'call', _20 => _20()]);
  };
  return _reactdom.createPortal.call(void 0, 
    /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
      "div",
      {
        ref: menu,
        role: "menu",
        tabIndex: -1,
        "aria-label": label,
        className: "pga-qr-menu",
        style: { left: position.left, top: position.top },
        onKeyDown,
        children: items.map((item) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
          "button",
          {
            type: "button",
            role: "menuitem",
            className: "pga-qr-menu-item",
            disabled: item.disabled,
            onClick: () => {
              onClose();
              item.onSelect();
            },
            children: item.label
          },
          item.label
        ))
      }
    ),
    document.body
  );
}

// src/react/useQrSvg.ts

var EMPTY = { payload: null, svg: null, error: null, field: null };
function renderQrState(content, appearance) {
  if (!content) return EMPTY;
  const encoded = _chunkWVCFQM67cjs.encodeQrContent.call(void 0, content);
  if (!encoded.ok) {
    return { ...EMPTY, error: encoded.error, field: _nullishCoalesce(encoded.field, () => ( null)) };
  }
  try {
    return { payload: encoded.value, svg: _chunkWVCFQM67cjs.renderQrSvg.call(void 0, encoded.value, appearance), error: null, field: null };
  } catch (error) {
    if (error instanceof _chunkWVCFQM67cjs.QrRenderError) {
      return { ...EMPTY, error: error.message, field: _nullishCoalesce(error.field, () => ( null)) };
    }
    throw error;
  }
}
function useQrSvg(content, appearance) {
  const key = JSON.stringify([content, appearance]);
  return _react.useMemo.call(void 0, () => renderQrState(content, appearance), [key]);
}

// src/react/QrCode.tsx

function QrCode({ content, appearance = {}, fallback = null, className, style }) {
  const { svg, error } = useQrSvg(content, appearance);
  if (!svg) {
    return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _jsxruntime.Fragment, { children: typeof fallback === "function" ? fallback(_nullishCoalesce(error, () => ( ""))) : fallback });
  }
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
    "div",
    {
      className: ["pga-qr-code", className].filter(Boolean).join(" "),
      style,
      dangerouslySetInnerHTML: { __html: svg }
    }
  );
}

// src/react/useQrBuilder.ts

var QR_STYLES = [
  { id: "fluid", label: "Fluid", dotStyle: "fluid", cornerStyle: "fluid" },
  { id: "classic", label: "Classic", dotStyle: "square", cornerStyle: "square" }
];
var QR_COLORS = [
  { id: "navy", label: "Navy", value: _chunkWVCFQM67cjs.PGA_NAVY, swatch: _chunkWVCFQM67cjs.PGA_NAVY },
  { id: "black", label: "Black", value: "#000000", swatch: "#000000" },
  { id: "greyscale", label: "Greyscale", value: "#000000", swatch: "linear-gradient(135deg, #000000 50%, #9a9a9a 50%)", grayscale: true }
];
var DEFAULT_STORAGE_KEY = "pgahq:qr-codes:custom-logos";
var MAX_CUSTOM_LOGOS = 5;
var DEFAULT_LOGO_PRESETS = [
  { label: _chunkWVCFQM67cjs.PGA_LOGOS.blue.label, src: _chunkWVCFQM67cjs.PGA_LOGOS.blue.src },
  { label: _chunkWVCFQM67cjs.PGA_LOGOS.circle.label, src: _chunkWVCFQM67cjs.PGA_LOGOS.circle.src }
];
var COPY_FEEDBACK_MS = 2500;
function useQrBuilder(options = {}) {
  const {
    defaultTab = "url",
    defaultUrl = "",
    defaultStyle = "fluid",
    defaultColor = "navy",
    storageKey = DEFAULT_STORAGE_KEY,
    appearance: baseAppearance,
    logoPresets = DEFAULT_LOGO_PRESETS,
    filename = "PGA-qr-code",
    onEvent
  } = options;
  const [tab, setTabState] = _react.useState.call(void 0, defaultTab);
  const [url, setUrl] = _react.useState.call(void 0, defaultUrl);
  const [wifi, setWifi] = _react.useState.call(void 0, { ssid: "", password: "", security: "WPA", hidden: false });
  const [sms, setSms] = _react.useState.call(void 0, { phone: "", message: "" });
  const [captionOverride, setCaptionOverride] = _react.useState.call(void 0, null);
  const [styleId, setStyleId] = _react.useState.call(void 0, defaultStyle);
  const [colorId, setColorId] = _react.useState.call(void 0, defaultColor);
  const [customLogos, setCustomLogos] = _react.useState.call(void 0, []);
  const [logo, setLogoState] = _react.useState.call(void 0, 
    options.defaultLogo === void 0 ? _nullishCoalesce(_optionalChain([logoPresets, 'access', _21 => _21[0], 'optionalAccess', _22 => _22.src]), () => ( null)) : options.defaultLogo
  );
  const [logoEnabled, setLogoEnabled] = _react.useState.call(void 0, true);
  const [copyStatus, setCopyStatus] = _react.useState.call(void 0, "idle");
  const [linkStatus, setLinkStatus] = _react.useState.call(void 0, "idle");
  const [downloadStatus, setDownloadStatus] = _react.useState.call(void 0, "idle");
  const [actionError, setActionError] = _react.useState.call(void 0, null);
  const started = _react.useRef.call(void 0, false);
  const onEventRef = _react.useRef.call(void 0, onEvent);
  onEventRef.current = onEvent;
  const copyTimer = _react.useRef.call(void 0, void 0);
  _react.useEffect.call(void 0, () => () => clearTimeout(copyTimer.current), []);
  const emit = _react.useCallback.call(void 0, (event, currentTab) => {
    _optionalChain([onEventRef, 'access', _23 => _23.current, 'optionalCall', _24 => _24({ ...event, tab: currentTab })]);
  }, []);
  const markStarted = _react.useCallback.call(void 0, 
    (currentTab) => {
      if (started.current) return;
      started.current = true;
      emit({ type: "start" }, currentTab);
    },
    [emit]
  );
  const content = _react.useMemo.call(void 0, () => {
    switch (tab) {
      case "url":
        return { type: "url", url };
      case "wifi":
        return { type: "wifi", ...wifi };
      case "sms":
        return { type: "sms", ...sms };
    }
  }, [tab, url, wifi, sms]);
  const caption = _nullishCoalesce(captionOverride, () => ( _chunkWVCFQM67cjs.suggestCaption.call(void 0, content)));
  const look = _nullishCoalesce(QR_STYLES.find((style) => style.id === styleId), () => ( QR_STYLES[0]));
  const color = _nullishCoalesce(QR_COLORS.find((item) => item.id === colorId), () => ( QR_COLORS[0]));
  const appearance = _react.useMemo.call(void 0, 
    () => ({
      ...baseAppearance,
      foreground: color.value,
      cornerSquareColor: void 0,
      cornerDotColor: void 0,
      dotStyle: look.dotStyle,
      cornerStyle: look.cornerStyle,
      caption: caption.trim() || void 0,
      logo: logoEnabled && logo ? { src: logo, grayscale: color.grayscale } : void 0
    }),
    [baseAppearance, caption, color, look, logo, logoEnabled]
  );
  const qr = _react.useMemo.call(void 0, () => renderQrState(content, appearance), [content, appearance]);
  const setTab = _react.useCallback.call(void 0, 
    (next) => {
      setTabState(next);
      markStarted(next);
    },
    [markStarted]
  );
  const track = _react.useCallback.call(void 0, 
    (setter) => (...args) => {
      markStarted(tab);
      setter(...args);
    },
    [markStarted, tab]
  );
  const setLogo = _react.useCallback.call(void 0, (src) => {
    setLogoState(src);
    setLogoEnabled(true);
  }, []);
  const customLogosRef = _react.useRef.call(void 0, []);
  const [storageWarning, setStorageWarning] = _react.useState.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    if (!storageKey) return;
    const stored = loadStoredLogos(storageKey, MAX_CUSTOM_LOGOS);
    customLogosRef.current = stored;
    setCustomLogos(stored);
  }, [storageKey]);
  const commitCustomLogos = _react.useCallback.call(void 0, 
    (next) => {
      customLogosRef.current = next;
      setCustomLogos(next);
      if (storageKey) setStorageWarning(!saveStoredLogos(storageKey, next));
    },
    [storageKey]
  );
  const addCustomLogo = _react.useCallback.call(void 0, 
    (src) => {
      const current = customLogosRef.current;
      if (!current.includes(src)) {
        if (current.length >= MAX_CUSTOM_LOGOS) return;
        commitCustomLogos([...current, src]);
      }
      setLogo(src);
    },
    [commitCustomLogos, setLogo]
  );
  const removeCustomLogo = _react.useCallback.call(void 0, 
    (src) => {
      commitCustomLogos(customLogosRef.current.filter((item) => item !== src));
      setLogoState((selected) => selected === src ? _nullishCoalesce(_optionalChain([logoPresets, 'access', _25 => _25[0], 'optionalAccess', _26 => _26.src]), () => ( null)) : selected);
    },
    [commitCustomLogos, logoPresets]
  );
  const download = _react.useCallback.call(void 0, 
    async (format = "png") => {
      if (!qr.payload) return;
      setDownloadStatus("working");
      setActionError(null);
      try {
        await _chunkLE7SSCJJcjs.downloadQr.call(void 0, qr.payload, appearance, { filename: caption.trim() || filename, format });
        setDownloadStatus("done");
        emit(
          { type: "download", format, hasLogo: !!appearance.logo, hasCaption: !!appearance.caption, style: styleId, color: colorId },
          tab
        );
      } catch (error) {
        setDownloadStatus("error");
        setActionError(error instanceof Error ? error.message : "Download failed.");
      }
    },
    [appearance, caption, colorId, emit, filename, qr.payload, styleId, tab]
  );
  const copy = _react.useCallback.call(void 0, 
    async (format = "png") => {
      if (!qr.payload) return;
      setCopyStatus("working");
      setActionError(null);
      try {
        await (format === "svg" ? _chunkLE7SSCJJcjs.copyQrSvgToClipboard : (0, _chunkLE7SSCJJcjs.copyQrToClipboard))(qr.payload, appearance);
        setCopyStatus("done");
        emit({ type: "copy", format, hasLogo: !!appearance.logo, hasCaption: !!appearance.caption, style: styleId, color: colorId }, tab);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopyStatus("idle"), COPY_FEEDBACK_MS);
      } catch (error) {
        setCopyStatus("error");
        setActionError(error instanceof Error ? error.message : "Copy failed.");
      }
    },
    [appearance, colorId, emit, qr.payload, styleId, tab]
  );
  const linkTimer = _react.useRef.call(void 0, void 0);
  _react.useEffect.call(void 0, () => () => clearTimeout(linkTimer.current), []);
  const copyLink = _react.useCallback.call(void 0, 
    async (text) => {
      try {
        await _chunkLE7SSCJJcjs.copyTextToClipboard.call(void 0, text);
        setLinkStatus("done");
        emit({ type: "copy-link" }, tab);
        clearTimeout(linkTimer.current);
        linkTimer.current = setTimeout(() => setLinkStatus("idle"), COPY_FEEDBACK_MS);
      } catch (e4) {
        setLinkStatus("error");
      }
    },
    [emit, tab]
  );
  _react.useEffect.call(void 0, () => {
    clearTimeout(copyTimer.current);
    setCopyStatus("idle");
    setDownloadStatus("idle");
    setActionError(null);
  }, [qr.svg]);
  const [copySupported, setCopySupported] = _react.useState.call(void 0, false);
  _react.useEffect.call(void 0, () => setCopySupported(_chunkLE7SSCJJcjs.canCopyQr.call(void 0, )), []);
  return {
    tab,
    setTab,
    url,
    setUrl: track(setUrl),
    wifi,
    setWifi: track(setWifi),
    sms,
    setSms: track(setSms),
    caption,
    setCaption: track(setCaptionOverride),
    logo,
    logoEnabled,
    setLogo: track(setLogo),
    setLogoEnabled: track(setLogoEnabled),
    styleId,
    setStyleId: track(setStyleId),
    colorId,
    setColorId: track(setColorId),
    logoPresets,
    customLogos,
    maxCustomLogos: MAX_CUSTOM_LOGOS,
    addCustomLogo: track(addCustomLogo),
    removeCustomLogo,
    storageWarning,
    content,
    appearance,
    qr,
    download,
    copy,
    copyStatus,
    linkStatus,
    copyLink,
    downloadStatus,
    copySupported,
    actionError
  };
}

// src/react/QrBuilder.tsx

var TABS = [
  { id: "url", label: "Open webpage" },
  { id: "wifi", label: "Join Wi-Fi" },
  { id: "sms", label: "Send a text" }
];
var TAB_BLURB = {
  url: "Scan the QR code to open your URL without typing.",
  wifi: "Scan the QR code to connect to your Wi-Fi network.",
  sms: "Scan the QR code to draft a text message you specify."
};
function Field({
  label,
  required,
  error,
  hint,
  id,
  children
}) {
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-field", children: [
    /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "label", { htmlFor: id, className: "pga-qr-label", children: [
      label,
      required && /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "span", { className: "pga-qr-required", "aria-hidden": "true", children: [
        " ",
        "*"
      ] })
    ] }),
    children,
    error ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "p", { className: "pga-qr-error", id: `${id}-msg`, role: "alert", children: error }) : hint ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "p", { className: "pga-qr-hint", id: `${id}-msg`, children: hint }) : null
  ] });
}
function Tabs({ state, idPrefix }) {
  const onKeyDown = (event) => {
    const index = TABS.findIndex((t) => t.id === state.tab);
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : -1;
    if (next < 0) return;
    event.preventDefault();
    state.setTab(TABS[next].id);
    _optionalChain([document, 'access', _27 => _27.getElementById, 'call', _28 => _28(`${idPrefix}-tab-${TABS[next].id}`), 'optionalAccess', _29 => _29.focus, 'call', _30 => _30()]);
  };
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "div", { role: "tablist", "aria-label": "QR code type", className: "pga-qr-tabs", children: TABS.map((tab) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
    "button",
    {
      type: "button",
      role: "tab",
      id: `${idPrefix}-tab-${tab.id}`,
      "aria-selected": state.tab === tab.id,
      "aria-controls": `${idPrefix}-panel`,
      tabIndex: state.tab === tab.id ? 0 : -1,
      className: "pga-qr-tab",
      onClick: () => state.setTab(tab.id),
      onKeyDown,
      children: tab.label
    },
    tab.id
  )) });
}
function CopyIcon() {
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "18",
      height: "18",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "rect", { x: "9", y: "9", width: "11", height: "11", rx: "2" }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", { d: "M5 15V6a2 2 0 0 1 2-2h9" })
      ]
    }
  );
}
function CheckIcon() {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "18",
      height: "18",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", { d: "M5 12.5l4.5 4.5L19 7.5" })
    }
  );
}
function DiskIcon() {
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "18",
      height: "18",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", { d: "M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", { d: "M7 3v5h8V3" }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "rect", { x: "7", y: "13", width: "10", height: "8", rx: "1" })
      ]
    }
  );
}
function FieldRow({ children }) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "div", { className: "pga-qr-row", children });
}
function ContentFields({ state, idPrefix, captionField }) {
  const { tab, qr } = state;
  const [touched, setTouched] = _react.useState.call(void 0, {});
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const errorFor = (field) => qr.error && qr.field === field && (field === "message" || touched[field]) ? qr.error : null;
  if (tab === "url") {
    return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, FieldRow, { children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-url`, label: "URL", required: true, error: errorFor("url"), children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
        "input",
        {
          id: `${idPrefix}-url`,
          className: "pga-qr-input",
          type: "url",
          inputMode: "url",
          autoComplete: "off",
          placeholder: "https://pga.com",
          value: state.url,
          "aria-describedby": `${idPrefix}-url-msg`,
          onChange: (event) => state.setUrl(event.target.value),
          onBlur: () => touch("url")
        }
      ) }),
      captionField
    ] });
  }
  if (tab === "wifi") {
    const { wifi } = state;
    return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [
      /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, FieldRow, { children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-ssid`, label: "Network name", required: true, error: errorFor("ssid"), children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
          "input",
          {
            id: `${idPrefix}-ssid`,
            className: "pga-qr-input",
            type: "text",
            autoComplete: "off",
            value: wifi.ssid,
            "aria-describedby": `${idPrefix}-ssid-msg`,
            onChange: (event) => state.setWifi({ ...wifi, ssid: event.target.value }),
            onBlur: () => touch("ssid")
          }
        ) }),
        captionField
      ] }),
      /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, FieldRow, { children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-security`, label: "Network type", required: true, children: /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
          "select",
          {
            id: `${idPrefix}-security`,
            className: "pga-qr-input",
            value: wifi.security,
            onChange: (event) => state.setWifi({ ...wifi, security: event.target.value }),
            children: [
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "option", { value: "WEP", children: "WEP" }),
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "option", { value: "WPA", children: "WPA/WPA2" }),
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "option", { value: "nopass", children: "No encryption" })
            ]
          }
        ) }),
        wifi.security !== "nopass" && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-password`, label: "Password", required: true, error: errorFor("password"), children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
          "input",
          {
            id: `${idPrefix}-password`,
            className: "pga-qr-input",
            type: "text",
            autoComplete: "off",
            value: wifi.password,
            "aria-describedby": `${idPrefix}-password-msg`,
            onChange: (event) => state.setWifi({ ...wifi, password: event.target.value }),
            onBlur: () => touch("password")
          }
        ) })
      ] }),
      /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "label", { className: "pga-qr-check", children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "input", { type: "checkbox", checked: wifi.hidden, onChange: (event) => state.setWifi({ ...wifi, hidden: event.target.checked }) }),
        "Hidden network"
      ] })
    ] });
  }
  const { sms } = state;
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [
    /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, FieldRow, { children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-phone`, label: "Your phone number", required: true, error: errorFor("phone"), children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
        "input",
        {
          id: `${idPrefix}-phone`,
          className: "pga-qr-input",
          type: "tel",
          autoComplete: "off",
          placeholder: "(800) 555-1212",
          value: sms.phone,
          "aria-describedby": `${idPrefix}-phone-msg`,
          onChange: (event) => state.setSms({ ...sms, phone: event.target.value }),
          onBlur: () => touch("phone")
        }
      ) }),
      captionField
    ] }),
    /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-message`, label: "Custom message", error: errorFor("message"), children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
      "textarea",
      {
        id: `${idPrefix}-message`,
        className: "pga-qr-input pga-qr-textarea",
        rows: 2,
        placeholder: "Your SMS text",
        maxLength: _chunkWVCFQM67cjs.SMS_MESSAGE_MAX_LENGTH,
        value: sms.message,
        "aria-describedby": `${idPrefix}-message-msg`,
        onChange: (event) => state.setSms({ ...sms, message: event.target.value })
      }
    ) })
  ] });
}
function NoLogoIcon() {
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "22",
      height: "22",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "circle", { cx: "12", cy: "12", r: "8" }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", { d: "M6.5 17.5l11-11" })
      ]
    }
  );
}
function LogoPicker({
  state,
  allowUpload,
  onUploadLogo
}) {
  const fileInput = _react.useRef.call(void 0, null);
  const [uploadError, setUploadError] = _react.useState.call(void 0, null);
  const [uploading, setUploading] = _react.useState.call(void 0, false);
  const { logo, logoEnabled, logoPresets, customLogos, maxCustomLogos } = state;
  const atLimit = customLogos.length >= maxCustomLogos;
  const known = [...logoPresets.map((preset) => preset.src), ...customLogos];
  const otherLogo = logo && !known.includes(logo) ? logo : null;
  const noLogo = !logoEnabled || !logo;
  const addFile = async (file) => {
    setUploadError(null);
    setUploading(true);
    try {
      state.addCustomLogo(await (_nullishCoalesce(onUploadLogo, () => ( readLogoFile)))(file));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const onFile = async (event) => {
    const file = _optionalChain([event, 'access', _31 => _31.target, 'access', _32 => _32.files, 'optionalAccess', _33 => _33[0]]);
    event.target.value = "";
    if (file) await addFile(file);
  };
  const pasteHandler = _react.useRef.call(void 0, () => {
  });
  pasteHandler.current = (event) => {
    const file = Array.from(_nullishCoalesce(_optionalChain([event, 'access', _34 => _34.clipboardData, 'optionalAccess', _35 => _35.files]), () => ( []))).find((item) => item.type.startsWith("image/"));
    if (!file || uploading) return;
    const target = event.target;
    const editable = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName));
    if (editable && _optionalChain([event, 'access', _36 => _36.clipboardData, 'optionalAccess', _37 => _37.getData, 'call', _38 => _38("text/plain")])) return;
    event.preventDefault();
    if (atLimit) setUploadError(`You can keep ${maxCustomLogos} uploaded logos. Remove one to add another.`);
    else void addFile(file);
  };
  _react.useEffect.call(void 0, () => {
    if (!allowUpload) return;
    const listener = (event) => pasteHandler.current(event);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, [allowUpload]);
  const option = (src, label, removable) => /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-logo-item", children: [
    /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
      "button",
      {
        type: "button",
        role: "radio",
        "aria-checked": !noLogo && logo === src,
        "aria-label": label,
        className: "pga-qr-logo-option",
        onClick: () => state.setLogo(src),
        children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "img", { src, alt: "", width: 38, height: 38 })
      }
    ),
    removable && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
      "button",
      {
        type: "button",
        className: "pga-qr-logo-remove",
        "aria-label": `Remove ${label.toLowerCase()}`,
        onClick: () => state.removeCustomLogo(src),
        children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { "aria-hidden": "true", children: "\xD7" })
      }
    )
  ] }, src);
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "fieldset", { className: "pga-qr-fieldset", children: [
    /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "legend", { className: "pga-qr-legend", children: "Logo" }),
    /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-logos", role: "radiogroup", "aria-label": "Logo", children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "div", { className: "pga-qr-logo-item", children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": noLogo,
          "aria-label": "No logo",
          title: "No logo",
          className: "pga-qr-logo-option",
          onClick: () => state.setLogoEnabled(false),
          children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, NoLogoIcon, {})
        }
      ) }),
      logoPresets.map((preset) => option(preset.src, preset.label, false)),
      customLogos.map((src, index) => option(src, `Uploaded logo ${index + 1}`, true)),
      otherLogo && option(otherLogo, "Custom logo", false),
      allowUpload && /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-logo-item", children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "input", { ref: fileInput, type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true, onChange: onFile }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
          "button",
          {
            type: "button",
            className: "pga-qr-logo-option pga-qr-logo-add",
            "aria-label": "Upload a custom image",
            title: atLimit ? `You can keep ${maxCustomLogos} uploaded logos. Remove one to add another.` : "Upload a custom image, or paste one",
            disabled: uploading || atLimit,
            onClick: () => _optionalChain([fileInput, 'access', _39 => _39.current, 'optionalAccess', _40 => _40.click, 'call', _41 => _41()]),
            children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { "aria-hidden": "true", children: uploading ? "\u2026" : "+" })
          }
        )
      ] })
    ] }),
    uploadError && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "p", { className: "pga-qr-error", role: "alert", children: uploadError }),
    state.storageWarning && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "p", { className: "pga-qr-hint", children: "Your uploaded logos could not be saved for next time (browser storage is unavailable)." })
  ] });
}
var PREVIEW_SAMPLE = "https://pga.com";
var toDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
function previewFor(payload, style, foreground) {
  const appearance = { size: 64, margin: 0, foreground, dotStyle: style.dotStyle, cornerStyle: style.cornerStyle };
  try {
    return toDataUri(_chunkWVCFQM67cjs.renderQrSvg.call(void 0, payload, appearance));
  } catch (e5) {
    return toDataUri(_chunkWVCFQM67cjs.renderQrSvg.call(void 0, PREVIEW_SAMPLE, appearance));
  }
}
function StylePicker({ state, showStyles, showColors }) {
  const color = _nullishCoalesce(_optionalChain([QR_COLORS, 'access', _42 => _42.find, 'call', _43 => _43((item) => item.id === state.colorId), 'optionalAccess', _44 => _44.value]), () => ( QR_COLORS[0].value));
  const payload = _nullishCoalesce(state.qr.payload, () => ( PREVIEW_SAMPLE));
  const previews = _react.useMemo.call(void 0, () => QR_STYLES.map((style) => previewFor(payload, style, color)), [payload, color]);
  if (!showStyles && !showColors) return null;
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-appearance", children: [
    showStyles && /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "fieldset", { className: "pga-qr-fieldset", children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "legend", { className: "pga-qr-legend", children: "Style" }),
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "div", { className: "pga-qr-logos", role: "radiogroup", "aria-label": "Style", children: QR_STYLES.map((style, index) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": state.styleId === style.id,
          "aria-label": style.label,
          title: style.label,
          className: "pga-qr-logo-option pga-qr-style-option",
          onClick: () => state.setStyleId(style.id),
          children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "img", { src: previews[index], alt: "", width: 40, height: 40 })
        },
        style.id
      )) })
    ] }),
    showColors && /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "fieldset", { className: "pga-qr-fieldset", children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "legend", { className: "pga-qr-legend", children: "Color" }),
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "div", { className: "pga-qr-logos", role: "radiogroup", "aria-label": "Color", children: QR_COLORS.map((item) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": state.colorId === item.id,
          "aria-label": item.label,
          title: item.label,
          className: "pga-qr-logo-option",
          onClick: () => state.setColorId(item.id),
          children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { className: "pga-qr-swatch", style: { background: item.swatch }, "aria-hidden": "true" })
        },
        item.id
      )) })
    ] })
  ] });
}
function QrBuilder({
  className,
  onUploadLogo,
  allowLogoUpload = true,
  autoFocus = false,
  allowStyleChoice = true,
  allowColorChoice = true,
  placeholder,
  link,
  linkLabel = "Link",
  ...options
}) {
  const idPrefix = _react.useId.call(void 0, );
  const state = useQrBuilder(options);
  const ready = !!state.qr.svg;
  const linkUrl = typeof link === "function" ? link(state) : link;
  const [menu, setMenu] = _react.useState.call(void 0, null);
  const [copiedUrl, setCopiedUrl] = _react.useState.call(void 0, null);
  const closeMenu = _react.useCallback.call(void 0, () => setMenu(null), []);
  const panel = _react.useRef.call(void 0, null);
  _react.useEffect.call(void 0, () => {
    if (autoFocus) _optionalChain([panel, 'access', _45 => _45.current, 'optionalAccess', _46 => _46.querySelector, 'call', _47 => _47('input:not([type="checkbox"]), textarea'), 'optionalAccess', _48 => _48.focus, 'call', _49 => _49({ preventScroll: true })]);
  }, [autoFocus]);
  const pngCopyLabel = state.copySupported ? "PNG" : "PNG (not supported here)";
  const toggleFormatMenu = (event, kind) => {
    if (_optionalChain([menu, 'optionalAccess', _50 => _50.kind]) === kind) return setMenu(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const run = kind === "download" ? state.download : state.copy;
    setMenu({
      kind,
      x: rect.left,
      y: rect.bottom + 4,
      label: kind === "download" ? "Download image as" : "Copy image as",
      focusFirst: event.detail === 0,
      items: [
        { label: "SVG", onSelect: () => run("svg") },
        { label: kind === "copy" ? pngCopyLabel : "PNG", onSelect: () => run("png"), disabled: kind === "copy" && !state.copySupported }
      ]
    });
  };
  const onStageContextMenu = (event) => {
    if (!ready) return;
    event.preventDefault();
    setMenu({
      kind: "context",
      x: event.clientX,
      y: event.clientY,
      label: "QR code actions",
      focusFirst: false,
      items: [
        { label: "Copy PNG", onSelect: () => state.copy("png"), disabled: !state.copySupported },
        { label: "Copy SVG", onSelect: () => state.copy("svg") },
        { label: "Download PNG", onSelect: () => state.download("png") },
        { label: "Download SVG", onSelect: () => state.download("svg") }
      ]
    });
  };
  const linkCopied = state.linkStatus === "done" && copiedUrl === linkUrl;
  const copyLink = async () => {
    if (!linkUrl) return;
    setCopiedUrl(linkUrl);
    await state.copyLink(linkUrl);
  };
  const disabledHint = "Enter a valid value to enable";
  const copyBusy = state.copyStatus === "working";
  const announcement = state.copyStatus === "done" ? "Image copied" : linkCopied ? `${linkLabel} copied` : "";
  const captionField = /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Field, { id: `${idPrefix}-caption`, label: "Caption", children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, 
    "input",
    {
      id: `${idPrefix}-caption`,
      className: "pga-qr-input",
      type: "text",
      maxLength: _chunkWVCFQM67cjs.CAPTION_MAX_LENGTH,
      placeholder: state.tab === "url" ? "pga.com" : "Shown below the code",
      value: state.caption,
      onChange: (event) => state.setCaption(event.target.value)
    }
  ) });
  return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: ["pga-qr-builder", className].filter(Boolean).join(" "), children: [
    /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-settings", children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, Tabs, { state, idPrefix }),
      /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { ref: panel, role: "tabpanel", id: `${idPrefix}-panel`, "aria-labelledby": `${idPrefix}-tab-${state.tab}`, className: "pga-qr-panel", children: [
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "p", { className: "pga-qr-blurb", children: TAB_BLURB[state.tab] }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, ContentFields, { state, idPrefix, captionField }, state.tab)
      ] }),
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, LogoPicker, { state, allowUpload: allowLogoUpload, onUploadLogo }),
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, StylePicker, { state, showStyles: allowStyleChoice, showColors: allowColorChoice })
    ] }),
    /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-preview", children: [
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "div", { className: "pga-qr-stage", "aria-live": "polite", onContextMenu: onStageContextMenu, children: ready ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, QrCode, { content: state.content, appearance: state.appearance }) : _nullishCoalesce(placeholder, () => ( /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-placeholder", children: [
        state.logoPresets[0] && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "img", { src: state.logoPresets[0].src, alt: "" }),
        /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { children: "Your QR code will appear here" })
      ] }))) }),
      /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "div", { className: "pga-qr-actions", children: [
        /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
          "button",
          {
            type: "button",
            className: "pga-qr-button pga-qr-button-secondary pga-qr-action",
            "aria-label": "Download image",
            "aria-haspopup": "menu",
            "aria-expanded": _optionalChain([menu, 'optionalAccess', _51 => _51.kind]) === "download",
            "data-pga-qr-menu-trigger": "",
            title: ready ? void 0 : disabledHint,
            disabled: !ready || state.downloadStatus === "working",
            onClick: (event) => toggleFormatMenu(event, "download"),
            children: [
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, DiskIcon, {}),
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { "aria-hidden": "true", children: state.downloadStatus === "working" ? "Preparing\u2026" : "Image" })
            ]
          }
        ),
        /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
          "button",
          {
            type: "button",
            className: "pga-qr-button pga-qr-button-secondary pga-qr-action",
            "aria-label": "Copy image",
            "aria-haspopup": "menu",
            "aria-expanded": _optionalChain([menu, 'optionalAccess', _52 => _52.kind]) === "copy",
            "data-pga-qr-menu-trigger": "",
            title: ready ? void 0 : disabledHint,
            disabled: !ready || copyBusy,
            onClick: (event) => toggleFormatMenu(event, "copy"),
            children: [
              state.copyStatus === "done" ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, CheckIcon, {}) : /* @__PURE__ */ _jsxruntime.jsx.call(void 0, CopyIcon, {}),
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { "aria-hidden": "true", children: state.copyStatus === "done" ? "Copied!" : "Image" })
            ]
          }
        ),
        link !== void 0 && /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, 
          "button",
          {
            type: "button",
            className: "pga-qr-button pga-qr-button-secondary pga-qr-action",
            "aria-label": `Copy ${linkLabel.toLowerCase()}`,
            title: _nullishCoalesce(linkUrl, () => ( disabledHint)),
            disabled: !linkUrl,
            onClick: copyLink,
            children: [
              linkCopied ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, CheckIcon, {}) : /* @__PURE__ */ _jsxruntime.jsx.call(void 0, CopyIcon, {}),
              /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { "aria-hidden": "true", children: linkCopied ? "Copied!" : linkLabel })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", { className: "pga-qr-sr-only", role: "status", children: announcement }),
      state.actionError && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "p", { className: "pga-qr-error", role: "alert", children: state.actionError })
    ] }),
    menu && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, QrContextMenu, { x: menu.x, y: menu.y, label: menu.label, items: menu.items, focusFirst: menu.focusFirst, onClose: closeMenu })
  ] });
}











exports.DEFAULT_LOGO_PRESETS = DEFAULT_LOGO_PRESETS; exports.DEFAULT_STORAGE_KEY = DEFAULT_STORAGE_KEY; exports.MAX_CUSTOM_LOGOS = MAX_CUSTOM_LOGOS; exports.QR_COLORS = QR_COLORS; exports.QR_STYLES = QR_STYLES; exports.QrBuilder = QrBuilder; exports.QrCode = QrCode; exports.renderQrState = renderQrState; exports.useQrBuilder = useQrBuilder; exports.useQrSvg = useQrSvg;
//# sourceMappingURL=react.cjs.map