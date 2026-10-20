import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

/**
 * Budgets the JavaScript each App Router page adds on top of what every page
 * already loads: the framework runtime (rootMainFiles + polyfills) and the
 * layouts the page renders inside. Those shared chunks are paid once and
 * cached, so counting them against every route would make any budget
 * meaningless. Chunks loaded later via next/dynamic are not counted either.
 */
const ROOT = process.cwd()
const NEXT_DIR = path.join(ROOT, '.next')
const BUILD_MANIFEST_PATH = path.join(NEXT_DIR, 'build-manifest.json')
const APP_BUILD_MANIFEST_PATH = path.join(NEXT_DIR, 'app-build-manifest.json')
const THRESHOLD_BYTES = 40 * 1024

function readJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Bundle manifest not found at ${file}. Run \`npm run build:analyze\` first.`)
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

const gzipCache = new Map()
function gzippedSize(file) {
  if (!gzipCache.has(file)) {
    const absolute = path.join(NEXT_DIR, file)
    gzipCache.set(
      file,
      fs.existsSync(absolute) ? zlib.gzipSync(fs.readFileSync(absolute)).length : 0
    )
  }
  return gzipCache.get(file)
}

/** '/(app)/admin/users/page' → ['/layout', '/(app)/layout', '/(app)/admin/layout', ...] */
function layoutEntries(pageEntry) {
  const segments = pageEntry.split('/').slice(1, -1)
  const layouts = ['/layout']
  let current = ''
  for (const segment of segments) {
    current += `/${segment}`
    layouts.push(`${current}/layout`)
  }
  return layouts
}

function routeStats() {
  const buildManifest = readJson(BUILD_MANIFEST_PATH)
  const appPages = readJson(APP_BUILD_MANIFEST_PATH).pages ?? {}
  const runtime = new Set([
    ...(buildManifest.rootMainFiles ?? []),
    ...(buildManifest.polyfillFiles ?? []),
  ])

  const results = []
  for (const [entry, files] of Object.entries(appPages)) {
    if (!entry.endsWith('/page') || !Array.isArray(files)) continue

    const shared = new Set(runtime)
    for (const layout of layoutEntries(entry)) {
      for (const file of appPages[layout] ?? []) shared.add(file)
    }

    const routeFiles = files.filter((file) => file.endsWith('.js') && !shared.has(file))
    const gzippedBytes = routeFiles.reduce((total, file) => total + gzippedSize(file), 0)
    results.push({ route: entry.replace(/\/page$/, '') || '/', gzippedBytes })
  }

  return results.sort((a, b) => b.gzippedBytes - a.gzippedBytes)
}

const stats = routeStats()

if (stats.length === 0) {
  console.log('No app route entries found in .next/app-build-manifest.json.')
  process.exit(0)
}

const failures = stats.filter((entry) => entry.gzippedBytes > THRESHOLD_BYTES)

for (const entry of stats) {
  const sizeKb = (entry.gzippedBytes / 1024).toFixed(2)
  const status = entry.gzippedBytes > THRESHOLD_BYTES ? 'FAIL' : 'OK'
  console.log(`${status} ${entry.route}: ${sizeKb} KB gzipped`)
}

if (failures.length > 0) {
  console.error(
    `\nBundle budget exceeded for ${failures.length} route(s). Maximum route-specific JS is ${THRESHOLD_BYTES / 1024} KB gzipped.`
  )
  for (const entry of failures) {
    console.error(`- ${entry.route}: ${(entry.gzippedBytes / 1024).toFixed(2)} KB gzipped`)
  }
  process.exit(1)
}

console.log(
  `\nAll routes are within the ${THRESHOLD_BYTES / 1024} KB gzipped route-specific budget.`
)
