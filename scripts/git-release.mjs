#!/usr/bin/env node
// Builds the commit that lets consumers install @pga/qr-codes straight from git:
//
//   bun add github:pgahq/qr-codes#git-v<version>
//
// The source tag (v<version>) only holds the monorepo, whose root package is the private
// "qr-codes" and whose dist/ is never committed. Bun and npm cannot install a git subfolder,
// so this script makes a second commit whose root *is* the package: the built dist/, README, LICENSE
// and a package.json named @pga/qr-codes with the same exports and dependencies, minus
// scripts, devDependencies and publishConfig (so a git install builds nothing and pulls in
// nothing from the playground). The commit's parent is the source commit it was built from.
//
// Usage (after `npm run build`):
//   node scripts/git-release.mjs                local commit and tag only
//   node scripts/git-release.mjs --push         also push the tag to origin (skips if it exists)
//   node scripts/git-release.mjs --tag <name>   override the default tag name git-v<version>
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgDir = join(root, 'packages', 'qr-codes')

const args = process.argv.slice(2)
const push = args.includes('--push')
const tagFlag = args.indexOf('--tag')

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
const tag = tagFlag >= 0 ? args[tagFlag + 1] : `git-v${pkg.version}`
if (!tag) fail('--tag needs a value.')

const git = (gitArgs, options = {}) =>
  execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options }).trim()

function fail(message) {
  console.error(`git-release: ${message}`)
  process.exit(1)
}

function exportTargets(value) {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(exportTargets)
  return []
}

if (push && git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])) {
  console.log(`${tag} already exists on origin; nothing to do.`)
  process.exit(0)
}
if (git(['tag', '--list', tag])) fail(`tag ${tag} already exists locally.`)

const missing = [pkg.main, pkg.module, pkg.types, ...exportTargets(pkg.exports)].filter(
  (file) => file?.startsWith('./') && file !== './package.json' && !existsSync(join(pkgDir, file))
)
if (missing.length) fail(`run "npm run build" first; missing: ${[...new Set(missing)].join(', ')}`)

const stage = mkdtempSync(join(tmpdir(), 'qr-codes-git-'))
const index = join(stage, '.git-index')
try {
  const contents = join(stage, 'package')
  for (const entry of pkg.files ?? ['dist', 'README.md']) {
    cpSync(join(pkgDir, entry), join(contents, entry), { recursive: true })
  }

  const manifest = structuredClone(pkg)
  for (const key of ['scripts', 'devDependencies', 'publishConfig']) delete manifest[key]
  delete manifest.repository?.directory
  writeFileSync(join(contents, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  // A throwaway index and work tree keep the real checkout untouched; -f because dist/ is gitignored.
  const env = { ...process.env, GIT_DIR: resolve(root, git(['rev-parse', '--git-dir'])), GIT_INDEX_FILE: index, GIT_WORK_TREE: contents }
  git(['add', '-f', '-A', '.'], { cwd: contents, env })
  const tree = git(['write-tree'], { env })

  const source = git(['rev-parse', 'HEAD'])
  const identity = {
    GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME ?? 'github-actions[bot]',
    GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL ?? '41898282+github-actions[bot]@users.noreply.github.com'
  }
  const commit = git(['commit-tree', tree, '-p', source, '-m', `Built ${pkg.name}@${pkg.version} for git installs\n\nSource commit: ${source}`], {
    env: { ...process.env, ...identity, GIT_COMMITTER_NAME: identity.GIT_AUTHOR_NAME, GIT_COMMITTER_EMAIL: identity.GIT_AUTHOR_EMAIL }
  })

  git(['tag', tag, commit])
  console.log(`Tagged ${tag} -> ${commit} (built from ${source})`)
  if (push) {
    git(['push', 'origin', `refs/tags/${tag}`])
    console.log(`Pushed ${tag} to origin.`)
  }
} finally {
  rmSync(stage, { recursive: true, force: true })
}
