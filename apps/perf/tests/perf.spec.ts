import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname, resolve } from 'node:path'
import {
	type Browser,
	type CDPSession,
	type Page,
	test,
} from '@playwright/test'
import { type Plan, plans, SUBJECT_ID } from '../src/plan'
import type { PerfProbe } from '../src/probe'

/*
 * Runtime benchmark. Drives the production perf app with real pointer input
 * and records, per scenario, CPU throttle and repetition:
 *
 *   - mount, next/prev x10, view switches, opening the event form
 *   - a drag across ~10 cells, its drop commit, a resize and its commit, and a
 *     drag held at the container edge so it auto-scrolls
 *   - React commits and <Profiler> actualDuration per interaction
 *   - Chrome DevTools Protocol `Performance.getMetrics` deltas
 *   - `longtask` entries
 *
 * Docs read for this file:
 *   Playwright CDPSession   https://playwright.dev/docs/api/class-cdpsession
 *   CDP Performance domain  https://chromedevtools.github.io/devtools-protocol/tot/Performance/
 *   CDP CPU throttling      https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate
 *   Long Tasks API          https://developer.mozilla.org/docs/Web/API/PerformanceLongTaskTiming
 *   React <Profiler>        https://react.dev/reference/react/Profiler
 *
 * Environment: PERF_LABEL (results file name), PERF_REPS (default 5),
 * PERF_SCENARIOS (comma separated ids), PERF_THROTTLES (default "1,4"),
 * PERF_OUT (results directory).
 */

const LABEL = process.env.PERF_LABEL ?? 'stack'
const REPS = Number(process.env.PERF_REPS ?? 5)
const THROTTLES = (process.env.PERF_THROTTLES ?? '1,4').split(',').map(Number)
const ONLY = process.env.PERF_SCENARIOS?.split(',')
/** Time one scenario x throttle may spend on repetitions (PERF_CELL_BUDGET_MIN); at least one always runs. */
const CELL_BUDGET_MS = Number(process.env.PERF_CELL_BUDGET_MIN ?? 10) * 60_000
/** PERF_INTERACTIONS (comma separated rep keys, e.g. "nav"): run only these after the mount. Default: all. */
const INTERACTIONS = process.env.PERF_INTERACTIONS?.split(',')
const OUT_FILE = resolve(process.env.PERF_OUT ?? 'results', `${LABEL}.json`)

/** Pointer steps while dragging, and the number of 100 ms windows an auto-scroll is held for. */
const DRAG_STEPS = 20
const RESIZE_STEPS = 12
const HOLD_WINDOWS = 20
const HOLD_WINDOW_MS = 100
const NAVIGATIONS = 10
/** Headers animate in over 500 ms (docs/e2e-testing.md); wait it out before measuring. */
const SETTLE_AFTER_MOUNT_MS = 900

export type { PerfProbe }

interface Cdp {
	scriptMs: number
	layoutMs: number
	recalcMs: number
	taskMs: number
	heapDeltaBytes: number
}

interface Span {
	commits: number
	actualMs: number
	cdp: Cdp
	/** Durations of every long task that began inside the span. */
	longTasksMs: number[]
}

interface Step {
	/** Input -> next paint. */
	paintMs: number
	/** CDP ScriptDuration during the step: the JS work. */
	jsMs: number
	/** CDP TaskDuration during the step: all main-thread work. */
	taskMs: number
	commits: number
}

interface Held {
	frames: number
	jsMsPerFrame: number
	taskMsPerFrame: number
}

export interface Rep {
	mount?: Span & { ms: number; error?: string }
	nav?: Span & { paintMs: number[]; error?: string }
	viewSwitch?: Span & { paintMs: number[]; error?: string }
	formOpen?: Span & { paintMs: number[]; error?: string }
	drag?: Span & {
		steps: Step[]
		dropMs: number
		movedCells: number
		error?: string
	}
	resize?: Span & { steps: Step[]; commitMs: number; error?: string }
	autoscroll?: Span & { held: Held[]; scrolledPx: number; error?: string }
}

