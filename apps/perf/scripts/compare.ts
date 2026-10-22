/**
 * Builds the markdown report from results/main.json and results/stack.json
 * (and results/bundle-*.json): `bun scripts/compare.ts`.
 *
 * Two questions, kept apart:
 *   1. Budget: does a build meet the absolute budgets (RAIL / INP)? PASS or FAIL.
 *   2. Delta: is the stack slower than main? Flagged when worse by >10% AND >5 ms.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Rep } from '../tests/perf.spec'

const RESULTS = resolve(process.env.PERF_OUT ?? 'results')

interface ResultsFile {
	label: string
	browser: string
	cpuCores: number
	reps: number
	runs: Record<string, Record<string, Rep[]>>
}

const load = (label: string): ResultsFile | undefined => {
	const path = resolve(RESULTS, `${label}.json`)
	return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined
}

const main = load('main')
const stack = load('stack')
if (!(main && stack)) {
	throw new Error('need results/main.json and results/stack.json')
}

type Throttle = '1' | '4'

/*
 * Budgets, owner-set. Sources:
 *   RAIL  https://web.dev/articles/rail   (frame in 10 ms, absolute max 16 ms; respond/transition in 100 ms; idle chunks <= 50 ms)
 *   INP   https://web.dev/articles/inp    ("good" is 200 ms or less)
 */
type Budget =
	| { kind: 'none' }
	| { kind: 'max'; at1: number; at4: number }
	| { kind: 'noLongTask' }

interface RowSpec {
	interaction: string
	metric: string
	/** The statistic compared and judged: the median for mount, p90 elsewhere. */
	stat: 'median' | 'p90' | 'max'
	budget: Budget
	/** Samples this rep contributes. */
	samples: (rep: Rep) => number[]
}

const DISCRETE: Budget = { kind: 'max', at1: 100, at4: 200 }
const FRAME_JS: Budget = { kind: 'max', at1: 10, at4: 16 }
const FRAME_ALL: Budget = { kind: 'max', at1: 16, at4: 16 }

const finite = (values: Array<number | undefined>) =>
	values.filter(
		(value): value is number =>
			typeof value === 'number' && Number.isFinite(value)
	)

const longTasks = (...spans: Array<{ longTasksMs?: number[] } | undefined>) =>
	spans.flatMap((span) => span?.longTasksMs ?? [])

/** An interaction that errored has no long-task data; reading it as 0 would pass it. */
const hasSpan = (span: { longTasksMs?: number[] } | undefined) =>
	Array.isArray(span?.longTasksMs)

const rows: RowSpec[] = [
	{
		interaction: 'mount',
		metric: 'first stable paint',
		stat: 'median',
		budget: { kind: 'none' },
		samples: (rep) => finite([rep.mount?.ms]),
	},
	{
		interaction: 'next/prev x10',
		metric: 'input to paint',
		stat: 'p90',
		budget: DISCRETE,
		samples: (rep) => finite(rep.nav?.paintMs ?? []),
	},
	{
		interaction: 'view switch',
		metric: 'input to paint',
		stat: 'p90',
		budget: DISCRETE,
		samples: (rep) => finite(rep.viewSwitch?.paintMs ?? []),
	},
	{
		interaction: 'open event form',
		metric: 'input to paint',
		stat: 'p90',
		budget: DISCRETE,
		samples: (rep) => finite(rep.formOpen?.paintMs ?? []),
	},
	{
		interaction: 'drop commit',
		metric: 'input to paint',
		stat: 'p90',
		budget: DISCRETE,
		samples: (rep) => finite([rep.drag?.dropMs]),
	},
	{
		interaction: 'resize commit',
		metric: 'input to paint',
		stat: 'p90',
		budget: DISCRETE,
		samples: (rep) => finite([rep.resize?.commitMs]),
	},
	{
		interaction: 'drag-over steps',
		metric: 'JS per step',
		stat: 'p90',
		budget: FRAME_JS,
		samples: (rep) => finite(rep.drag?.steps?.map((step) => step.jsMs) ?? []),
	},
	{
		interaction: 'drag-over steps',
		metric: 'main-thread task per step',
		stat: 'p90',
		budget: FRAME_ALL,
		samples: (rep) => finite(rep.drag?.steps?.map((step) => step.taskMs) ?? []),
	},
	{
		interaction: 'resize steps',
		metric: 'JS per step',
		stat: 'p90',
		budget: FRAME_JS,
		samples: (rep) => finite(rep.resize?.steps?.map((step) => step.jsMs) ?? []),
	},
	{
		interaction: 'resize steps',
		metric: 'main-thread task per step',
		stat: 'p90',
		budget: FRAME_ALL,
		samples: (rep) =>
			finite(rep.resize?.steps?.map((step) => step.taskMs) ?? []),
	},
	{
		interaction: 'auto-scroll frames',
		metric: 'JS per frame',
		stat: 'p90',
		budget: FRAME_JS,
		samples: (rep) =>
			finite(rep.autoscroll?.held?.map((held) => held.jsMsPerFrame) ?? []),
	},
	{
		interaction: 'auto-scroll frames',
		metric: 'main-thread task per frame',
		stat: 'p90',
		budget: FRAME_ALL,
		samples: (rep) =>
			finite(rep.autoscroll?.held?.map((held) => held.taskMsPerFrame) ?? []),
	},
	{
		interaction: 'any continuous drag',
		metric: 'longest task (>50 ms)',
		stat: 'max',
		budget: { kind: 'noLongTask' },
		samples: (rep) =>
			hasSpan(rep.drag) || hasSpan(rep.resize) || hasSpan(rep.autoscroll)
				? [Math.max(0, ...longTasks(rep.drag, rep.resize, rep.autoscroll))]
				: [],
	},
]

