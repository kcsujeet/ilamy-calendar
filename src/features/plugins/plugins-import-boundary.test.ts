import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Dogfooding boundary: plugin IMPLEMENTATION source under
 * `src/features/plugins/**` may import ONLY from the public API
 * (`@ilamy/calendar` / `@ilamy/calendar/...`), bare npm packages (`react`,
 * `rrule`, …), or relative paths (`./`, `../`).
 *
 * It must NEVER reach into deep internals via the `@/` alias (`@/hooks`,
 * `@/components`, `@/lib`, `@/features`, `@/types`, …). Plugins are consumers
 * of the library; if they need something internal, that something must be
 * promoted to the public API first.
 *
 * SCOPE: `src/features/plugins/lib/` is EXCLUDED. It is not a plugin — it is
 * the plugin SDK itself (the `IlamyPlugin`/`PluginRuntime` contract +
 * `createPluginRuntime`). The calendar CORE consumes it (`use-calendar-engine`,
 * the calendar context/provider) and `src/index.ts` re-exports its types as the
 * public plugin SDK. Requiring `lib/` to import from `@ilamy/calendar` would
 * invert the dependency (the package entry imports `lib/types`, so `lib/types`
 * importing `@ilamy/calendar` is a cycle). The boundary applies to plugins that
 * are BUILT ON the SDK (e.g. recurrence), not to the SDK machinery.
 *
 * This test is the primary, linter-agnostic enforcement of that rule.
 */

const PLUGINS_ROOT = join(import.meta.dir)

// The plugin SDK (contract + runtime) lives here and is part of the library
// internals, not a dogfooding consumer — see the SCOPE note above.
const SDK_DIR = join(PLUGINS_ROOT, 'lib')

const isUnderSdk = (filePath: string): boolean =>
	filePath.startsWith(`${SDK_DIR}/`)

const isTestFile = (fileName: string): boolean =>
	fileName.endsWith('.test.ts') ||
	fileName.endsWith('.test.tsx') ||
	fileName.endsWith('.spec.ts') ||
	fileName.endsWith('.spec.tsx')

const isSourceFile = (fileName: string): boolean =>
	(fileName.endsWith('.ts') || fileName.endsWith('.tsx')) &&
	!isTestFile(fileName)

const collectSourceFiles = (dir: string): string[] => {
	const entries = readdirSync(dir)
	const files: string[] = []
	for (const entry of entries) {
		const fullPath = join(dir, entry)
		const stats = statSync(fullPath)
		if (stats.isDirectory()) {
			files.push(...collectSourceFiles(fullPath))
		} else if (isSourceFile(entry)) {
			files.push(fullPath)
		}
	}
	return files
}

// Matches both `import ... from '<spec>'` (and re-exports `export ... from`)
// and side-effect `import '<spec>'` forms. The first capture group that
// participates holds the specifier.
const IMPORT_SPECIFIER_REGEX =
	/(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g

const extractImportSpecifiers = (source: string): string[] => {
	const specifiers: string[] = []
	for (const match of source.matchAll(IMPORT_SPECIFIER_REGEX)) {
		const specifier = match.at(1) ?? match.at(2)
		if (specifier) {
			specifiers.push(specifier)
		}
	}
	return specifiers
}

// The internal alias. `@ilamy/...` (scoped npm / the public package) must NOT
// trip this, so we check for the alias prefix specifically, not a bare `@`.
const isInternalAlias = (specifier: string): boolean =>
	specifier === '@' || specifier.startsWith('@/')

const sourceFiles = collectSourceFiles(PLUGINS_ROOT).filter(
	(filePath) => !isUnderSdk(filePath)
)

describe('plugins import boundary', () => {
	test('discovers plugin source files to lint', () => {
		expect(sourceFiles.length).toBeGreaterThan(0)
	})

	test('no plugin source file imports a deep internal (`@/`) module', () => {
		const violations: string[] = []

		for (const filePath of sourceFiles) {
			const source = readFileSync(filePath, 'utf8')
			const specifiers = extractImportSpecifiers(source)
			for (const specifier of specifiers) {
				if (isInternalAlias(specifier)) {
					violations.push(`${filePath} -> '${specifier}'`)
				}
			}
		}

		expect(violations).toEqual([])
	})
})
