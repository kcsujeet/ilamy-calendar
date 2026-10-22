/**
 * Profiles the pointer steps of a drag, one CDP CPU profile per step, and splits
 * the steps into "crossing" steps (the pointer entered another cell, so React
 * committed twice) and plain steps. Prints self and inclusive time of the
 * crossing steps, and, in MODE=count, how many times each component rendered.
 *
 *   PERF_NO_MINIFY=1 bunx vite build --outDir dist-profile   (readable names)
 *   bunx vite preview --outDir dist-profile --port 4601 --strictPort &
 *   PORT=4601 SCENARIO=month-2000 MODE=profile bun scripts/profile-drag.ts
 *
 * MODE=profile : CPU profiles (sampling 100 us), no render counting
 * MODE=plain   : neither (just the CDP ScriptDuration of each step)
 * MODE=count   : React DevTools hook counts rendered components, no profiler
 * REPS (default 3), THROTTLE (default 1), OUT (JSON file for the result)
 */
import { writeFileSync } from 'node:fs'
import { chromium, type Page } from '@playwright/test'
import { plans } from '../src/plan'

const PORT = process.env.PORT ?? '4601'
const SCENARIO = process.env.SCENARIO ?? 'month-2000'
const MODE = process.env.MODE ?? 'profile'
const REPS = Number(process.env.REPS ?? 3)
const THROTTLE = Number(process.env.THROTTLE ?? 1)
const DRAG_STEPS = 20
const plan = plans.find((candidate) => candidate.id === SCENARIO)
if (!plan?.drag) {
	throw new Error(`no drag in ${SCENARIO}`)
}
const drag = plan.drag

interface Node {
	id: number
	callFrame: { functionName: string; url: string; lineNumber: number }
	children?: number[]
}
interface Profile {
	nodes: Node[]
	samples: number[]
	timeDeltas: number[]
}

const COUNT_HOOK = () => {
	const w = window as unknown as Record<string, unknown>
	w.__renderCounts = {}
	const nameOf = (fiber: { type?: unknown }) => {
		const type = fiber.type as
			| {
					displayName?: string
					name?: string
					render?: { name?: string }
					type?: { name?: string }
			  }
			| undefined
		return (
			type?.displayName ||
			type?.name ||
			type?.render?.name ||
			type?.type?.name ||
			'anonymous'
		)
	}
	const walk = (fiber: any) => {
		let node = fiber
		while (node) {
			const isComponent = [0, 1, 11, 14, 15].includes(node.tag)
			// PerformedWork flag = 1: the component's function ran in this commit.
			if (isComponent && node.flags & 1) {
				const name = nameOf(node)
				const counts = w.__renderCounts as Record<string, number>
				counts[name] = (counts[name] ?? 0) + 1
			}
			if (node.child) {
				walk(node.child)
			}
			node = node.sibling
		}
	}
	w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
		supportsFiber: true,
		renderers: new Map(),
		inject: () => 1,
		checkDCE: () => undefined,
		onCommitFiberUnmount: () => undefined,
		onPostCommitFiberRoot: () => undefined,
		onCommitFiberRoot: (_id: number, root: { current: unknown }) => {
			if (w.__counting) {
				walk((root.current as { child: unknown }).child)
			}
		},
	}
}

