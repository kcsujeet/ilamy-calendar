/**
 * Gzipped size of the built package's JS: usage `bun scripts/bundle-size.ts <repo-root> <label>`.
 *
 * Reports each entry alone and each entry together with the shared chunks it
 * statically imports (what a consumer importing only that entry downloads), plus
 * the total of every JS file in dist. gzip level 9, the usual "gzipped size".
 */
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const [repoRoot, label] = process.argv.slice(2)
if (!repoRoot || !label) {
	throw new Error('usage: bun scripts/bundle-size.ts <repo-root> <label>')
}
const dist = resolve(repoRoot, 'packages/calendar/dist')

const listJs = (directory: string): string[] =>
	readdirSync(directory).flatMap((name) => {
		const path = join(directory, name)
		if (statSync(path).isDirectory()) {
			// `testing/` is the test harness, not something a consumer ships.
			return name === 'testing' ? [] : listJs(path)
		}
		return name.endsWith('.js') ? [path] : []
	})

const gzipBytes = (path: string) =>
	gzipSync(readFileSync(path), { level: 9 }).length
const rawBytes = (path: string) => statSync(path).size

const STATIC_IMPORT =
	/(?:import|export)\s*(?:[^'"()]*?from\s*)?["'](\.[^"']+)["']/g

/** The file plus every relative file it statically imports, recursively. */
const closure = (entry: string, seen = new Set<string>()): Set<string> => {
	if (seen.has(entry)) {
		return seen
	}
	seen.add(entry)
	const source = readFileSync(entry, 'utf8')
	for (const match of source.matchAll(STATIC_IMPORT)) {
		closure(resolve(dirname(entry), match[1]), seen)
	}
	return seen
}

const sumGzip = (files: Iterable<string>) =>
	[...files].reduce((total, file) => total + gzipBytes(file), 0)

const files = listJs(dist)
const chunks = files.filter((file) => relative(dist, file).startsWith('shared'))
const entries = [
	'index.js',
	'plugins/recurrence.js',
	'plugins/agenda.js',
	'plugins/drag-to-create.js',
]

const report = {
	label,
	entries: Object.fromEntries(
		entries.map((entry) => {
			const path = join(dist, entry)
			return [
				entry,
				{
					gzipAlone: gzipBytes(path),
					rawAlone: rawBytes(path),
					gzipWithChunks: sumGzip(closure(path)),
				},
			]
		})
	),
	sharedChunks: {
		files: chunks.map((file) => relative(dist, file)),
		gzipTotal: sumGzip(chunks),
	},
	allJsGzipSummed: sumGzip(files),
}

const outFile = resolve('results', `bundle-${label}.json`)
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
