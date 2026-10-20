#!/usr/bin/env node
/**
 * Fails if any file added or changed in this PR isn't covered by tests.
 *
 * The repo has no baseline test suite, so a flat repo-wide coverage
 * threshold (jest.config.js used to have one) either blocks every PR
 * forever or, once softened to let a bare repo pass, stops meaning
 * anything. This checks coverage only for the diff instead: whatever a
 * PR touches, it has to bring its own tests for.
 *
 * Requires `npm run test:coverage` (or an equivalent `jest --coverage`
 * run producing coverage/coverage-summary.json) to have already run.
 *
 * Usage: node scripts/check-diff-coverage.js [baseRef] [headRef]
 * Env:   DIFF_BASE / DIFF_HEAD are used if args aren't given.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const THRESHOLD_PCT = 80

// Matches jest.config.js's collectCoverageFrom.
const TESTABLE = /^(app|components|lib|hooks)\/.*\.(js|jsx|ts|tsx)$/
// Test files themselves aren't in the coverage report (jest excludes the
// spec it's running from that file's own coverage) — don't require a test
// for the test.
const EXCLUDED = /\.d\.ts$|(^|\/)__tests__\/|\.(test|spec)\.[jt]sx?$/

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function resolveBase(explicit) {
  if (explicit) return explicit
  try {
    return git(['merge-base', 'origin/main', 'HEAD'])
  } catch {
    return git(['rev-parse', 'HEAD~1'])
  }
}

function changedFiles(base, head) {
  const out = git(['diff', '--name-only', '--diff-filter=ACMR', `${base}...${head}`])
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((file) => file && TESTABLE.test(file) && !EXCLUDED.test(file))
}

function loadCoverageSummary() {
  const summaryPath = path.resolve(__dirname, '..', 'coverage', 'coverage-summary.json')
  if (!fs.existsSync(summaryPath)) {
    console.error(
      `No coverage report at ${summaryPath}.\n` + 'Run `npm run test:coverage` before this check.'
    )
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
}

function coverageFor(summary, relativeFile) {
  const absolute = path.resolve(__dirname, '..', relativeFile)
  if (summary[absolute]) return summary[absolute]
  // The report may come from another checkout location (e.g. CI's test
  // container writes /app/...), so fall back to matching the repo-relative path.
  const suffix = `/${relativeFile}`
  const key = Object.keys(summary).find((candidate) => candidate.endsWith(suffix))
  return key ? summary[key] : null
}

function main() {
  const base = resolveBase(process.argv[2] || process.env.DIFF_BASE)
  const head = process.argv[3] || process.env.DIFF_HEAD || 'HEAD'

  const files = changedFiles(base, head)
  if (files.length === 0) {
    console.log(
      'No changed source files under app/, components/, lib/, or hooks/ — nothing to check.'
    )
    return
  }

  const summary = loadCoverageSummary()
  const failures = []

  for (const file of files) {
    const entry = coverageFor(summary, file)
    if (!entry) {
      failures.push({ file, statements: 0, lines: 0, reason: 'no coverage collected (untested)' })
      continue
    }
    const { statements, lines } = entry
    if (statements.pct < THRESHOLD_PCT || lines.pct < THRESHOLD_PCT) {
      failures.push({
        file,
        statements: statements.pct,
        lines: lines.pct,
        reason: `below ${THRESHOLD_PCT}%`,
      })
    }
  }

  if (failures.length > 0) {
    console.error(`\nDiff coverage check failed — ${THRESHOLD_PCT}% required on changed files:\n`)
    for (const f of failures) {
      console.error(`  ${f.file}: statements ${f.statements}%, lines ${f.lines}% — ${f.reason}`)
    }
    console.error('\nAdd or extend tests for these files before merging.')
    process.exit(1)
  }

  console.log(`All ${files.length} changed source file(s) meet the ${THRESHOLD_PCT}% coverage bar.`)
}

main()