const centre = async (page: Page, selector: string) => {
	const locator = page.locator(selector).first()
	await locator.scrollIntoViewIfNeeded()
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('no bar')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const browser = await chromium.launch()
const selfMs = new Map<string, number>()
const inclusiveMs = new Map<string, number>()
const renderCounts = new Map<string, number>()
const plainSelfMs = new Map<string, number>()
let crossingSteps = 0
let plainSteps = 0
const stepLog: Array<{ commits: number; jsMs: number }> = []

const frameKey = (node: Node) => {
	const { functionName, url, lineNumber } = node.callFrame
	const file = url.split('/').at(-1) ?? ''
	return `${functionName || '(anon)'} ${file}:${lineNumber + 1}`
}

/** Inclusive time by the nearest React component (capitalised function) above each sample. */
const byComponent = new Map<string, number>()
const addComponents = (profile: Profile) => {
	const byId = new Map(profile.nodes.map((node) => [node.id, node]))
	const parent = new Map<number, number>()
	for (const node of profile.nodes) {
		for (const child of node.children ?? []) {
			parent.set(child, node.id)
		}
	}
	profile.samples.forEach((nodeId, index) => {
		const delta = (profile.timeDeltas[index + 1] ?? 0) / 1000
		let id: number | undefined = nodeId
		while (id !== undefined) {
			const frame = byId.get(id)?.callFrame
			const name = frame?.functionName ?? ''
			const isComponent = /^[A-Z]/.test(name) && !['Object'].includes(name)
			const isReactInternal = /^(Primitive|Dialog|Presence)/.test(name)
			if (isComponent && !isReactInternal && frame?.url.includes('index-')) {
				byComponent.set(name, (byComponent.get(name) ?? 0) + delta)
				return
			}
			id = parent.get(id)
		}
	})
}

const addProfile = (
	profile: Profile,
	into: Map<string, number>,
	inclusive: Map<string, number> | undefined
) => {
	const byId = new Map(profile.nodes.map((node) => [node.id, node]))
	const parent = new Map<number, number>()
	for (const node of profile.nodes) {
		for (const child of node.children ?? []) {
			parent.set(child, node.id)
		}
	}
	profile.samples.forEach((nodeId, index) => {
		const delta =
			(profile.timeDeltas[index + 1] ?? profile.timeDeltas[index] ?? 0) / 1000
		const leaf = byId.get(nodeId)
		if (!leaf) {
			return
		}
		into.set(frameKey(leaf), (into.get(frameKey(leaf)) ?? 0) + delta)
		if (inclusive) {
			const seen = new Set<string>()
			let id: number | undefined = nodeId
			while (id !== undefined) {
				const key = frameKey(byId.get(id) as Node)
				if (!seen.has(key)) {
					seen.add(key)
					inclusive.set(key, (inclusive.get(key) ?? 0) + delta)
				}
				id = parent.get(id)
			}
		}
	})
}

for (let rep = 0; rep < REPS; rep += 1) {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		timezoneId: 'UTC',
		locale: 'en-US',
		colorScheme: 'light',
	})
	const page = await context.newPage()
	if (MODE === 'count') {
		await page.addInitScript(COUNT_HOOK)
	}
	const cdp = await context.newCDPSession(page)
	await cdp.send('Performance.enable')
	await cdp.send('Profiler.enable')
	await cdp.send('Profiler.setSamplingInterval', { interval: 100 })
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
	await page.goto(`http://localhost:${PORT}/?s=${plan.id}`)
	const selector = `[data-testid="${plan.bar}-event-perf-subject"]`
	const subject =
		(await page.locator('[data-testid$="-event-perf-subject"]').count()) > 0
			? '[data-testid$="-event-perf-subject"]'
			: selector
	await page.waitForSelector(subject, { timeout: 600_000 })
	await page.waitForTimeout(900)
	const start = await centre(page, subject)
	const cell = await page.evaluate(({ x, y }) => {
		const hit = document
			.elementsFromPoint(x, y)
			.find((element) => element.getAttribute('data-testid')?.includes('cell'))
		const rect = hit?.getBoundingClientRect()
		return { width: rect?.width ?? 40, height: rect?.height ?? 24 }
	}, start)
	const end = {
		x: start.x + drag.dx * cell.width,
		y: start.y + drag.dy * cell.height,
	}
	const direction = {
		x: (end.x - start.x) / Math.hypot(end.x - start.x, end.y - start.y),
		y: (end.y - start.y) / Math.hypot(end.x - start.x, end.y - start.y),
	}
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	for (const pixels of [5, 10, 15]) {
		await page.mouse.move(
			start.x + direction.x * pixels,
			start.y + direction.y * pixels
		)
	}
	await page.waitForTimeout(200)
	for (let step = 1; step <= DRAG_STEPS; step += 1) {
		const point = {
			x: start.x + ((end.x - start.x) * step) / DRAG_STEPS,
			y: start.y + ((end.y - start.y) * step) / DRAG_STEPS,
		}
		const commitsBefore = await page.evaluate(() => window.__perf.commits)
		const metricsBefore = (await cdp.send('Performance.getMetrics')).metrics
		if (MODE === 'count') {
			await page.evaluate(() => {
				const w = window as unknown as Record<string, unknown>
				w.__renderCounts = {}
				w.__counting = true
			})
		} else if (MODE === 'profile') {
			await cdp.send('Profiler.start')
		}
		await page.mouse.move(point.x, point.y)
		await page.evaluate(() => window.__perf.pending)
		let profile: Profile | undefined
		if (MODE === 'count') {
			await page.evaluate(() => {
				;(window as unknown as Record<string, unknown>).__counting = false
			})
		} else if (MODE === 'profile') {
			profile = (await cdp.send('Profiler.stop')).profile as unknown as Profile
		}
		const commits =
			(await page.evaluate(() => window.__perf.commits)) - commitsBefore
		const metricsAfter = (await cdp.send('Performance.getMetrics')).metrics
		const script = (name: string, list: typeof metricsBefore) =>
			list.find((m) => m.name === name)?.value ?? 0
		const jsMs =
			(script('ScriptDuration', metricsAfter) -
				script('ScriptDuration', metricsBefore)) *
			1000
		stepLog.push({ commits, jsMs })
		const crossing = commits >= 2
		if (crossing) {
			crossingSteps += 1
		} else {
			plainSteps += 1
		}
		if (profile && crossing) {
			addComponents(profile)
		}
		if (profile) {
			addProfile(
				profile,
				crossing ? selfMs : plainSelfMs,
				crossing ? inclusiveMs : undefined
			)
		}
		if (MODE === 'count' && crossing) {
			const counts = await page.evaluate(
				() =>
					(window as unknown as { __renderCounts: Record<string, number> })
						.__renderCounts
			)
			for (const [name, count] of Object.entries(counts)) {
				renderCounts.set(name, (renderCounts.get(name) ?? 0) + count)
			}
		}
	}
	await page.mouse.up()
	await context.close()
}
await browser.close()

const top = (map: Map<string, number>, n: number, divisor: number) =>
	[...map.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, n)
		.map(([key, value]) => ({
			key,
			msPerCrossingStep: Number((value / divisor).toFixed(2)),
		}))

const result = {
	scenario: SCENARIO,
	mode: MODE,
	crossingSteps,
	plainSteps,
	crossingJsMsMean: Number(
		(
			stepLog
				.filter((step) => step.commits >= 2)
				.reduce((sum, step) => sum + step.jsMs, 0) / Math.max(1, crossingSteps)
		).toFixed(2)
	),
	topSelf: top(selfMs, 25, Math.max(1, crossingSteps)),
	byNearestComponent: top(byComponent, 15, Math.max(1, crossingSteps)),
	topInclusive: top(inclusiveMs, 40, Math.max(1, crossingSteps)),
	renderCountsPerCrossingStep: [...renderCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 40)
		.map(([name, count]) => ({
			name,
			perStep: Number((count / Math.max(1, crossingSteps)).toFixed(1)),
		})),
}
const out = process.env.OUT
if (out) {
	writeFileSync(out, JSON.stringify(result, null, 2))
}
console.log(JSON.stringify(result, null, 2))
