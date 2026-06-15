/**
 * Prepares the package for `npm`/`bun` pack & publish. Runs with the package
 * directory as cwd.
 *
 * 1. Rewrites package.json (restored by postpack):
 *    - Injects "sideEffects": false. bun's bundler incorrectly applies
 *      sideEffects from the package's own package.json during builds,
 *      tree-shaking all re-exports into an empty bundle. Keeping it out of
 *      source and injecting only at publish time gives correct builds AND a
 *      tree-shakeable published package.
 *    - Drops devDependencies. They include the private workspace packages
 *      (@ilamy/ui, @ilamy/utils, @ilamy/types, @ilamy/calendar-recurrence,
 *      @ilamy/calendar-agenda) that are bundled into dist and never published;
 *      bun would rewrite their `workspace:*` to a version pointing at a
 *      non-existent npm package. Consumers never install devDependencies, so
 *      stripping them keeps the published manifest clean.
 *
 * 2. Copies the repo-root README into the package so the npm page matches the
 *    GitHub homepage (single source of truth). The package README is gitignored
 *    and generated only here, so there's nothing to restore in postpack. npm
 *    always includes README in the tarball regardless of ignore files.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const PKG = 'package.json'
const BACKUP = 'package.json.backup'

copyFileSync(PKG, BACKUP)

const pkg = JSON.parse(readFileSync(PKG, 'utf8'))
pkg.sideEffects = false
delete pkg.devDependencies
writeFileSync(PKG, `${JSON.stringify(pkg, null, '\t')}\n`)

// cwd is the package dir; the repo-root README is two levels up.
copyFileSync('../../README.md', 'README.md')
