/**
 * Profiles one interaction (INTERACTION=mount|nav|drop) of a scenario with CDP CPU
 * profiles and reports self time, inclusive time and the nearest React component,
 * per interaction. Same build setup as profile-drag.ts.
 *
 *   PORT=4601 SCENARIO=week-500-slot15 INTERACTION=nav bun scripts/profile-interaction.ts
 * REPS (default 3), THROTTLE (default 1), OUT (JSON file)
 */
import { writeFileSync } from 'node:fs'
import { chromium, type Page } from '@playwright/test'
import { plans } from '../src/plan'

const PORT = process.env.PORT ?? '4601'
const SCENARIO = process.env.SCENARIO ?? 'week-500-slot15'
const INTERACTION = process.env.INTERACTION ?? 'nav'
const REPS = Number(process.env.REPS ?? 3)
const THROTTLE = Number(process.env.THROTTLE ?? 1)
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

const browser = await chromium.launch()
const selfMs = new Map<string, number>()
const inclusiveMs = new Map<string, number>()
let units = 0
const unitLog: number[] = []

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

const subject = '[data-testid$="-event-perf-subject"]'

const pageTimes = async (
	page: Page,
	cdp: import('@playwright/test').CDPSession
) => {
	const metrics = (await cdp.send('Performance.getMetrics')).metrics
	return (metrics.find((m) => m.name === 'ScriptDuration')?.value ?? 0) * 1000
}

for (let rep = 0; rep < REPS; rep += 1) {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		timezoneId: 'UTC',
		locale: 'en-US',
		colorScheme: 'light',
	})
	const page = await context.newPage()
	const cdp = await context.newCDPSession(page)
	await cdp.send('Performance.enable')
	await cdp.send('Profiler.enable')
	await cdp.send('Profiler.setSamplingInterval', { interval: 100 })
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
	const keep = (profile: Profile, jsMs: number) => {
		units += 1
		unitLog.push(jsMs)
		addProfile(profile, selfMs, inclusiveMs)
		addComponents(profile)
	}
	if (INTERACTION === 'mount') {
		await cdp.send('Profiler.start')
		await page.goto(`http://localhost:${PORT}/?s=${plan.id}`, {
			waitUntil: 'commit',
		})
		await page.waitForSelector(subject, { timeout: 600_000 })
		await page.evaluate(() => window.__perf.settle())
		const profile = (await cdp.send('Profiler.stop'))
			.profile as unknown as Profile
		keep(profile, await pageTimes(page, cdp))
	} else {
		await page.goto(`http://localhost:${PORT}/?s=${plan.id}`)
		await page.waitForSelector(subject, { timeout: 600_000 })
		await page.waitForTimeout(900)
		if (INTERACTION === 'nav') {
			for (let index = 0; index < 10; index += 1) {
				const label = index % 2 === 0 ? 'Next' : 'Previous'
				const before = await pageTimes(page, cdp)
				await cdp.send('Profiler.start')
				await page.evaluate(async (name) => {
					document.querySelector<HTMLElement>(`[aria-label="${name}"]`)?.click()
					await window.__perf.pending
				}, label)
				const profile = (await cdp.send('Profiler.stop'))
					.profile as unknown as Profile
				keep(profile, (await pageTimes(page, cdp)) - before)
				await page.waitForTimeout(150)
			}
		} else {
			const box = await page.locator(subject).first().boundingBox()
			if (!box) {
				throw new Error('no bar')
			}
			const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
			const cell = await page.evaluate(({ x, y }) => {
				const hit = document
					.elementsFromPoint(x, y)
					.find((element) =>
						element.getAttribute('data-testid')?.includes('cell')
					)
				const rect = hit?.getBoundingClientRect()
				return { width: rect?.width ?? 40, height: rect?.height ?? 24 }
			}, start)
			const end = {
				x: start.x + drag.dx * cell.width,
				y: start.y + drag.dy * cell.height,
			}
			await page.mouse.move(start.x, start.y)
			await page.mouse.down()
			const length = Math.hypot(end.x - start.x, end.y - start.y)
			for (const pixels of [5, 10, 15]) {
				await page.mouse.move(
					start.x + ((end.x - start.x) / length) * pixels,
					start.y + ((end.y - start.y) / length) * pixels
				)
			}
			for (let step = 1; step <= 20; step += 1) {
				await page.mouse.move(
					start.x + ((end.x - start.x) * step) / 20,
					start.y + ((end.y - start.y) * step) / 20
				)
				await page.evaluate(() => window.__perf.pending)
			}
			await page.waitForTimeout(300)
			const before = await pageTimes(page, cdp)
			await cdp.send('Profiler.start')
			await page.mouse.up()
			await page.evaluate(() => window.__perf.pending)
			const profile = (await cdp.send('Profiler.stop'))
				.profile as unknown as Profile
			keep(profile, (await pageTimes(page, cdp)) - before)
		}
	}
	await context.close()
}
await browser.close()

const top = (map: Map<string, number>, n: number) =>
	[...map.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, n)
		.map(([key, value]) => ({
			key,
			msPerInteraction: Number((value / Math.max(1, units)).toFixed(2)),
		}))

const result = {
	scenario: SCENARIO,
	interaction: INTERACTION,
	interactions: units,
	jsMsMean: Number(
		(
			unitLog.reduce((sum, value) => sum + value, 0) / Math.max(1, units)
		).toFixed(2)
	),
	byNearestComponent: top(byComponent, 15),
	topSelf: top(selfMs, 25),
	topInclusive: top(inclusiveMs, 150),
}
if (process.env.OUT) {
	writeFileSync(process.env.OUT, JSON.stringify(result, null, 2))
}
console.log(JSON.stringify(result, null, 2))