const sortedNumbers = (values: number[]) => [...values].sort((a, b) => a - b)

const median = (values: number[]) => {
	const sorted = sortedNumbers(values)
	const middle = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 1
		? sorted[middle]
		: (sorted[middle - 1] + sorted[middle]) / 2
}

/** Nearest-rank percentile. */
const percentile = (values: number[], fraction: number) => {
	const sorted = sortedNumbers(values)
	return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)]
}

const stdev = (values: number[]) => {
	const mean = values.reduce((a, b) => a + b, 0) / values.length
	return Math.sqrt(
		values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
	)
}

interface Cell {
	n: number
	median: number
	p90: number
	min: number
	max: number
	/** Coefficient of variation of the per-repetition medians: how much reps disagree. */
	repCv: number
	judged: number
	errors: string[]
}

const repErrors = (rep: Rep): string[] =>
	Object.values(rep)
		.map((part) => (part as { error?: string } | undefined)?.error)
		.filter((message): message is string => Boolean(message))

const cellFor = (reps: Rep[] | undefined, spec: RowSpec): Cell | undefined => {
	if (!reps) {
		return undefined
	}
	const perRep = reps.map((rep) => spec.samples(rep))
	const pooled = perRep.flat()
	if (pooled.length === 0) {
		return undefined
	}
	const repMedians = perRep.filter((samples) => samples.length > 0).map(median)
	const repMean = repMedians.reduce((a, b) => a + b, 0) / repMedians.length
	const stats = {
		median: median(pooled),
		p90: percentile(pooled, 0.9),
		max: Math.max(...pooled),
	}
	return {
		n: pooled.length,
		...stats,
		min: Math.min(...pooled),
		repCv:
			repMean > 0 && repMedians.length > 1 ? stdev(repMedians) / repMean : 0,
		judged: stats[spec.stat],
		errors: [...new Set(reps.flatMap(repErrors))],
	}
}

const fmt = (value: number) =>
	value >= 100 ? value.toFixed(0) : value.toFixed(1)

type Verdict = { text: string; over: number | undefined }

const judge = (
	cell: Cell | undefined,
	spec: RowSpec,
	throttle: Throttle
): Verdict => {
	if (!cell) {
		return { text: 'n/a', over: undefined }
	}
	if (spec.budget.kind === 'none') {
		const isSlowMount = throttle === '4' && cell.judged > 1000
		return {
			text: isSlowMount ? 'SLOW (>1000 ms)' : '-',
			over: isSlowMount ? cell.judged - 1000 : undefined,
		}
	}
	if (spec.budget.kind === 'noLongTask') {
		if (throttle === '4') {
			return { text: '-', over: undefined }
		}
		return cell.judged > 0
			? { text: 'FAIL', over: cell.judged - 50 }
			: { text: 'PASS', over: undefined }
	}
	const limit = throttle === '1' ? spec.budget.at1 : spec.budget.at4
	return cell.judged > limit
		? { text: 'FAIL', over: cell.judged - limit }
		: { text: 'PASS', over: undefined }
}

