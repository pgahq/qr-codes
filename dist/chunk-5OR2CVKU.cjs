"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


var _chunkIW2QKMFYcjs = require('./chunk-IW2QKMFY.cjs');

// src/browser.ts
async function renderQrPngBlob(input, appearance = {}, { width = 1024, logo } = {}) {
  const inlined = await _chunkIW2QKMFYcjs.withInlinedLogo.call(void 0, { ...appearance, size: width }, logo);
  const svg = _chunkIW2QKMFYcjs.renderQrSvg.call(void 0, input, inlined);
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not rasterize the QR code."));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await loaded;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || width;
  canvas.height = image.naturalHeight || width;
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise(
    (resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed.")),
      "image/png"
    )
  );
}
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
async function downloadQr(input, appearance = {}, { filename = "qr-code", format = "png", ...raster } = {}) {
  const safeName = filename.replace(/[\\/:*?"<>|]+/g, "-").trim() || "qr-code";
  if (format === "svg") {
    const inlined = await _chunkIW2QKMFYcjs.withInlinedLogo.call(void 0, appearance, raster.logo);
    const svg = _chunkIW2QKMFYcjs.renderQrSvg.call(void 0, input, inlined);
    saveBlob(new Blob([svg], { type: "image/svg+xml" }), `${safeName}.svg`);
    return;
  }
  saveBlob(await renderQrPngBlob(input, appearance, raster), `${safeName}.png`);
}
function canCopyQr() {
  return typeof window !== "undefined" && typeof window.ClipboardItem !== "undefined" && typeof _optionalChain([navigator, 'access', _ => _.clipboard, 'optionalAccess', _2 => _2.write]) === "function";
}
async function copyQrToClipboard(input, appearance = {}, raster = {}) {
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": renderQrPngBlob(input, appearance, raster)
    })
  ]);
}
async function copyQrSvgToClipboard(input, appearance = {}, raster = {}) {
  const inlined = await _chunkIW2QKMFYcjs.withInlinedLogo.call(void 0, appearance, raster.logo);
  await copyTextToClipboard(_chunkIW2QKMFYcjs.renderQrSvg.call(void 0, input, inlined));
}
async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && typeof _optionalChain([navigator, 'access', _3 => _3.clipboard, 'optionalAccess', _4 => _4.writeText]) === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (e) {
    }
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Could not copy to the clipboard.");
}








exports.renderQrPngBlob = renderQrPngBlob; exports.downloadQr = downloadQr; exports.canCopyQr = canCopyQr; exports.copyQrToClipboard = copyQrToClipboard; exports.copyQrSvgToClipboard = copyQrSvgToClipboard; exports.copyTextToClipboard = copyTextToClipboard;
//# sourceMappingURL=chunk-5OR2CVKU.cjs.map