type Metrics = Record<string, number>

const readMetrics = async (cdp: CDPSession): Promise<Metrics> => {
	const { metrics } = await cdp.send('Performance.getMetrics')
	return Object.fromEntries(metrics.map((m) => [m.name, m.value]))
}

const readPage = (page: Page) =>
	page.evaluate(() => ({
		now: performance.now(),
		commits: window.__perf.commits,
		actualMs: window.__perf.actualMs,
		frames: window.__perf.frameCount,
	}))

const toMs = (seconds: number) => seconds * 1000

const cdpDelta = (before: Metrics, after: Metrics): Cdp => ({
	scriptMs: toMs(after.ScriptDuration - before.ScriptDuration),
	layoutMs: toMs(after.LayoutDuration - before.LayoutDuration),
	recalcMs: toMs(after.RecalcStyleDuration - before.RecalcStyleDuration),
	taskMs: toMs(after.TaskDuration - before.TaskDuration),
	heapDeltaBytes: after.JSHeapUsedSize - before.JSHeapUsedSize,
})

/** Runs `action` and reports the commits, CDP deltas and long tasks that fell inside it. */
const measureSpan = async <T>(
	page: Page,
	cdp: CDPSession,
	action: () => Promise<T>
): Promise<{ span: Span; result: T }> => {
	const [metricsBefore, pageBefore] = await Promise.all([
		readMetrics(cdp),
		readPage(page),
	])
	const result = await action()
	const [metricsAfter, pageAfter] = await Promise.all([
		readMetrics(cdp),
		readPage(page),
	])
	const longTasksMs = await page.evaluate(
		({ from, to }) =>
			window.__perf.longTasks
				.filter((task) => task.start >= from && task.start <= to)
				.map((task) => task.duration),
		{ from: pageBefore.now, to: pageAfter.now }
	)
	const span: Span = {
		commits: pageAfter.commits - pageBefore.commits,
		actualMs: pageAfter.actualMs - pageBefore.actualMs,
		cdp: cdpDelta(metricsBefore, metricsAfter),
		longTasksMs,
	}
	return { span, result }
}

const errorMessage = (error: unknown) =>
	error instanceof Error
		? (error.message.split('\n').at(0) ?? 'error')
		: 'error'

const barSelector = (plan: Plan, suffix = SUBJECT_ID) =>
	`[data-testid="${plan.bar}-event-${suffix}"]`

/**
 * Mount to first stable paint: from the app script starting to the subject bar
 * (or the year grid) being on screen and one frame having painted. Network and
 * parse time of the bundle are outside it. The CDP figures are cumulative since
 * navigation, so they include the bundle's own evaluation.
 */
const measureMount = async (page: Page, cdp: CDPSession, plan: Plan) => {
	const readySelector =
		plan.view === 'year' ? '[data-testid="year-view"]' : barSelector(plan)
	await page.goto(`/?s=${plan.id}`, { waitUntil: 'commit' })
	await page.waitForSelector(readySelector, { timeout: 600_000 })
	const paintedAt = await page.evaluate(() => window.__perf.settle())
	const [metrics, pageNow] = await Promise.all([
		readMetrics(cdp),
		readPage(page),
	])
	const scriptStart = await page.evaluate(() => window.__perf.scriptStart)
	const longTasksMs = await page.evaluate(() =>
		window.__perf.longTasks.map((task) => task.duration)
	)
	const fromZero: Metrics = {
		ScriptDuration: 0,
		LayoutDuration: 0,
		RecalcStyleDuration: 0,
		TaskDuration: 0,
		JSHeapUsedSize: 0,
	}
	return {
		ms: paintedAt - scriptStart,
		commits: pageNow.commits,
		actualMs: pageNow.actualMs,
		cdp: cdpDelta(fromZero, metrics),
		longTasksMs,
	}
}