const budgetText = (spec: RowSpec, throttle: Throttle) => {
	if (spec.budget.kind === 'none') {
		return throttle === '4' ? 'flag >1000' : '-'
	}
	if (spec.budget.kind === 'noLongTask') {
		return throttle === '1' ? 'none >50' : '-'
	}
	return `<= ${throttle === '1' ? spec.budget.at1 : spec.budget.at4}`
}

const cellText = (cell: Cell | undefined) =>
	cell
		? `${fmt(cell.median)} / ${fmt(cell.p90)} (${fmt(cell.min)}-${fmt(cell.max)})`
		: 'n/a'

interface Line {
	scenario: string
	spec: RowSpec
	throttle: Throttle
	mainCell?: Cell
	stackCell?: Cell
	mainVerdict: Verdict
	stackVerdict: Verdict
	delta?: number
	deltaPct?: number
	flag: string
}

const lines: Line[] = []
const scenarios = Object.keys(stack.runs)
for (const scenario of scenarios) {
	for (const throttle of ['1', '4'] as Throttle[]) {
		for (const spec of rows) {
			const mainCell = cellFor(main.runs[scenario]?.[throttle], spec)
			const stackCell = cellFor(stack.runs[scenario]?.[throttle], spec)
			if (!(mainCell || stackCell)) {
				continue
			}
			const delta =
				mainCell && stackCell ? stackCell.judged - mainCell.judged : undefined
			const deltaPct =
				mainCell && stackCell && mainCell.judged > 0 && delta !== undefined
					? (delta / mainCell.judged) * 100
					: undefined
			let flag = ''
			if (delta !== undefined && deltaPct !== undefined) {
				if (delta > 5 && deltaPct > 10) {
					flag = 'WORSE'
				} else if (delta < -5 && deltaPct < -10) {
					flag = 'better'
				}
			}
			lines.push({
				scenario,
				spec,
				throttle,
				mainCell,
				stackCell,
				mainVerdict: judge(mainCell, spec, throttle),
				stackVerdict: judge(stackCell, spec, throttle),
				delta,
				deltaPct,
				flag,
			})
		}
	}
}

const out: string[] = []
const emit = (text = '') => out.push(text)

emit(
	'# ilamy-calendar runtime benchmark: main (v3.2.1) vs stack (roadmap/3.3-ref-api)'
)
emit()
emit(
	`Browser ${stack.browser}; ${stack.cpuCores} CPU cores; ${stack.reps} repetitions per scenario x throttle. Cells are \`median / p90 (min-max)\` in ms over every sample pooled across repetitions. The judged statistic is the median for mount and p90 for everything else (that is what the budgets and the delta use). "rep CV" is how much the per-repetition medians disagree.`
)
emit()
emit(
	'Delta flag: WORSE when the stack is slower by more than 10% AND more than 5 ms; better is the mirror. Budget verdicts are absolute and judged independently for each build.'
)
emit()
emit(
	'| scenario | interaction | metric | throttle | main med / p90 (min-max) | stack med / p90 (min-max) | delta ms | delta % | flag | budget | main | stack | stack rep CV | reps main/stack |'
)
emit('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const line of lines) {
	const delta =
		line.delta === undefined
			? '-'
			: `${line.delta >= 0 ? '+' : ''}${fmt(line.delta)}`
	const pct =
		line.deltaPct === undefined
			? '-'
			: `${line.deltaPct >= 0 ? '+' : ''}${line.deltaPct.toFixed(0)}%`
	const cv = line.stackCell
		? `${(line.stackCell.repCv * 100).toFixed(0)}%`
		: '-'
	emit(
		`| ${line.scenario} | ${line.spec.interaction} | ${line.spec.metric} | ${line.throttle}x | ${cellText(line.mainCell)} | ${cellText(line.stackCell)} | ${delta} | ${pct} | ${line.flag} | ${budgetText(line.spec, line.throttle)} | ${line.mainVerdict.text} | ${line.stackVerdict.text} | ${cv} | ${main.runs[line.scenario]?.[line.throttle]?.length ?? 0}/${stack.runs[line.scenario]?.[line.throttle]?.length ?? 0} |`
	)
}

