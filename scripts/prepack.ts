/**
 * Injects "sideEffects": false into package.json before npm packs the tarball.
 *
 * This exists because bun's bundler incorrectly applies sideEffects from the
 * package's own package.json during builds, tree-shaking all re-exports and
 * producing an empty bundle. By keeping sideEffects out of the source
 * package.json and injecting it only at publish time, we get:
 *   - Correct builds (bun doesn't see sideEffects: false)
 *   - Tree-shakeable published package (consumers' bundlers see it)
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const PKG = 'package.json'
const BACKUP = 'package.json.backup'

copyFileSync(PKG, BACKUP)

const pkg = JSON.parse(readFileSync(PKG, 'utf8'))
pkg.sideEffects = false
writeFileSync(PKG, `${JSON.stringify(pkg, null, '\t')}\n`)
