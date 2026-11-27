import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PKG_ROOT = resolve(import.meta.dir, '..')
const REPO_ROOT = resolve(PKG_ROOT, '../..')
const DIST_DIR = resolve(PKG_ROOT, 'dist')

const walk = (dir: string, files: string[] = []): string[] => {
	if (!existsSync(dir)) return files
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) {
			walk(full, files)
		} else {
			files.push(full)
		}
	}
	return files
}

describe('Published @ilamy/calendar dist contract', () => {
	const distFiles = walk(DIST_DIR)
	const jsFiles = distFiles.filter((f) => f.endsWith('.js'))
	const dtsFiles = distFiles.filter((f) => f.endsWith('.d.ts'))
	const pkgJson = JSON.parse(
		readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf8')
	) as {
		exports: Record<string, string | { import?: string; types?: string }>
		dependencies: Record<string, string>
		peerDependencies: Record<string, string>
		peerDependenciesMeta?: Record<string, { optional?: boolean }>
	}

	it('builds every declared export path to an existing file on disk', () => {
		expect(distFiles.length).toBeGreaterThan(0)
		for (const [subpath, target] of Object.entries(pkgJson.exports)) {
			if (typeof target === 'string') {
				expect(existsSync(resolve(PKG_ROOT, target)), subpath).toBe(true)
			} else {
				if (target.import) {
					expect(
						existsSync(resolve(PKG_ROOT, target.import)),
						`${subpath} import`
					).toBe(true)
				}
				if (target.types) {
					expect(
						existsSync(resolve(PKG_ROOT, target.types)),
						`${subpath} types`
					).toBe(true)
				}
			}
		}
	})

	it('emits zero development JSX runtimes across all built chunks', () => {
		for (const file of jsFiles) {
			const code = readFileSync(file, 'utf8')
			expect(code, file).not.toContain('jsx-dev-runtime')
		}
	})

	it('never leaks preact into public .d.ts declarations or headless core dist/index.js', () => {
		for (const file of dtsFiles) {
			const dts = readFileSync(file, 'utf8')
			expect(dts, file).not.toContain('preact')
		}
		const coreJs = readFileSync(resolve(DIST_DIR, 'index.js'), 'utf8')
		expect(coreJs).not.toContain('preact')
		expect(coreJs).not.toContain("'react'")
		expect(coreJs).not.toContain('"react"')
		expect(coreJs).not.toContain('rrule')
	})

	it('keeps dependencies to preact + temporal-polyfill only and drops ./dom and removed UI/DnD deps', () => {
		expect(Object.keys(pkgJson.dependencies).sort()).toEqual([
			'preact',
			'temporal-polyfill',
		])
		expect(pkgJson.exports).not.toHaveProperty('./dom')

		const pkgRaw = JSON.stringify(pkgJson)
		const bannedManifestTokens = [
			'./dom',
			'./themes/mui',
			'./themes/stylex',
			'./styles/mui',
			'./styles/stylex',
			'@mui/material',
			'@stylexjs/stylex',
			'@dnd-kit/',
			'@radix-ui/',
			'lucide-react',
			'class-variance-authority',
			'tailwind-merge',
			'@ilamy/core',
			'@ilamy/dom',
			'@ilamy/ui',
			'@ilamy/utils',
			'@ilamy/types',
		]
		for (const token of bannedManifestTokens) {
			expect(pkgRaw).not.toContain(token)
		}
		for (const file of distFiles) {
			const content = readFileSync(file, 'utf8')
			expect(content, file).not.toContain('@mui/material')
			expect(content, file).not.toContain('@stylexjs/stylex')
			expect(content, file).not.toContain('@dnd-kit/')
			expect(content, file).not.toContain('@radix-ui/')
			expect(content, file).not.toContain('lucide-react')
			expect(content, file).not.toContain('class-variance-authority')
			expect(content, file).not.toContain('tailwind-merge')
		}
	})

	it('preserves CalendarEvent declaration merging in dist/plugins/recurrence.d.ts', () => {
		const recurrenceDts = readFileSync(
			resolve(DIST_DIR, 'plugins/recurrence.d.ts'),
			'utf8'
		)
		expect(recurrenceDts).toContain("declare module '@ilamy/calendar'")
	})

	it('moves rrule out of dependencies and restricts rrule imports exclusively to recurrence plugin', () => {
		expect(pkgJson.dependencies).not.toHaveProperty('rrule')
		expect(pkgJson.peerDependencies).toHaveProperty('rrule')
		expect(pkgJson.peerDependenciesMeta?.rrule?.optional).toBe(true)

		const nonRecurrenceEntries = [
			'dist/index.js',
			'dist/adapters/react.js',
			'dist/adapters/vue.js',
			'dist/adapters/svelte.js',
			'dist/adapters/solid.js',
			'dist/adapters/angular.js',
			'dist/plugins/agenda.js',
			'dist/plugins/year.js',
			'dist/plugins/ical.js',
			'dist/plugins/drag-to-create.js',
		]
		for (const file of nonRecurrenceEntries) {
			const code = readFileSync(resolve(PKG_ROOT, file), 'utf8')
			expect(code, `Unexpected rrule reference in ${file}`).not.toMatch(
				/['"]rrule['"]/
			)
		}

		const sharedDir = resolve(PKG_ROOT, 'dist/shared')
		if (existsSync(sharedDir)) {
			for (const name of readdirSync(sharedDir)) {
				if (!name.endsWith('.js')) continue
				const code = readFileSync(resolve(sharedDir, name), 'utf8')
				expect(code, `Unexpected rrule in shared chunk ${name}`).not.toMatch(
					/['"]rrule['"]/
				)
			}
		}

		const recurrenceJs = readFileSync(
			resolve(PKG_ROOT, 'dist/plugins/recurrence.js'),
			'utf8'
		)
		expect(recurrenceJs).toMatch(/['"]rrule['"]/)

		const coreDts = readFileSync(resolve(PKG_ROOT, 'dist/index.d.ts'), 'utf8')
		expect(coreDts).not.toMatch(/['"]rrule['"]/)
	})

	it('emits zero React dependencies from framework-agnostic plugins', () => {
		const pluginFiles = [
			'dist/plugins/agenda.js',
			'dist/plugins/year.js',
			'dist/plugins/ical.js',
			'dist/plugins/drag-to-create.js',
			'dist/plugins/recurrence.js',
		]
		for (const file of pluginFiles) {
			const code = readFileSync(resolve(PKG_ROOT, file), 'utf8')
			expect(code, `Unexpected React import in ${file}`).not.toMatch(
				/['"](react|react-dom|@ilamy\/calendar\/react)['"]/
			)
		}
	})

	it('imports every built JS entry safely in a zero-DOM server subprocess (SSR)', () => {
		const entries = Object.entries(pkgJson.exports)
			.filter(([, target]) => typeof target === 'object' && target.import)
			.map(([, target]) =>
				resolve(PKG_ROOT, (target as { import: string }).import)
			)

		const script = `
if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  throw new Error('Expected zero DOM globals during SSR import smoke check');
}
const entries = ${JSON.stringify(entries)};
for (const entry of entries) {
  await import(entry);
}
console.log('SSR_OK:' + entries.length);
`
		const proc = Bun.spawnSync(['bun', '-e', script], {
			cwd: REPO_ROOT,
			stdout: 'pipe',
			stderr: 'pipe',
		})
		expect(proc.exitCode, proc.stderr.toString('utf8')).toBe(0)
		expect(proc.stdout.toString('utf8')).toContain(`SSR_OK:${entries.length}`)
	})

	it('resolves and imports every declared package subpath specifier and rejects removed subpaths', () => {
		const jsSubpaths = Object.entries(pkgJson.exports)
			.filter(([, target]) => typeof target === 'object' && target.import)
			.map(([subpath]) =>
				subpath === '.'
					? '@ilamy/calendar'
					: `@ilamy/calendar/${subpath.slice(2)}`
			)
		const cssSubpaths = Object.entries(pkgJson.exports)
			.filter(([, target]) => typeof target === 'string')
			.map(([subpath]) => `@ilamy/calendar/${subpath.slice(2)}`)
		const removedSubpaths = [
			'@ilamy/calendar/dom',
			'@ilamy/calendar/styles/mui',
			'@ilamy/calendar/styles/stylex',
			'@ilamy/calendar/themes/mui',
			'@ilamy/calendar/themes/stylex',
		]

		const script = `
const jsSubpaths = ${JSON.stringify(jsSubpaths)};
const cssSubpaths = ${JSON.stringify(cssSubpaths)};
const removedSubpaths = ${JSON.stringify(removedSubpaths)};

for (const spec of jsSubpaths) {
  const mod = await import(spec);
  if (!mod || Object.keys(mod).length === 0) {
    throw new Error('Expected non-empty exports for ' + spec);
  }
}

for (const spec of cssSubpaths) {
  const resolved = Bun.resolveSync(spec, process.cwd());
  if (!resolved.endsWith('.css')) {
    throw new Error('Expected CSS path for ' + spec + ', got ' + resolved);
  }
}

for (const spec of removedSubpaths) {
  let threw = false;
  try {
    Bun.resolveSync(spec, process.cwd());
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error('Expected removed subpath to fail resolution: ' + spec);
  }
}

console.log('SUBPATH_OK:' + jsSubpaths.length + ':' + cssSubpaths.length);
`
		const proc = Bun.spawnSync(['bun', '-e', script], {
			cwd: resolve(REPO_ROOT, 'apps/demo'),
			stdout: 'pipe',
			stderr: 'pipe',
		})
		expect(proc.exitCode, proc.stderr.toString('utf8')).toBe(0)
		expect(proc.stdout.toString('utf8')).toContain(
			`SUBPATH_OK:${jsSubpaths.length}:${cssSubpaths.length}`
		)
	})
})
