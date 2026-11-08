import {
  renderQrSvg,
  withInlinedLogo
} from "./chunk-K7QXANCL.js";

// src/browser.ts
async function renderQrPngBlob(input, appearance = {}, { width = 1024, logo } = {}) {
  const inlined = await withInlinedLogo({ ...appearance, size: width }, logo);
  const svg = renderQrSvg(input, inlined);
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
    const inlined = await withInlinedLogo(appearance, raster.logo);
    const svg = renderQrSvg(input, inlined);
    saveBlob(new Blob([svg], { type: "image/svg+xml" }), `${safeName}.svg`);
    return;
  }
  saveBlob(await renderQrPngBlob(input, appearance, raster), `${safeName}.png`);
}
function canCopyQr() {
  return typeof window !== "undefined" && typeof window.ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
}
async function copyQrToClipboard(input, appearance = {}, raster = {}) {
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": renderQrPngBlob(input, appearance, raster)
    })
  ]);
}
async function copyQrSvgToClipboard(input, appearance = {}, raster = {}) {
  const inlined = await withInlinedLogo(appearance, raster.logo);
  await copyTextToClipboard(renderQrSvg(input, inlined));
}
async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
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

export {
  renderQrPngBlob,
  downloadQr,
  canCopyQr,
  copyQrToClipboard,
  copyQrSvgToClipboard,
  copyTextToClipboard
};
//# sourceMappingURL=chunk-WRGYS54F.js.map