const NAV_CLICK = async (label: string) => {
	const button = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)
	if (!button) {
		throw new Error(`no ${label} button`)
	}
	const titleBefore = document.querySelector(
		'[data-testid="calendar-title"]'
	)?.textContent
	button.click()
	const paintMs = await window.__perf.pending
	const titleAfter = document.querySelector(
		'[data-testid="calendar-title"]'
	)?.textContent
	return { paintMs, moved: titleBefore !== titleAfter }
}

const measureNav = async (page: Page, cdp: CDPSession) => {
	const { span, result } = await measureSpan(page, cdp, async () => {
		const paintMs: number[] = []
		for (let index = 0; index < NAVIGATIONS; index += 1) {
			const label = index % 2 === 0 ? 'Next' : 'Previous'
			const outcome = await page.evaluate(NAV_CLICK, label)
			if (!outcome.moved) {
				throw new Error(`${label} did not change the title`)
			}
			paintMs.push(outcome.paintMs)
			// One navigation at a time, like a person: let the frame finish.
			await page.waitForTimeout(150)
		}
		return paintMs
	})
	return { ...span, paintMs: result }
}

const SWITCH_VIEW = async (name: string) => {
	const radio = [
		...document.querySelectorAll<HTMLElement>('[role="radio"]'),
	].find((candidate) => candidate.textContent?.trim() === name)
	if (!radio) {
		throw new Error(`no ${name} view button`)
	}
	radio.click()
	return window.__perf.pending
}

const titleCase = (value: string) =>
	value.charAt(0).toUpperCase() + value.slice(1)

const measureViewSwitch = async (page: Page, cdp: CDPSession, plan: Plan) => {
	const { span, result } = await measureSpan(page, cdp, async () => {
		const paintMs: number[] = []
		for (const target of plan.switchTo) {
			for (const view of [target, plan.view]) {
				paintMs.push(await page.evaluate(SWITCH_VIEW, titleCase(view)))
				await page.waitForTimeout(300)
			}
		}
		return paintMs
	})
	return { ...span, paintMs: result }
}

/**
 * Arms a watcher inside the page before a real click: once the dialog is in the
 * DOM it waits for the next paint and reports click -> that paint. Armed first
 * so no Playwright round trip lands between the click and the measurement.
 */
const ARM_FORM_WATCH = () => {
	window.__formPaint = (async () => {
		const startedAt = performance.now()
		while (!document.querySelector('[role="dialog"]')) {
			if (performance.now() - startedAt > 20_000) {
				throw new Error('the event form never opened')
			}
			await new Promise((done) => requestAnimationFrame(done))
		}
		const paintedAt = await window.__perf.settle()
		return paintedAt - window.__perf.lastInputAt
	})()
	window.__formPaint.catch(() => undefined)
}

declare global {
	interface Window {
		__formPaint: Promise<number>
	}
}

const measureFormOpen = async (page: Page, cdp: CDPSession, plan: Plan) => {
	const point = await centre(page, barSelector(plan))
	const { span, result } = await measureSpan(page, cdp, async () => {
		await page.evaluate(ARM_FORM_WATCH)
		await page.mouse.move(point.x, point.y)
		await page.mouse.down()
		await page.mouse.up()
		return [await page.evaluate(() => window.__formPaint)]
	})
	await page.keyboard.press('Escape')
	await page.waitForSelector('[role="dialog"]', { state: 'detached' })
	return { ...span, paintMs: result }
}

interface Point {
	x: number
	y: number
}

/** The size of the grid cell under a point: what "10 cells" means in pixels. */
const cellSizeAt = (page: Page, point: Point) =>
	page.evaluate(({ x, y }) => {
		const cell = document
			.elementsFromPoint(x, y)
			.find((element) => element.getAttribute('data-testid')?.includes('cell'))
		const rect = cell?.getBoundingClientRect()
		return {
			width: rect?.width ?? 40,
			height: rect?.height ?? 24,
			found: Boolean(cell),
		}
	}, point)

