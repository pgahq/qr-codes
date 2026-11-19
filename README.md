# qr-codes

`@pgahq/qr-codes`: QR code generation for PGA apps (URL, Wi-Fi, SMS and text codes; SVG and PNG; React components; a Web-standard API handler). Published as a private package to [GitHub Packages](https://github.com/orgs/pgahq/packages).

| Path | What it is |
| --- | --- |
| `packages/qr-codes` | the published package. See its [README](packages/qr-codes/README.md) for install, usage and the API. |

The builder, examples, and API playground live on the PGA Technology docs site: [technology.pgahq.com/qr-codes](https://technology.pgahq.com/qr-codes) (source in [technology-pgahq-com](https://github.com/pgahq/technology-pgahq-com)). That site installs a packed copy of this package, so after a release, update its `vendor/` tarball (see [QR Codes](https://technology.pgahq.com/engineering/qr-codes)).

```bash
npm ci
npm run dev   # rebuilds the package on change
npm test
```

CI (`.github/workflows/ci.yml`) typechecks, tests and builds on every PR. Pushing a `v<version>` tag publishes the package (`.github/workflows/publish.yml`) and also creates a `git-v<version>` tag that installs over SSH with no registry token (see the package README).
