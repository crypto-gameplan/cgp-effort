// Keeps docs/GUIDE.md on the plugin's version: writes its version line from .claude-plugin/plugin.json, or with --check
// fails when the two differ. The release scripts run it; CI runs --check.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const guide = join(repo, 'docs', 'GUIDE.md')
const version = JSON.parse(readFileSync(join(repo, '.claude-plugin', 'plugin.json'), 'utf8')).version
const line = /^Version (\S+), updated (\d{4}-\d{2}-\d{2})\./m
if (!existsSync(guide)) process.exit(0)
const text = readFileSync(guide, 'utf8')
const found = text.match(line)
if (!found) {
  console.error('docs/GUIDE.md has no "Version x, updated yyyy-mm-dd." line')
  process.exit(1)
}
if (process.argv.includes('--check')) {
  if (found[1] !== version) {
    console.error(`docs/GUIDE.md says ${found[1]}, plugin.json says ${version}`)
    process.exit(1)
  }
  console.log(`docs/GUIDE.md matches ${version}`)
} else if (found[1] !== version) {
  writeFileSync(guide, text.replace(line, `Version ${version}, updated ${new Date().toISOString().slice(0, 10)}.`))
  console.log(`docs/GUIDE.md set to ${version}`)
}
