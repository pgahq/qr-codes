# @pgahq/qr-codes

PGA QR codes in one package: payload encoding (URL, Wi-Fi, SMS, text), a deterministic SVG renderer, browser PNG download/copy, React components, and a Web-standard API handler.

It replaces the `QrComponents` code in `cloudcannon-component-library` (Gatsby, styled-components, Formik, Cloudinary widget, GTM calls) with a framework-neutral core plus thin adapters.

## Install

The package is private to the `pgahq` org on GitHub Packages. Point the scope at that registry and authenticate with a token that has `read:packages` (a classic PAT, or `GITHUB_TOKEN` in Actions):

```ini
# .npmrc
@pgahq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @pgahq/qr-codes
# optional: PNG output from the API handler
npm install @resvg/resvg-js
```

For a repo that installs it in CI, grant that repo access under the package's "Manage Actions access" settings, or use a token that can read it.

### Install from git over SSH (no registry token)

Every release also gets a `git-v<version>` tag whose root is the built package (`dist/` included, named `@pgahq/qr-codes`), so it installs like any other private git dependency:

```bash
bun add git+ssh://git@github.com/pgahq/qr-codes#git-v0.1.5
# or
npm install git+ssh://git@github.com/pgahq/qr-codes#git-v0.1.5
```

This needs SSH access to `github.com/pgahq/qr-codes`: a developer's own key, or a read-only deploy key on this repo for CI (Settings > Deploy keys; load the private half into the CI job's SSH agent). Pin a `git-v<version>` tag or the commit it resolves to. Do not pin `v<version>` or a branch: those contain the monorepo source and no `dist/`, and a git install does not build.

The `git-v` tag installs the same files as the registry package (same exports, dependencies and peer dependencies, so `react` and `react-dom` stay peers and `@resvg/resvg-js` stays optional). It only lacks `scripts` and `devDependencies`, so nothing is built or pulled in at install time.

## Entry points

| Import | Runs in | What it has |
| --- | --- | --- |
| `@pgahq/qr-codes` | browser and server | `renderQrSvg`, `encodeQrContent`, `normalizeUrl`, logo inlining, `downloadQr`, `copyQrToClipboard`, `copyQrSvgToClipboard`, `PGA_LOGOS` |
| `@pgahq/qr-codes/react` | browser (client components) | `<QrBuilder />`, `<QrCode />`, `useQrBuilder`, `useQrSvg` |
| `@pgahq/qr-codes/server` | server | `createQrHandler`, `parseQrRequest`, `renderPng` |
| `@pgahq/qr-codes/styles.css` | | styles for `<QrBuilder />` and `<QrCode />` |

React and `@resvg/resvg-js` are optional peer dependencies. SVG-only consumers need neither.

## Where the API lives

The package owns the API *logic* (`createQrHandler`: validation, logo fetching, rendering, caching headers). The consuming app owns the *route*, because auth, rate limiting, and URL structure are app decisions. That keeps one implementation of the rules and no hard dependency on Next.js:

```ts
// app/api/qr/route.ts (Next.js)
import { createQrHandler } from '@pgahq/qr-codes/server'

const handler = createQrHandler()
export const GET = handler
export const POST = handler
```

```bash
# GET: for <img src> and links
curl -o qr.png 'https://example.com/api/qr?url=pga.org&format=png&logo=blue&caption=Scan%20me&fg=00205B'

# POST: same fields as JSON; use it for secrets (URLs end up in logs and caches)
curl -X POST https://example.com/api/qr -H 'content-type: application/json' \
  -d '{"type":"wifi","ssid":"Club House","password":"fairway123","format":"png"}' -o wifi.png
```

### Request fields

