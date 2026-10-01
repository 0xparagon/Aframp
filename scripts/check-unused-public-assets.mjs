#!/usr/bin/env node
/**
 * Fails if `public/` contains an asset that no source file references.
 *
 * Issue #670 leads with "public/logo.png is 313 KB". The real finding is
 * that nothing referenced that file at all, so converting it to WebP would
 * still have shipped dead weight — the fix is to delete it. A size budget
 * alone cannot catch the next dead asset, because an unused file is a
 * problem at any size. This checks the thing that actually matters: is the
 * file used?
 *
 * A handful of files only exist at runtime (the PWA service worker and the
 * workbox chunks it loads), so they can never be imported from source and
 * are allow-listed below.
 *
 * Usage: node scripts/check-unused-public-assets.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, 'public')

// Source trees that can reference a public asset.
const SOURCE_DIRS = ['app', 'components', 'lib', 'hooks']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'])
const EXTRA_SOURCES = ['next.config.mjs']

// Generated at build time (next-pwa) or fetched directly by the service
// worker — never imported from source, so they cannot be "unused".
const RUNTIME_ALLOWLIST = [/^sw\.js(\.map)?$/, /^workbox-.*\.js(\.map)?$/, /^push-handler\.js$/]

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function sourceCorpus() {
  const files = SOURCE_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
    .concat(EXTRA_SOURCES.map((file) => path.join(ROOT, file)))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)) && fs.existsSync(file))
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
}

function publicAssets() {
  return walk(PUBLIC_DIR).map((file) => path.relative(PUBLIC_DIR, file).split(path.sep).join('/'))
}

const corpus = sourceCorpus()
const assets = publicAssets()

const allowlisted = (rel) => RUNTIME_ALLOWLIST.some((pattern) => pattern.test(rel))
const referenced = (rel) => corpus.includes(`/${rel}`) || corpus.includes(path.basename(rel))

const unused = assets.filter((rel) => !allowlisted(rel) && !referenced(rel))

if (unused.length > 0) {
  console.error('\nUnused assets found in public/:\n')
  for (const file of unused) {
    const bytes = fs.statSync(path.join(PUBLIC_DIR, file)).size
    console.error(`  public/${file} (${(bytes / 1024).toFixed(1)} KB)`)
  }
  console.error('\nDelete them, or reference them from source. If a file is only')
  console.error('loaded at runtime, add it to RUNTIME_ALLOWLIST in this script.')
  process.exit(1)
}

console.log(`All ${assets.length} public asset(s) are referenced (or runtime-generated).`)