const centre = async (page: Page, selector: string): Promise<Point> => {
	const locator = page.locator(selector).first()
	await locator.scrollIntoViewIfNeeded()
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error(`${selector} is not laid out`)
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const lerp = (from: Point, to: Point, fraction: number): Point => ({
	x: from.x + (to.x - from.x) * fraction,
	y: from.y + (to.y - from.y) * fraction,
})

/** Press at `start`, pass dnd-kit's activation distance, and return ready to step. */
const pressAndActivate = async (page: Page, start: Point, towards: Point) => {
	const distance = Math.hypot(towards.x - start.x, towards.y - start.y) || 1
	const direction = {
		x: (towards.x - start.x) / distance,
		y: (towards.y - start.y) / distance,
	}
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	for (const pixels of [5, 10, 15]) {
		await page.mouse.move(
			start.x + direction.x * pixels,
			start.y + direction.y * pixels
		)
	}
}

const stepTo = async (
	page: Page,
	cdp: CDPSession,
	point: Point
): Promise<Step> => {
	const [metricsBefore, pageBefore] = await Promise.all([
		readMetrics(cdp),
		readPage(page),
	])
	await page.mouse.move(point.x, point.y)
	const paintMs = await page.evaluate(() => window.__perf.pending)
	const [metricsAfter, pageAfter] = await Promise.all([
		readMetrics(cdp),
		readPage(page),
	])
	const delta = cdpDelta(metricsBefore, metricsAfter)
	return {
		paintMs,
		jsMs: delta.scriptMs,
		taskMs: delta.taskMs,
		commits: pageAfter.commits - pageBefore.commits,
	}
}

const releaseAndMeasure = async (page: Page) => {
	await page.mouse.up()
	return page.evaluate(() => window.__perf.pending)
}

/** The subject bar's first segment, wherever it is in the page (scrolled out of view or not). */
const rectOf = (page: Page, selector: string) =>
	page.evaluate((target) => {
		const rect = document.querySelector(target)?.getBoundingClientRect()
		return rect
			? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
			: undefined
	}, selector)

/**
 * A drag that did not move anything measures nothing: the interaction must have
 * had its effect or the rep is reported as an error rather than as a fast run.
 */
const expectAtLeast = (what: string, actual: number, expected: number) => {
	if (actual < expected * 0.3) {
		throw new Error(
			`${what}: moved ${actual.toFixed(0)}px of ${expected.toFixed(0)}px expected`
		)
	}
}

const measureDrag = async (page: Page, cdp: CDPSession, plan: Plan) => {
	const drag = plan.drag
	if (!drag) {
		return undefined
	}
	const selector = barSelector(plan)
	const start = await centre(page, selector)
	const cell = await cellSizeAt(page, start)
	const end = {
		x: start.x + drag.dx * cell.width,
		y: start.y + drag.dy * cell.height,
	}
	const before = await rectOf(page, selector)
	const { span, result } = await measureSpan(page, cdp, async () => {
		await pressAndActivate(page, start, end)
		const steps: Step[] = []
		for (let step = 1; step <= DRAG_STEPS; step += 1) {
			steps.push(await stepTo(page, cdp, lerp(start, end, step / DRAG_STEPS)))
		}
		const dropMs = await releaseAndMeasure(page)
		return { steps, dropMs }
	})
	await page.waitForTimeout(600)
	const after = await rectOf(page, selector)
	if (!(before && after)) {
		throw new Error('drag: the subject bar disappeared')
	}
	const movedPx = Math.hypot(after.x - before.x, after.y - before.y)
	expectAtLeast('drag', movedPx, Math.hypot(end.x - start.x, end.y - start.y))
	return {
		...span,
		...result,
		movedCells: Math.abs(drag.dx) + Math.abs(drag.dy),
	}
}

const measureResize = async (page: Page, cdp: CDPSession, plan: Plan) => {
	const resize = plan.resize
	if (!resize) {
		return undefined
	}
	const handleSelector = `${barSelector(plan)} [data-resize-handle="end"]`
	if ((await page.locator(handleSelector).count()) === 0) {
		return undefined
	}
	const start = await centre(page, handleSelector)
	const cell = await cellSizeAt(page, start)
	const end = {
		x: start.x + resize.dx * cell.width,
		y: start.y + resize.dy * cell.height,
	}
	const before = await rectOf(page, barSelector(plan))
	const { span, result } = await measureSpan(page, cdp, async () => {
		await pressAndActivate(page, start, end)
		const steps: Step[] = []
		for (let step = 1; step <= RESIZE_STEPS; step += 1) {
			steps.push(await stepTo(page, cdp, lerp(start, end, step / RESIZE_STEPS)))
		}
		const commitMs = await releaseAndMeasure(page)
		return { steps, commitMs }
	})
	await page.waitForTimeout(600)
	const after = await rectOf(page, barSelector(plan))
	if (!(before && after)) {
		throw new Error('resize: the subject bar disappeared')
	}
	const grewPx =
		Math.abs(after.width - before.width) +
		Math.abs(after.height - before.height)
	expectAtLeast('resize', grewPx, Math.hypot(end.x - start.x, end.y - start.y))
	return { ...span, ...result }
}

/** The nearest ancestor of the subject that scrolls vertically, as a rect plus its scrollTop. */
const FIND_SCROLLER = (selector: string) => {
	let node = document.querySelector<HTMLElement>(selector)?.parentElement
	while (node) {
		const overflowY = getComputedStyle(node).overflowY
		const scrolls = overflowY === 'auto' || overflowY === 'scroll'
		if (scrolls && node.scrollHeight > node.clientHeight + 50) {
			node.setAttribute('data-perf-scroller', 'true')
			const rect = node.getBoundingClientRect()
			return {
				bottom: Math.min(rect.bottom, window.innerHeight),
				scrollTop: node.scrollTop,
			}
		}
		node = node.parentElement
	}
	return undefined
}

const measureAutoscroll = async (page: Page, cdp: CDPSession, plan: Plan) => {
	if (!plan.autoscroll) {
		return undefined
	}
	const selector = barSelector(plan)
	const start = await centre(page, selector)
	const scroller = await page.evaluate(FIND_SCROLLER, selector)
	if (!scroller) {
		throw new Error('no vertical scroll container found')
	}
	const edge = { x: start.x, y: scroller.bottom - 6 }
	const { span, result } = await measureSpan(page, cdp, async () => {
		await pressAndActivate(page, start, edge)
		for (let step = 1; step <= 8; step += 1) {
			const point = lerp(start, edge, step / 8)
			await page.mouse.move(point.x, point.y)
		}
		const held: Held[] = []
		for (let window = 0; window < HOLD_WINDOWS; window += 1) {
			const [metricsBefore, pageBefore] = await Promise.all([
				readMetrics(cdp),
				readPage(page),
			])
			// A one pixel wobble keeps pointermove events flowing while dnd-kit scrolls on its own timer.
			await page.mouse.move(edge.x + (window % 2), edge.y)
			await page.waitForTimeout(HOLD_WINDOW_MS)
			const [metricsAfter, pageAfter] = await Promise.all([
				readMetrics(cdp),
				readPage(page),
			])
			const frames = pageAfter.frames - pageBefore.frames
			const delta = cdpDelta(metricsBefore, metricsAfter)
			if (frames > 0) {
				held.push({
					frames,
					jsMsPerFrame: delta.scriptMs / frames,
					taskMsPerFrame: delta.taskMs / frames,
				})
			}
		}
		return held
	})
	const scrollTop = await page.evaluate(
		() =>
			document.querySelector<HTMLElement>('[data-perf-scroller]')?.scrollTop ??
			0
	)
	await page.mouse.up()
	await page.waitForTimeout(500)
	return { ...span, held: result, scrolledPx: scrollTop - scroller.scrollTop }
}

const attempt = async <T>(
	run: () => Promise<T | undefined>
): Promise<(T & { error?: string }) | { error: string } | undefined> => {
	try {
		return (await run()) as T & { error?: string }
	} catch (error) {
		return { error: errorMessage(error) }
	}
}

const runs = (key: string) => !INTERACTIONS || INTERACTIONS.includes(key)

const runRep = async (
	browser: Browser,
	plan: Plan,
	throttle: number
): Promise<Rep> => {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		timezoneId: 'UTC',
		locale: 'en-US',
		colorScheme: 'light',
	})
	const page = await context.newPage()
	page.setDefaultTimeout(180_000)
	const cdp = await context.newCDPSession(page)
	await cdp.send('Performance.enable')
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })

	const rep: Rep = {}
	try {
		rep.mount = await measureMount(page, cdp, plan)
	} catch (error) {
		await context.close()
		return {
			mount: { ms: Number.NaN, error: errorMessage(error) } as Rep['mount'],
		}
	}
	await page.waitForTimeout(SETTLE_AFTER_MOUNT_MS)

	if (runs('nav')) {
		rep.nav = (await attempt(() => measureNav(page, cdp))) as Rep['nav']
	}
	if (runs('viewSwitch')) {
		rep.viewSwitch = (await attempt(() =>
			measureViewSwitch(page, cdp, plan)
		)) as Rep['viewSwitch']
	}
	if (runs('formOpen')) {
		rep.formOpen = (await attempt(() =>
			measureFormOpen(page, cdp, plan)
		)) as Rep['formOpen']
	}
	if (runs('resize')) {
		rep.resize = (await attempt(() =>
			measureResize(page, cdp, plan)
		)) as Rep['resize']
	}
	if (runs('drag')) {
		rep.drag = (await attempt(() =>
			measureDrag(page, cdp, plan)
		)) as Rep['drag']
	}
	if (runs('autoscroll')) {
		rep.autoscroll = (await attempt(() =>
			measureAutoscroll(page, cdp, plan)
		)) as Rep['autoscroll']
	}
	await context.close()
	return rep
}

