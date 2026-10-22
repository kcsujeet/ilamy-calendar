/**
 * Measures both builds and writes the comparison: `PERF_BASELINE=<dir> bun run perf:both`
 * (from apps/perf).
 *
 *   stack  = this checkout                      -> port 4501, results/stack.json
 *   main   = a git worktree of origin/main      -> port 4502, results/main.json
 *
 * PERF_BASELINE is where the baseline worktree lives. It must be OUTSIDE this
 * checkout; the script creates it if missing, copies apps/perf into it,
 * installs, builds, measures, and removes it afterwards.
 *
 *   PERF_KEEP_BASELINE=1  keep the baseline worktree for a re-run
 *   PERF_SKIP_BUILD=1     reuse existing builds
 *   PERF_FRESH=1          delete old results first
 *   PERF_ONLY=stack|main  measure only that build (the other's results file from an earlier run is reused)
 *   PERF_CONCURRENT=1     measure both builds at once (faster, but see below: it inflates both and not equally)
 *   PERF_REPS / PERF_SCENARIOS / PERF_THROTTLES / PERF_CELL_BUDGET_MIN
 *                         pass through to the specs
 */
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const perfDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const stackRoot = resolve(perfDir, '../..')
const baselineEnv = process.env.PERF_BASELINE
if (!baselineEnv) {
	throw new Error(
		'set PERF_BASELINE to a directory outside this checkout for the origin/main worktree'
	)
}
const baselineRoot = resolve(baselineEnv)
const resultsDir = resolve(perfDir, 'results')

const run = (
	command: string[],
	cwd: string,
	env: Record<string, string> = {}
) => {
	console.log(`\n$ (${cwd}) ${command.join(' ')}`)
	const [program, ...args] = command
	const result = spawnSync(program, args, {
		cwd,
		env: { ...process.env, ...env },
		stdio: 'inherit',
	})
	if (result.status !== 0) {
		throw new Error(`failed (${result.status}): ${command.join(' ')}`)
	}
}

const prepareBaseline = () => {
	if (!existsSync(baselineRoot)) {
		run(
			['git', 'worktree', 'add', '--detach', baselineRoot, 'origin/main'],
			stackRoot
		)
	}
	rmSync(resolve(baselineRoot, 'apps/perf'), { recursive: true, force: true })
	cpSync(resolve(stackRoot, 'apps/perf'), resolve(baselineRoot, 'apps/perf'), {
		recursive: true,
		filter: (source) =>
			!/\/(node_modules|dist|results|test-results)(\/|$)/.test(source),
	})
}

const build = (root: string) => {
	run(['bun', 'install'], root)
	run(['bun', 'run', 'build'], root)
	run(['bunx', 'vite', 'build'], resolve(root, 'apps/perf'))
}

const bundleSize = (root: string, label: string) =>
	run(['bun', 'scripts/bundle-size.ts', root, label], perfDir, {
		PERF_OUT: resultsDir,
	})

const startSpecs = (root: string, label: string, port: number) => {
	console.log(
		`\n$ (${root}/apps/perf) playwright test  [${label}, port ${port}]`
	)
	const child = spawn('bunx', ['playwright', 'test'], {
		cwd: resolve(root, 'apps/perf'),
		env: {
			...process.env,
			PERF_PORT: String(port),
			PERF_LABEL: label,
			PERF_OUT: resultsDir,
		},
		stdio: 'inherit',
	})
	return new Promise<number>((done) =>
		child.on('exit', (code) => done(code ?? 1))
	)
}

const only = process.env.PERF_ONLY
const withMain = only !== 'stack'
const withStack = only !== 'main'
mkdirSync(resultsDir, { recursive: true })
if (process.env.PERF_FRESH === '1') {
	for (const name of only ? [`${only}.json`] : ['main.json', 'stack.json']) {
		rmSync(resolve(resultsDir, name), { force: true })
	}
}
if (withMain) {
	prepareBaseline()
}
if (process.env.PERF_SKIP_BUILD !== '1') {
	if (withStack) {
		build(stackRoot)
	}
	if (withMain) {
		build(baselineRoot)
	}
}
if (withStack) {
	bundleSize(stackRoot, 'stack')
}
if (withMain) {
	bundleSize(baselineRoot, 'main')
}

/*
 * One build at a time by default. Measured together on an 18-core machine, a
 * build's own numbers were 20-35% worse than the same build measured alone
 * (week-500 next/prev p90 86 ms together vs 57 ms alone), so a comparison is
 * only fair when both builds ran under the same conditions. PERF_CONCURRENT=1
 * trades that for wall-clock time.
 */
let stackCode: number
let mainCode: number
if (!withMain) {
	stackCode = await startSpecs(stackRoot, 'stack', 4501)
	mainCode = 0
} else if (!withStack) {
	stackCode = 0
	mainCode = await startSpecs(baselineRoot, 'main', 4502)
} else if (process.env.PERF_CONCURRENT !== '1') {
	stackCode = await startSpecs(stackRoot, 'stack', 4501)
	mainCode = await startSpecs(baselineRoot, 'main', 4502)
} else {
	;[stackCode, mainCode] = await Promise.all([
		startSpecs(stackRoot, 'stack', 4501),
		startSpecs(baselineRoot, 'main', 4502),
	])
}
if (stackCode !== 0 || mainCode !== 0) {
	console.error(
		`a spec run failed: stack ${stackCode}, main ${mainCode} (results so far are kept)`
	)
}

run(['bun', 'scripts/compare.ts'], perfDir, { PERF_OUT: resultsDir })

if (withMain && process.env.PERF_KEEP_BASELINE !== '1') {
	run(['git', 'worktree', 'remove', '--force', baselineRoot], stackRoot)
}