const label = (line: Line) =>
	`${line.scenario} / ${line.spec.interaction} (${line.spec.metric}) @ ${line.throttle}x`

emit()
emit('## Stack budget FAILs, ranked by ms over budget')
emit()
emit('| # | row | stack | over budget (ms) | main also fails? |')
emit('|---|---|---|---|---|')
const fails = lines
	.filter(
		(line) =>
			line.stackVerdict.text === 'FAIL' ||
			line.stackVerdict.text.startsWith('SLOW')
	)
	.sort((a, b) => (b.stackVerdict.over ?? 0) - (a.stackVerdict.over ?? 0))
fails.forEach((line, index) => {
	const mainFails =
		line.mainVerdict.text === 'FAIL' || line.mainVerdict.text.startsWith('SLOW')
	const mainNote = line.mainCell
		? mainFails
			? `yes (+${fmt(line.mainVerdict.over ?? 0)})`
			: 'no'
		: 'no main data (main has no resize, or its run timed out)'
	emit(
		`| ${index + 1} | ${label(line)} | ${line.stackCell ? fmt(line.stackCell.judged) : '-'} | +${fmt(line.stackVerdict.over ?? 0)} | ${mainNote} |`
	)
})

const withDelta = lines.filter((line) => line.delta !== undefined)
emit()
emit('## Top 10 regressions by absolute ms (stack minus main)')
emit()
for (const line of [...withDelta]
	.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
	.slice(0, 10)) {
	emit(
		`- ${label(line)}: ${fmt(line.mainCell?.judged ?? 0)} -> ${fmt(line.stackCell?.judged ?? 0)} ms (${(line.delta ?? 0) >= 0 ? '+' : ''}${fmt(line.delta ?? 0)}, ${(line.deltaPct ?? 0).toFixed(0)}%)`
	)
}
emit()
emit('## Top 5 improvements by absolute ms')
emit()
for (const line of [...withDelta]
	.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
	.slice(0, 5)) {
	emit(
		`- ${label(line)}: ${fmt(line.mainCell?.judged ?? 0)} -> ${fmt(line.stackCell?.judged ?? 0)} ms (${fmt(line.delta ?? 0)}, ${(line.deltaPct ?? 0).toFixed(0)}%)`
	)
}

/* ---- noise ---- */
const noisy = lines.filter(
	(line) => line.stackCell && line.stackCell.repCv > 0.15
)
emit()
emit('## Noise')
emit()
emit(
	`${noisy.length} of ${lines.length} stack rows have a rep-to-rep coefficient of variation above 15%. Treat a delta smaller than the rows' own min-max spread as noise.`
)
for (const line of noisy.slice(0, 30)) {
	emit(
		`- ${label(line)}: CV ${((line.stackCell?.repCv ?? 0) * 100).toFixed(0)}%`
	)
}

/* ---- detail: commits and CDP ---- */
const spanOf = (
	rep: Rep,
	name:
		| 'mount'
		| 'nav'
		| 'viewSwitch'
		| 'formOpen'
		| 'drag'
		| 'resize'
		| 'autoscroll'
) => rep[name]

const detail = (
	file: ResultsFile,
	scenario: string,
	throttle: Throttle,
	name: Parameters<typeof spanOf>[1]
) => {
	const spans = (file.runs[scenario]?.[throttle] ?? [])
		.map((rep) => spanOf(rep, name))
		.filter((span) => span && 'cdp' in span && span.cdp)
	if (spans.length === 0) {
		return undefined
	}
	const med = (pick: (span: NonNullable<(typeof spans)[number]>) => number) =>
		median(
			spans.map((span) => pick(span as NonNullable<(typeof spans)[number]>))
		)
	return {
		commits: med((span) => span.commits),
		actualMs: med((span) => span.actualMs),
		script: med((span) => span.cdp.scriptMs),
		layout: med((span) => span.cdp.layoutMs),
		recalc: med((span) => span.cdp.recalcMs),
		task: med((span) => span.cdp.taskMs),
		heapMb: med((span) => span.cdp.heapDeltaBytes / 1e6),
	}
}