interface ResultsFile {
	label: string
	startedAt: string
	reps: number
	browser: string
	cpuCores: number
	runs: Record<string, Record<string, Rep[]>>
}

const readResults = (browserVersion: string): ResultsFile => {
	if (existsSync(OUT_FILE)) {
		return JSON.parse(readFileSync(OUT_FILE, 'utf8'))
	}
	return {
		label: LABEL,
		startedAt: new Date().toISOString(),
		reps: REPS,
		browser: browserVersion,
		cpuCores: cpus().length,
		runs: {},
	}
}

const selected = plans.filter((plan) => !ONLY || ONLY.includes(plan.id))

for (const plan of selected) {
	for (const throttle of THROTTLES) {
		test(`${plan.id} @ ${throttle}x`, async ({ browser }) => {
			const reps: Rep[] = []
			const startedAt = Date.now()
			for (let index = 0; index < REPS; index += 1) {
				reps.push(await runRep(browser, plan, throttle))
				// A repetition of the heaviest scenarios takes minutes: stop once the
				// next one would not fit the cell's time budget. The count is kept in
				// the results, so a cell with fewer than REPS says so.
				const perRepMs = (Date.now() - startedAt) / reps.length
				if (perRepMs * (reps.length + 1) > CELL_BUDGET_MS) {
					break
				}
			}
			const results = readResults(browser.version())
			results.runs[plan.id] ??= {}
			results.runs[plan.id][String(throttle)] = reps
			mkdirSync(dirname(OUT_FILE), { recursive: true })
			writeFileSync(OUT_FILE, JSON.stringify(results))
		})
	}
}