| Field | Values | Default |
| --- | --- | --- |
| `type` | `url`, `wifi`, `sms`, `text` | `url` |
| `url` | http(s) URL; a bare `pga.org` becomes `https://pga.org/` | |
| `ssid`, `password`, `security` (`WPA`, `WEP`, `nopass`), `hidden` | Wi-Fi | `security=WPA` |
| `phone`, `message` | SMS (message up to 159 characters) | |
| `text` | up to 1000 characters | |
| `format` | `svg`, `png` | `svg` |
| `size` | 64-2048 px wide | `1024` |
| `fg`, `bg` | hex, with or without `#` (`cornerSquareColor`, `cornerDotColor` also accepted) | `000000`, `ffffff` |
| `dotStyle` | `square`, `rounded`, `dots`, `fluid` | `square` |
| `cornerStyle` | `square`, `rounded`, `dot`, `fluid` | `square` |
| `logo` | preset key (`blue`, `circle`) or an https URL on an allowed host | none |
| `logoGrayscale` | `1` or `true` to render the logo without color | off |
| `logoScale` | 0.1-0.3 of QR width | `0.22` |
| `caption` | up to 80 characters | none |
| `errorCorrection` | `L`, `M`, `Q`, `H` | `H` with a logo, otherwise `M` |
| `download`, `filename` | `download=1` sends `Content-Disposition: attachment` | |

Errors are JSON: `400` for malformed requests, `422` for content or logo problems, `405` for other methods, `501` if PNG is requested without `@resvg/resvg-js` installed. Each has `{ "error": "...", "field": "..." }`.

### Security notes

- Remote logos are fetched server-side only from allowed hosts (the preset hosts, plus `allowedLogoHosts`), over https, with a timeout, a 1 MB cap, an image content-type check, and no redirects. Pass `allowCustomLogo: false` to accept preset keys only.
- Wi-Fi codes, and every `POST`, are served `Cache-Control: no-store`. Other `GET` responses are cacheable for a day (`maxAgeSeconds`).
- Colors must be hex, and all text is XML-escaped, so request values cannot inject SVG attributes or markup.
- The handler has no auth or rate limit. Add them in the route if the endpoint is public.
- PNG captions use system fonts. On hosts without fonts (for example Vercel) pass `fontFiles: ['/path/to/font.ttf']`.

## React

```tsx
import '@pgahq/qr-codes/styles.css'
import { QrBuilder, QrCode } from '@pgahq/qr-codes/react'

<QrBuilder appearance={{ foreground: '#00205B' }} onEvent={(event) => track(event)} />

<QrCode content={{ type: 'url', url: 'pga.org' }} appearance={{ caption: 'Scan me', size: 512 }} />
```

- `onEvent` receives `start`, `download`, `copy` and `copy-link`, replacing the old hard-coded Google Tag Manager calls. Wire them to GTM, Amplitude, or nothing.
- `onUploadLogo(file) => Promise<url>` replaces the Cloudinary widget. Without it, uploads are shrunk to 256px and stay in the browser as data URIs.
- Users can keep up to 5 uploaded logos (add with the `+` tile, remove with the `x` on a tile). They are saved in `localStorage` under `pgahq:qr-codes:custom-logos`; set `storageKey` to change the key or `null` to disable saving. Stored values are validated on load (png/jpeg/webp/gif data URIs and https URLs only).
- The URL field starts empty with `https://pga.com` as placeholder text (`defaultUrl` prefills it). The caption follows the content (`pga.com/championship`, or the Wi-Fi network name) until the user types their own.
- Below the logos, users pick one of two single-color looks (Fluid, the default, or Classic; each tile is a miniature of their own code) and Navy, Black or Greyscale (a black code with the logo desaturated; `logo.grayscale` in `appearance`). The builder always renders one color, so `appearance.cornerSquareColor` / `cornerDotColor` are ignored there. The builder starts with Fluid in Navy; `defaultStyle` (`fluid` or `classic`) and `defaultColor` change the starting choice, and `download`/`copy` events include `format` (`svg` or `png`), `style` and `color`.
- The SMS message box is multi-line (Enter adds a line break). A message with line breaks is encoded as `sms:<phone>?&body=<percent-encoded text>`, because `smsto:` has no way to carry them; single-line messages still use `smsto:`. The API accepts line breaks in `message` as `%0A`.
- `allowStyleChoice` and `allowColorChoice` (both default `true`) hide the style or color tiles; the builder then keeps using `defaultStyle` / `defaultColor`.
- `autoFocus` focuses the URL field when the builder mounts. It is off by default so an embedded builder doesn't steal focus or scroll the host page.
- Under the code are three secondary buttons: an Image button with a disk icon (download), an Image button with a copy icon, and, when `link` is set, a Link button with a copy icon. Both Image buttons open a small menu to choose SVG or PNG; copying SVG puts the markup on the clipboard, copying PNG puts an image there.
- `link` (a string, or `(state) => string | null`) is the text the Link button copies, for example the URL of the generated image; a `copy-link` event is emitted. `linkLabel` renames the button. The button is disabled until the link is available, and not rendered at all when `link` is not set.
- Right-clicking the code opens a menu with Copy PNG, Copy SVG, Download PNG and Download SVG.
- Where the browser cannot write images to the clipboard, only the Copy PNG choice is disabled; SVG still works.
- Need a different layout? `useQrBuilder` is the same state and actions without any markup.

