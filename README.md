# qr-codes

`@pga/qr-codes`: QR code generation for PGA apps (URL, Wi-Fi, SMS and text codes; SVG and PNG; React components; a Web-standard API handler). Published to the public npm registry: `npm install @pga/qr-codes`.

| Path | What it is |
| --- | --- |
| `packages/qr-codes` | the published package. See its [README](packages/qr-codes/README.md) for install, usage and the API. |
| `apps/playground` | Next.js app that exercises the package: builder, examples, and `/api/qr`. Not published. |

```bash
npm ci
npm run dev   # http://localhost:3100
```

CI (`.github/workflows/ci.yml`) typechecks, tests and builds on every PR. Pushing a `v<version>` tag publishes the package (`.github/workflows/publish.yml`) to npm and also creates a `git-v<version>` tag that installs straight from git (see the package README).
