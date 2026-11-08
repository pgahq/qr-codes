"use client";
import {
  canCopyQr,
  copyQrSvgToClipboard,
  copyQrToClipboard,
  copyTextToClipboard,
  downloadQr
} from "./chunk-WRGYS54F.js";
import {
  CAPTION_MAX_LENGTH,
  PGA_LOGOS,
  PGA_NAVY,
  QrRenderError,
  SMS_MESSAGE_MAX_LENGTH,
  encodeQrContent,
  renderQrSvg,
  suggestCaption
} from "./chunk-K7QXANCL.js";

// src/react/QrBuilder.tsx
import {
  useCallback as useCallback2,
  useEffect as useEffect3,
  useId,
  useMemo as useMemo3,
  useRef as useRef3,
  useState as useState3
} from "react";

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
  } catch {
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
  return await downscale(file) ?? readAsDataUri(file);
}
var STORED_LOGO = /^(data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+|https:\/\/\S+)$/i;
function loadStoredLogos(storageKey, max) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item) => typeof item === "string" && STORED_LOGO.test(item)))].slice(0, max);
  } catch {
    return [];
  }
}
function saveStoredLogos(storageKey, logos) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(logos));
    return true;
  } catch {
    return false;
  }
}

// src/react/QrContextMenu.tsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jsx } from "react/jsx-runtime";
var VIEWPORT_MARGIN = 8;
function QrContextMenu({ x, y, label, items, onClose, focusFirst = false }) {
  const menu = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect();
    if (!box) return;
    setPosition({
      left: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - box.width - VIEWPORT_MARGIN)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - box.height - VIEWPORT_MARGIN))
    });
  }, [x, y]);
  useEffect(() => {
    if (focusFirst) menu.current?.querySelector("button:not(:disabled)")?.focus();
    else menu.current?.focus({ preventScroll: true });
    const close = (event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
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
    const buttons = [...menu.current?.querySelectorAll("button:not(:disabled)") ?? []];
    const index = buttons.indexOf(document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const target = index < 0 ? step === 1 ? 0 : buttons.length - 1 : (index + step + buttons.length) % buttons.length;
    buttons[target]?.focus();
  };
  return createPortal(
    /* @__PURE__ */ jsx(
      "div",
      {
        ref: menu,
        role: "menu",
        tabIndex: -1,
        "aria-label": label,
        className: "pga-qr-menu",
        style: { left: position.left, top: position.top },
        onKeyDown,
        children: items.map((item) => /* @__PURE__ */ jsx(
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
import { useMemo } from "react";
var EMPTY = { payload: null, svg: null, error: null, field: null };
function renderQrState(content, appearance) {
  if (!content) return EMPTY;
  const encoded = encodeQrContent(content);
  if (!encoded.ok) {
    return { ...EMPTY, error: encoded.error, field: encoded.field ?? null };
  }
  try {
    return { payload: encoded.value, svg: renderQrSvg(encoded.value, appearance), error: null, field: null };
  } catch (error) {
    if (error instanceof QrRenderError) {
      return { ...EMPTY, error: error.message, field: error.field ?? null };
    }
    throw error;
  }
}
function useQrSvg(content, appearance) {
  const key = JSON.stringify([content, appearance]);
  return useMemo(() => renderQrState(content, appearance), [key]);
}

// src/react/QrCode.tsx
import { Fragment, jsx as jsx2 } from "react/jsx-runtime";
function QrCode({ content, appearance = {}, fallback = null, className, style }) {
  const { svg, error } = useQrSvg(content, appearance);
  if (!svg) {
    return /* @__PURE__ */ jsx2(Fragment, { children: typeof fallback === "function" ? fallback(error ?? "") : fallback });
  }
  return /* @__PURE__ */ jsx2(
    "div",
    {
      className: ["pga-qr-code", className].filter(Boolean).join(" "),
      style,
      dangerouslySetInnerHTML: { __html: svg }
    }
  );
}

// src/react/useQrBuilder.ts
import { useCallback, useEffect as useEffect2, useMemo as useMemo2, useRef as useRef2, useState as useState2 } from "react";
var QR_STYLES = [
  { id: "fluid", label: "Fluid", dotStyle: "fluid", cornerStyle: "fluid" },
  { id: "classic", label: "Classic", dotStyle: "square", cornerStyle: "square" }
];
var QR_COLORS = [
  { id: "navy", label: "Navy", value: PGA_NAVY, swatch: PGA_NAVY },
  { id: "black", label: "Black", value: "#000000", swatch: "#000000" },
  { id: "greyscale", label: "Greyscale", value: "#000000", swatch: "linear-gradient(135deg, #000000 50%, #9a9a9a 50%)", grayscale: true }
];
var DEFAULT_STORAGE_KEY = "pgahq:qr-codes:custom-logos";
var MAX_CUSTOM_LOGOS = 5;
var DEFAULT_LOGO_PRESETS = [
  { label: PGA_LOGOS.blue.label, src: PGA_LOGOS.blue.src },
  { label: PGA_LOGOS.circle.label, src: PGA_LOGOS.circle.src }
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
  const [tab, setTabState] = useState2(defaultTab);
  const [url, setUrl] = useState2(defaultUrl);
  const [wifi, setWifi] = useState2({ ssid: "", password: "", security: "WPA", hidden: false });
  const [sms, setSms] = useState2({ phone: "", message: "" });
  const [captionOverride, setCaptionOverride] = useState2(null);
  const [styleId, setStyleId] = useState2(defaultStyle);
  const [colorId, setColorId] = useState2(defaultColor);
  const [customLogos, setCustomLogos] = useState2([]);
  const [logo, setLogoState] = useState2(
    options.defaultLogo === void 0 ? logoPresets[0]?.src ?? null : options.defaultLogo
  );
  const [logoEnabled, setLogoEnabled] = useState2(true);
  const [copyStatus, setCopyStatus] = useState2("idle");
  const [linkStatus, setLinkStatus] = useState2("idle");
  const [downloadStatus, setDownloadStatus] = useState2("idle");
  const [actionError, setActionError] = useState2(null);
  const started = useRef2(false);
  const onEventRef = useRef2(onEvent);
  onEventRef.current = onEvent;
  const copyTimer = useRef2(void 0);
  useEffect2(() => () => clearTimeout(copyTimer.current), []);
  const emit = useCallback((event, currentTab) => {
    onEventRef.current?.({ ...event, tab: currentTab });
  }, []);
  const markStarted = useCallback(
    (currentTab) => {
      if (started.current) return;
      started.current = true;
      emit({ type: "start" }, currentTab);
    },
    [emit]
  );
  const content = useMemo2(() => {
    switch (tab) {
      case "url":
        return { type: "url", url };
      case "wifi":
        return { type: "wifi", ...wifi };
      case "sms":
        return { type: "sms", ...sms };
    }
  }, [tab, url, wifi, sms]);
  const caption = captionOverride ?? suggestCaption(content);
  const look = QR_STYLES.find((style) => style.id === styleId) ?? QR_STYLES[0];
  const color = QR_COLORS.find((item) => item.id === colorId) ?? QR_COLORS[0];
  const appearance = useMemo2(
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
  const qr = useMemo2(() => renderQrState(content, appearance), [content, appearance]);
  const setTab = useCallback(
    (next) => {
      setTabState(next);
      markStarted(next);
    },
    [markStarted]
  );
  const track = useCallback(
    (setter) => (...args) => {
      markStarted(tab);
      setter(...args);
    },
    [markStarted, tab]
  );
  const setLogo = useCallback((src) => {
    setLogoState(src);
    setLogoEnabled(true);
  }, []);
  const customLogosRef = useRef2([]);
  const [storageWarning, setStorageWarning] = useState2(false);
  useEffect2(() => {
    if (!storageKey) return;
    const stored = loadStoredLogos(storageKey, MAX_CUSTOM_LOGOS);
    customLogosRef.current = stored;
    setCustomLogos(stored);
  }, [storageKey]);
  const commitCustomLogos = useCallback(
    (next) => {
      customLogosRef.current = next;
      setCustomLogos(next);
      if (storageKey) setStorageWarning(!saveStoredLogos(storageKey, next));
    },
    [storageKey]
  );
  const addCustomLogo = useCallback(
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
  const removeCustomLogo = useCallback(
    (src) => {
      commitCustomLogos(customLogosRef.current.filter((item) => item !== src));
      setLogoState((selected) => selected === src ? logoPresets[0]?.src ?? null : selected);
    },
    [commitCustomLogos, logoPresets]
  );
  const download = useCallback(
    async (format = "png") => {
      if (!qr.payload) return;
      setDownloadStatus("working");
      setActionError(null);
      try {
        await downloadQr(qr.payload, appearance, { filename: caption.trim() || filename, format });
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
  const copy = useCallback(
    async (format = "png") => {
      if (!qr.payload) return;
      setCopyStatus("working");
      setActionError(null);
      try {
        await (format === "svg" ? copyQrSvgToClipboard : copyQrToClipboard)(qr.payload, appearance);
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
  const linkTimer = useRef2(void 0);
  useEffect2(() => () => clearTimeout(linkTimer.current), []);
  const copyLink = useCallback(
    async (text) => {
      try {
        await copyTextToClipboard(text);
        setLinkStatus("done");
        emit({ type: "copy-link" }, tab);
        clearTimeout(linkTimer.current);
        linkTimer.current = setTimeout(() => setLinkStatus("idle"), COPY_FEEDBACK_MS);
      } catch {
        setLinkStatus("error");
      }
    },
    [emit, tab]
  );
  useEffect2(() => {
    clearTimeout(copyTimer.current);
    setCopyStatus("idle");
    setDownloadStatus("idle");
    setActionError(null);
  }, [qr.svg]);
  const [copySupported, setCopySupported] = useState2(false);
  useEffect2(() => setCopySupported(canCopyQr()), []);
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
import { Fragment as Fragment2, jsx as jsx3, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs("div", { className: "pga-qr-field", children: [
    /* @__PURE__ */ jsxs("label", { htmlFor: id, className: "pga-qr-label", children: [
      label,
      required && /* @__PURE__ */ jsxs("span", { className: "pga-qr-required", "aria-hidden": "true", children: [
        " ",
        "*"
      ] })
    ] }),
    children,
    error ? /* @__PURE__ */ jsx3("p", { className: "pga-qr-error", id: `${id}-msg`, role: "alert", children: error }) : hint ? /* @__PURE__ */ jsx3("p", { className: "pga-qr-hint", id: `${id}-msg`, children: hint }) : null
  ] });
}
function Tabs({ state, idPrefix }) {
  const onKeyDown = (event) => {
    const index = TABS.findIndex((t) => t.id === state.tab);
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : -1;
    if (next < 0) return;
    event.preventDefault();
    state.setTab(TABS[next].id);
    document.getElementById(`${idPrefix}-tab-${TABS[next].id}`)?.focus();
  };
  return /* @__PURE__ */ jsx3("div", { role: "tablist", "aria-label": "QR code type", className: "pga-qr-tabs", children: TABS.map((tab) => /* @__PURE__ */ jsx3(
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
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsx3("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2" }),
        /* @__PURE__ */ jsx3("path", { d: "M5 15V6a2 2 0 0 1 2-2h9" })
      ]
    }
  );
}
function CheckIcon() {
  return /* @__PURE__ */ jsx3(
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
      children: /* @__PURE__ */ jsx3("path", { d: "M5 12.5l4.5 4.5L19 7.5" })
    }
  );
}
function DiskIcon() {
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsx3("path", { d: "M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }),
        /* @__PURE__ */ jsx3("path", { d: "M7 3v5h8V3" }),
        /* @__PURE__ */ jsx3("rect", { x: "7", y: "13", width: "10", height: "8", rx: "1" })
      ]
    }
  );
}
function FieldRow({ children }) {
  return /* @__PURE__ */ jsx3("div", { className: "pga-qr-row", children });
}
function ContentFields({ state, idPrefix, captionField }) {
  const { tab, qr } = state;
  const [touched, setTouched] = useState3({});
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const errorFor = (field) => qr.error && qr.field === field && (field === "message" || touched[field]) ? qr.error : null;
  if (tab === "url") {
    return /* @__PURE__ */ jsxs(FieldRow, { children: [
      /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-url`, label: "URL", required: true, error: errorFor("url"), children: /* @__PURE__ */ jsx3(
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
    return /* @__PURE__ */ jsxs(Fragment2, { children: [
      /* @__PURE__ */ jsxs(FieldRow, { children: [
        /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-ssid`, label: "Network name", required: true, error: errorFor("ssid"), children: /* @__PURE__ */ jsx3(
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
      /* @__PURE__ */ jsxs(FieldRow, { children: [
        /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-security`, label: "Network type", required: true, children: /* @__PURE__ */ jsxs(
          "select",
          {
            id: `${idPrefix}-security`,
            className: "pga-qr-input",
            value: wifi.security,
            onChange: (event) => state.setWifi({ ...wifi, security: event.target.value }),
            children: [
              /* @__PURE__ */ jsx3("option", { value: "WEP", children: "WEP" }),
              /* @__PURE__ */ jsx3("option", { value: "WPA", children: "WPA/WPA2" }),
              /* @__PURE__ */ jsx3("option", { value: "nopass", children: "No encryption" })
            ]
          }
        ) }),
        wifi.security !== "nopass" && /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-password`, label: "Password", required: true, error: errorFor("password"), children: /* @__PURE__ */ jsx3(
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
      /* @__PURE__ */ jsxs("label", { className: "pga-qr-check", children: [
        /* @__PURE__ */ jsx3("input", { type: "checkbox", checked: wifi.hidden, onChange: (event) => state.setWifi({ ...wifi, hidden: event.target.checked }) }),
        "Hidden network"
      ] })
    ] });
  }
  const { sms } = state;
  return /* @__PURE__ */ jsxs(Fragment2, { children: [
    /* @__PURE__ */ jsxs(FieldRow, { children: [
      /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-phone`, label: "Your phone number", required: true, error: errorFor("phone"), children: /* @__PURE__ */ jsx3(
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
    /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-message`, label: "Custom message", error: errorFor("message"), children: /* @__PURE__ */ jsx3(
      "textarea",
      {
        id: `${idPrefix}-message`,
        className: "pga-qr-input pga-qr-textarea",
        rows: 2,
        placeholder: "Your SMS text",
        maxLength: SMS_MESSAGE_MAX_LENGTH,
        value: sms.message,
        "aria-describedby": `${idPrefix}-message-msg`,
        onChange: (event) => state.setSms({ ...sms, message: event.target.value })
      }
    ) })
  ] });
}
function NoLogoIcon() {
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsx3("circle", { cx: "12", cy: "12", r: "8" }),
        /* @__PURE__ */ jsx3("path", { d: "M6.5 17.5l11-11" })
      ]
    }
  );
}
function LogoPicker({
  state,
  allowUpload,
  onUploadLogo
}) {
  const fileInput = useRef3(null);
  const [uploadError, setUploadError] = useState3(null);
  const [uploading, setUploading] = useState3(false);
  const { logo, logoEnabled, logoPresets, customLogos, maxCustomLogos } = state;
  const atLimit = customLogos.length >= maxCustomLogos;
  const known = [...logoPresets.map((preset) => preset.src), ...customLogos];
  const otherLogo = logo && !known.includes(logo) ? logo : null;
  const noLogo = !logoEnabled || !logo;
  const addFile = async (file) => {
    setUploadError(null);
    setUploading(true);
    try {
      state.addCustomLogo(await (onUploadLogo ?? readLogoFile)(file));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await addFile(file);
  };
  const pasteHandler = useRef3(() => {
  });
  pasteHandler.current = (event) => {
    const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
    if (!file || uploading) return;
    const target = event.target;
    const editable = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName));
    if (editable && event.clipboardData?.getData("text/plain")) return;
    event.preventDefault();
    if (atLimit) setUploadError(`You can keep ${maxCustomLogos} uploaded logos. Remove one to add another.`);
    else void addFile(file);
  };
  useEffect3(() => {
    if (!allowUpload) return;
    const listener = (event) => pasteHandler.current(event);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, [allowUpload]);
  const option = (src, label, removable) => /* @__PURE__ */ jsxs("div", { className: "pga-qr-logo-item", children: [
    /* @__PURE__ */ jsx3(
      "button",
      {
        type: "button",
        role: "radio",
        "aria-checked": !noLogo && logo === src,
        "aria-label": label,
        className: "pga-qr-logo-option",
        onClick: () => state.setLogo(src),
        children: /* @__PURE__ */ jsx3("img", { src, alt: "", width: 38, height: 38 })
      }
    ),
    removable && /* @__PURE__ */ jsx3(
      "button",
      {
        type: "button",
        className: "pga-qr-logo-remove",
        "aria-label": `Remove ${label.toLowerCase()}`,
        onClick: () => state.removeCustomLogo(src),
        children: /* @__PURE__ */ jsx3("span", { "aria-hidden": "true", children: "\xD7" })
      }
    )
  ] }, src);
  return /* @__PURE__ */ jsxs("fieldset", { className: "pga-qr-fieldset", children: [
    /* @__PURE__ */ jsx3("legend", { className: "pga-qr-legend", children: "Logo" }),
    /* @__PURE__ */ jsxs("div", { className: "pga-qr-logos", role: "radiogroup", "aria-label": "Logo", children: [
      /* @__PURE__ */ jsx3("div", { className: "pga-qr-logo-item", children: /* @__PURE__ */ jsx3(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": noLogo,
          "aria-label": "No logo",
          title: "No logo",
          className: "pga-qr-logo-option",
          onClick: () => state.setLogoEnabled(false),
          children: /* @__PURE__ */ jsx3(NoLogoIcon, {})
        }
      ) }),
      logoPresets.map((preset) => option(preset.src, preset.label, false)),
      customLogos.map((src, index) => option(src, `Uploaded logo ${index + 1}`, true)),
      otherLogo && option(otherLogo, "Custom logo", false),
      allowUpload && /* @__PURE__ */ jsxs("div", { className: "pga-qr-logo-item", children: [
        /* @__PURE__ */ jsx3("input", { ref: fileInput, type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true, onChange: onFile }),
        /* @__PURE__ */ jsx3(
          "button",
          {
            type: "button",
            className: "pga-qr-logo-option pga-qr-logo-add",
            "aria-label": "Upload a custom image",
            title: atLimit ? `You can keep ${maxCustomLogos} uploaded logos. Remove one to add another.` : "Upload a custom image, or paste one",
            disabled: uploading || atLimit,
            onClick: () => fileInput.current?.click(),
            children: /* @__PURE__ */ jsx3("span", { "aria-hidden": "true", children: uploading ? "\u2026" : "+" })
          }
        )
      ] })
    ] }),
    uploadError && /* @__PURE__ */ jsx3("p", { className: "pga-qr-error", role: "alert", children: uploadError }),
    state.storageWarning && /* @__PURE__ */ jsx3("p", { className: "pga-qr-hint", children: "Your uploaded logos could not be saved for next time (browser storage is unavailable)." })
  ] });
}
var PREVIEW_SAMPLE = "https://pga.com";
var toDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
function previewFor(payload, style, foreground) {
  const appearance = { size: 64, margin: 0, foreground, dotStyle: style.dotStyle, cornerStyle: style.cornerStyle };
  try {
    return toDataUri(renderQrSvg(payload, appearance));
  } catch {
    return toDataUri(renderQrSvg(PREVIEW_SAMPLE, appearance));
  }
}
function StylePicker({ state, showStyles, showColors }) {
  const color = QR_COLORS.find((item) => item.id === state.colorId)?.value ?? QR_COLORS[0].value;
  const payload = state.qr.payload ?? PREVIEW_SAMPLE;
  const previews = useMemo3(() => QR_STYLES.map((style) => previewFor(payload, style, color)), [payload, color]);
  if (!showStyles && !showColors) return null;
  return /* @__PURE__ */ jsxs("div", { className: "pga-qr-appearance", children: [
    showStyles && /* @__PURE__ */ jsxs("fieldset", { className: "pga-qr-fieldset", children: [
      /* @__PURE__ */ jsx3("legend", { className: "pga-qr-legend", children: "Style" }),
      /* @__PURE__ */ jsx3("div", { className: "pga-qr-logos", role: "radiogroup", "aria-label": "Style", children: QR_STYLES.map((style, index) => /* @__PURE__ */ jsx3(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": state.styleId === style.id,
          "aria-label": style.label,
          title: style.label,
          className: "pga-qr-logo-option pga-qr-style-option",
          onClick: () => state.setStyleId(style.id),
          children: /* @__PURE__ */ jsx3("img", { src: previews[index], alt: "", width: 40, height: 40 })
        },
        style.id
      )) })
    ] }),
    showColors && /* @__PURE__ */ jsxs("fieldset", { className: "pga-qr-fieldset", children: [
      /* @__PURE__ */ jsx3("legend", { className: "pga-qr-legend", children: "Color" }),
      /* @__PURE__ */ jsx3("div", { className: "pga-qr-logos", role: "radiogroup", "aria-label": "Color", children: QR_COLORS.map((item) => /* @__PURE__ */ jsx3(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": state.colorId === item.id,
          "aria-label": item.label,
          title: item.label,
          className: "pga-qr-logo-option",
          onClick: () => state.setColorId(item.id),
          children: /* @__PURE__ */ jsx3("span", { className: "pga-qr-swatch", style: { background: item.swatch }, "aria-hidden": "true" })
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
  const idPrefix = useId();
  const state = useQrBuilder(options);
  const ready = !!state.qr.svg;
  const linkUrl = typeof link === "function" ? link(state) : link;
  const [menu, setMenu] = useState3(null);
  const [copiedUrl, setCopiedUrl] = useState3(null);
  const closeMenu = useCallback2(() => setMenu(null), []);
  const panel = useRef3(null);
  useEffect3(() => {
    if (autoFocus) panel.current?.querySelector('input:not([type="checkbox"]), textarea')?.focus({ preventScroll: true });
  }, [autoFocus]);
  const pngCopyLabel = state.copySupported ? "PNG" : "PNG (not supported here)";
  const toggleFormatMenu = (event, kind) => {
    if (menu?.kind === kind) return setMenu(null);
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
  const captionField = /* @__PURE__ */ jsx3(Field, { id: `${idPrefix}-caption`, label: "Caption", children: /* @__PURE__ */ jsx3(
    "input",
    {
      id: `${idPrefix}-caption`,
      className: "pga-qr-input",
      type: "text",
      maxLength: CAPTION_MAX_LENGTH,
      placeholder: state.tab === "url" ? "pga.com" : "Shown below the code",
      value: state.caption,
      onChange: (event) => state.setCaption(event.target.value)
    }
  ) });
  return /* @__PURE__ */ jsxs("div", { className: ["pga-qr-builder", className].filter(Boolean).join(" "), children: [
    /* @__PURE__ */ jsxs("div", { className: "pga-qr-settings", children: [
      /* @__PURE__ */ jsx3(Tabs, { state, idPrefix }),
      /* @__PURE__ */ jsxs("div", { ref: panel, role: "tabpanel", id: `${idPrefix}-panel`, "aria-labelledby": `${idPrefix}-tab-${state.tab}`, className: "pga-qr-panel", children: [
        /* @__PURE__ */ jsx3("p", { className: "pga-qr-blurb", children: TAB_BLURB[state.tab] }),
        /* @__PURE__ */ jsx3(ContentFields, { state, idPrefix, captionField }, state.tab)
      ] }),
      /* @__PURE__ */ jsx3(LogoPicker, { state, allowUpload: allowLogoUpload, onUploadLogo }),
      /* @__PURE__ */ jsx3(StylePicker, { state, showStyles: allowStyleChoice, showColors: allowColorChoice })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "pga-qr-preview", children: [
      /* @__PURE__ */ jsx3("div", { className: "pga-qr-stage", "aria-live": "polite", onContextMenu: onStageContextMenu, children: ready ? /* @__PURE__ */ jsx3(QrCode, { content: state.content, appearance: state.appearance }) : placeholder ?? /* @__PURE__ */ jsxs("div", { className: "pga-qr-placeholder", children: [
        state.logoPresets[0] && /* @__PURE__ */ jsx3("img", { src: state.logoPresets[0].src, alt: "" }),
        /* @__PURE__ */ jsx3("span", { children: "Your QR code will appear here" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "pga-qr-actions", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "pga-qr-button pga-qr-button-secondary pga-qr-action",
            "aria-label": "Download image",
            "aria-haspopup": "menu",
            "aria-expanded": menu?.kind === "download",
            "data-pga-qr-menu-trigger": "",
            title: ready ? void 0 : disabledHint,
            disabled: !ready || state.downloadStatus === "working",
            onClick: (event) => toggleFormatMenu(event, "download"),
            children: [
              /* @__PURE__ */ jsx3(DiskIcon, {}),
              /* @__PURE__ */ jsx3("span", { "aria-hidden": "true", children: state.downloadStatus === "working" ? "Preparing\u2026" : "Image" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "pga-qr-button pga-qr-button-secondary pga-qr-action",
            "aria-label": "Copy image",
            "aria-haspopup": "menu",
            "aria-expanded": menu?.kind === "copy",
            "data-pga-qr-menu-trigger": "",
            title: ready ? void 0 : disabledHint,
            disabled: !ready || copyBusy,
            onClick: (event) => toggleFormatMenu(event, "copy"),
            children: [
              state.copyStatus === "done" ? /* @__PURE__ */ jsx3(CheckIcon, {}) : /* @__PURE__ */ jsx3(CopyIcon, {}),
              /* @__PURE__ */ jsx3("span", { "aria-hidden": "true", children: state.copyStatus === "done" ? "Copied!" : "Image" })
            ]
          }
        ),
        link !== void 0 && /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "pga-qr-button pga-qr-button-secondary pga-qr-action",
            "aria-label": `Copy ${linkLabel.toLowerCase()}`,
            title: linkUrl ?? disabledHint,
            disabled: !linkUrl,
            onClick: copyLink,
            children: [
              linkCopied ? /* @__PURE__ */ jsx3(CheckIcon, {}) : /* @__PURE__ */ jsx3(CopyIcon, {}),
              /* @__PURE__ */ jsx3("span", { "aria-hidden": "true", children: linkCopied ? "Copied!" : linkLabel })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx3("span", { className: "pga-qr-sr-only", role: "status", children: announcement }),
      state.actionError && /* @__PURE__ */ jsx3("p", { className: "pga-qr-error", role: "alert", children: state.actionError })
    ] }),
    menu && /* @__PURE__ */ jsx3(QrContextMenu, { x: menu.x, y: menu.y, label: menu.label, items: menu.items, focusFirst: menu.focusFirst, onClose: closeMenu })
  ] });
}
export {
  DEFAULT_LOGO_PRESETS,
  DEFAULT_STORAGE_KEY,
  MAX_CUSTOM_LOGOS,
  QR_COLORS,
  QR_STYLES,
  QrBuilder,
  QrCode,
  renderQrState,
  useQrBuilder,
  useQrSvg
};
//# sourceMappingURL=react.js.map