emit()
emit(
	'## Detail: React commits and CDP deltas per interaction (median over repetitions; main -> stack)'
)
emit()
emit(
	'Commits and `actualDuration` come from the React Profiler; Script/Layout/RecalcStyle/Task are `Performance.getMetrics` deltas over the whole interaction (all 10 navigations, all steps, ...). Heap is JSHeapUsedSize change in MB (GC makes it noisy).'
)
emit()
emit(
	'| scenario | interaction | throttle | commits | actualDuration ms | Script ms | Layout ms | RecalcStyle ms | Task ms | heap MB |'
)
emit('|---|---|---|---|---|---|---|---|---|---|')
const pair = (a: number | undefined, b: number | undefined) =>
	`${a === undefined ? '-' : fmt(a)} -> ${b === undefined ? '-' : fmt(b)}`
for (const scenario of scenarios) {
	for (const throttle of ['1', '4'] as Throttle[]) {
		for (const name of [
			'mount',
			'nav',
			'viewSwitch',
			'formOpen',
			'drag',
			'resize',
			'autoscroll',
		] as const) {
			const before = detail(main, scenario, throttle, name)
			const after = detail(stack, scenario, throttle, name)
			if (!(before || after)) {
				continue
			}
			emit(
				`| ${scenario} | ${name} | ${throttle}x | ${pair(before?.commits, after?.commits)} | ${pair(before?.actualMs, after?.actualMs)} | ${pair(before?.script, after?.script)} | ${pair(before?.layout, after?.layout)} | ${pair(before?.recalc, after?.recalc)} | ${pair(before?.task, after?.task)} | ${pair(before?.heapMb, after?.heapMb)} |`
			)
		}
	}
}

/* ---- errors / not measured ---- */
emit()
emit('## Interactions that errored or were not measured')
emit()
for (const file of [main, stack]) {
	for (const [scenario, byThrottle] of Object.entries(file.runs)) {
		for (const [throttle, reps] of Object.entries(byThrottle)) {
			const errors = [...new Set(reps.flatMap(repErrors))]
			const skippedResize = reps.every((rep) => rep.resize === undefined)
			if (errors.length > 0) {
				emit(
					`- ${file.label} / ${scenario} @ ${throttle}x: ${errors.join('; ')}`
				)
			}
			if (skippedResize && throttle === '1') {
				emit(
					`- ${file.label} / ${scenario}: resize not measured (no resize handle in this build, or the scenario has none)`
				)
			}
		}
	}
}

/* ---- bundle ---- */
const loadBundle = (labelName: string) => {
	const path = resolve(RESULTS, `bundle-${labelName}.json`)
	return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined
}
const bundleMain = loadBundle('main')
const bundleStack = loadBundle('stack')
if (bundleMain && bundleStack) {
	emit()
	emit('## Bundle size (gzip level 9, bytes)')
	emit()
	emit(
		'"with chunks" is the entry plus every shared chunk it statically imports: what a consumer of only that entry downloads.'
	)
	emit()
	emit(
		'| entry | main alone | stack alone | main with chunks | stack with chunks | delta with chunks |'
	)
	emit('|---|---|---|---|---|---|')
	for (const entry of Object.keys(bundleStack.entries)) {
		const before = bundleMain.entries[entry]
		const after = bundleStack.entries[entry]
		const diff = before
			? after.gzipWithChunks - before.gzipWithChunks
			: undefined
		const pct =
			before && diff !== undefined
				? ` (${((diff / before.gzipWithChunks) * 100).toFixed(1)}%)`
				: ''
		emit(
			`| ${entry} | ${before?.gzipAlone ?? '-'} | ${after.gzipAlone} | ${before?.gzipWithChunks ?? '-'} | ${after.gzipWithChunks} | ${diff === undefined ? '-' : `${diff >= 0 ? '+' : ''}${diff}${pct}`} |`
		)
	}
	emit(
		`| shared chunks (total) | ${bundleMain.sharedChunks.gzipTotal} | ${bundleStack.sharedChunks.gzipTotal} | | | |`
	)
	emit(
		`| all dist JS, gzip summed | ${bundleMain.allJsGzipSummed} | ${bundleStack.allJsGzipSummed} | | | |`
	)
}

writeFileSync(resolve(RESULTS, 'comparison.md'), `${out.join('\n')}\n`)
console.log(out.join('\n'))