## Core

```ts
import { renderQrSvg, encodeQrContent } from '@pgahq/qr-codes'

const svg = renderQrSvg(
  { type: 'wifi', ssid: 'Club House', password: 'fairway123' },
  { foreground: '#00205B', dotStyle: 'rounded', cornerStyle: 'rounded', caption: 'Guest Wi-Fi' }
)
```

`renderQrSvg` throws `QrRenderError` (with a `field`) on invalid input. `encodeQrContent` returns a result object instead, for form validation.

## Behavior changes from the Gatsby component

- Wi-Fi and SMS values are validated and escaped (`;`, `,`, `:`, `"` and `\` in Wi-Fi fields). The old code did not escape them, so such networks produced broken codes.
- URLs are normalized (`pga.org` works; `https://` is added to the encoded value) and limited to http(s). `ftp:` is no longer accepted.
- A caption gets its own strip below the code instead of overlapping the quiet zone.
- Rendering is a pure function of its input, built on `qrcode` instead of `qr-code-styling`, so the browser, server and API produce identical output.
- The builder offers Navy or Black. Any other color, or separate corner colors, is available through `appearance` on `QrCode`, `renderQrSvg` and the API.

## Develop

Development needs Node 22 or newer (the React tests use jsdom). The published package itself supports Node 20 and up. From the repo root:

```bash
npm ci
npm run dev        # builds the package, then starts the playground on http://localhost:3100
npm run typecheck
npm test           # includes decoding rendered codes with ZXing at several sizes
```

## Release

The package is published as a private package to GitHub Packages by `.github/workflows/publish.yml`.

1. Bump `version` in `packages/qr-codes/package.json` and merge to `main`.
2. Tag the merge commit and push the tag:

   ```bash
   git tag v0.2.0 && git push origin v0.2.0
   ```

The workflow checks that the tag matches the package version, runs typecheck, tests and build, then pushes the `git-v<version>` tag for SSH installs (`scripts/git-release.mjs`; it is skipped if that tag already exists), then publishes with the workflow's `GITHUB_TOKEN`. Running the workflow manually from a branch only does a dry run. Published versions cannot be overwritten, so a bad release needs a new version.

### How the `git-v<version>` tag is made

The repo root is a private monorepo and `dist/` is never committed, and Bun and npm cannot install a subfolder of a git repo. `scripts/git-release.mjs` therefore commits a second tree made only of the built package: `dist/`, the README and a `package.json` copied from `packages/qr-codes` without `scripts`, `devDependencies` and `publishConfig`. Its parent is the source commit (`v<version>`), and the source layout is unchanged. To try it locally after `npm run build`: `node scripts/git-release.mjs` (local tag only; add `--push` to push it).
