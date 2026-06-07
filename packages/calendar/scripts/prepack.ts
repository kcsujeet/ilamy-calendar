/**
 * Rewrites package.json before npm packs the tarball (restored by postpack):
 *
 * 1. Injects "sideEffects": false. bun's bundler incorrectly applies sideEffects
 *    from the package's own package.json during builds, tree-shaking all
 *    re-exports into an empty bundle. Keeping it out of source and injecting only
 *    at publish time gives correct builds AND a tree-shakeable published package.
 *
 * 2. Drops devDependencies. They include the private workspace packages
 *    (@ilamy/ui, @ilamy/utils, @ilamy/types, @ilamy/calendar-recurrence) that are
 *    bundled into dist and never published; bun would rewrite their `workspace:*`
 *    to a version pointing at a non-existent npm package. Consumers never install
 *    devDependencies, so stripping them keeps the published manifest clean.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const PKG = 'package.json'
const BACKUP = 'package.json.backup'

copyFileSync(PKG, BACKUP)

const pkg = JSON.parse(readFileSync(PKG, 'utf8'))
pkg.sideEffects = false
delete pkg.devDependencies
writeFileSync(PKG, `${JSON.stringify(pkg, null, '\t')}\n`)
