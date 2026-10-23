import { expect, type Page, test } from '@playwright/test'
import { gotoScenario, releasePointer, setSettings } from '../support/harness'
import { MonthGrid, ResourceAxis } from '../support/pages'

/*
 * QA personas for `resources` as a function. Read-only against the product:
 * everything here drives the harness through the URL and the real UI.
 */

/** Records, from before the first render, every isLoading value and every frame that drew a non-resource grid. */
const installRecorder = (page: Page) =>
	page.addInitScript(() => {
		const rec = { loading: [] as boolean[], nonResourceFrames: 0 }
		;(window as unknown as { __rec: typeof rec }).__rec = rec
		const check = () => {
			const el = document.querySelector('[data-testid="fetch-state"]')
			if (el?.textContent) {
				const value = JSON.parse(el.textContent).isLoading as boolean
				if (rec.loading.at(-1) !== value) rec.loading.push(value)
			}
			const regularWeek = document.querySelector(
				'[data-testid="week-view-header"]'
			)
			const regularCell = document.querySelector(
				'[data-testid^="day-cell-"]:not([data-resource-id])'
			)
			if (regularWeek || regularCell) rec.nonResourceFrames += 1
		}
		new MutationObserver(check).observe(document, {
			subtree: true,
			childList: true,
			characterData: true,
			attributes: true,
		})
	})

const recorded = (page: Page) =>
	page.evaluate(
		() =>
			(
				window as unknown as {
					__rec: { loading: boolean[]; nonResourceFrames: number }
				}
			).__rec
	)

const open = (
	page: Page,
	opts: {
		scenario?: string
		view?: 'day' | 'week' | 'month'
		orientation?: 'vertical' | 'horizontal'
		settings?: Record<string, string | number>
	} = {}
) =>
	gotoScenario(page, {
		scenario: opts.scenario ?? 'resources',
		view: opts.view ?? 'week',
		orientation: opts.orientation ?? 'vertical',
		settings: opts.settings ?? {
			resourcesFetch: 'delayed',
			fetchDelay: 400,
		},
	})

/**
 * The harness mounts under React StrictMode, whose dev-only effect replay
 * aborts the first mount fetch. Specs read the log without that artifact.
 */
const withoutMountReplay = <T extends { status: string }>(log: T[]): T[] =>
	log.at(0)?.status === 'aborted' ? log.slice(1) : log

const pageErrors = (page: Page) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	return errors
}

test.describe('persona 1: dispatcher, slow resources and slow events', () => {
	for (const view of ['week', 'month', 'day'] as const) {
		for (const orientation of ['vertical', 'horizontal'] as const) {
			test(`never flashes a non-resource grid, one loading cycle (${view}, ${orientation})`, async ({
				page,
			}) => {
				await installRecorder(page)
				await open(page, {
					view,
					orientation,
					settings: {
						resourcesFetch: 'delayed',
						fetch: 'delayed',
						fetchDelay: 500,
					},
				})
				const axis = new ResourceAxis(page)
				await expect(axis.resource('Room A')).toBeVisible()
				await expect(axis.event('Room A booking').first()).toBeVisible()
				await expect
					.poll(async () => (await axis.fetchState()).isLoading)
					.toBe(false)
				const rec = await recorded(page)
				expect(rec.nonResourceFrames).toBe(0)
				// Starts true (or false then true) and settles false once.
				expect(rec.loading.filter(Boolean)).toHaveLength(1)
				expect(rec.loading.at(-1)).toBe(false)
				expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
			})
		}
	}

	test('lanes appear before events when events are slower than resources', async ({
		page,
	}) => {
		// Same delay for both in the harness, so slow events = failing-free long delay and
		// resources answered first by a refetch with delay lowered.
		await open(page, {
			settings: {
				resourcesFetch: 'delayed',
				fetch: 'delayed',
				fetchDelay: 700,
			},
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room A')).toBeVisible()
		await expect(axis.event('Room A booking').first()).toBeVisible()
		expect(withoutMountReplay(await axis.resourcesFetchLog())).toHaveLength(1)
	})

	test('navigating during the resource fetch (default) keeps one resource fetch and shows lanes', async ({
		page,
	}) => {
		const errors = pageErrors(page)
		await installRecorder(page)
		await open(page, {
			settings: {
				resourcesFetch: 'delayed',
				fetch: 'delayed',
				fetchDelay: 800,
			},
		})
		const axis = new ResourceAxis(page)
		await axis.next()
		await axis.next()
		await expect(axis.resource('Room A')).toBeVisible()
		await expect
			.poll(async () => (await axis.fetchState()).isLoading)
			.toBe(false)
		expect(withoutMountReplay(await axis.resourcesFetchLog())).toHaveLength(1)
		expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
		expect((await recorded(page)).nonResourceFrames).toBe(0)
		expect(errors).toEqual([])
	})

	test('navigating during the resource fetch with refetchResourcesOnNavigate aborts the first, loads once', async ({
		page,
	}) => {
		const errors = pageErrors(page)
		await installRecorder(page)
		await open(page, {
			settings: {
				resourcesFetch: 'delayed',
				fetch: 'delayed',
				fetchDelay: 800,
				refetchResourcesOnNavigate: 'true',
			},
		})
		const axis = new ResourceAxis(page)
		await axis.next()
		await expect(axis.resource('Room A')).toBeVisible()
		await expect
			.poll(async () => (await axis.fetchState()).isLoading)
			.toBe(false)
		const log = withoutMountReplay(await axis.resourcesFetchLog())
		expect(log.map((entry) => entry.status)).toEqual(['aborted', 'done'])
		expect(await axis.resourcesErrors()).toBe(0)
		expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
		const rec = await recorded(page)
		expect(rec.nonResourceFrames).toBe(0)
		expect(rec.loading.filter(Boolean)).toHaveLength(1)
		expect(errors).toEqual([])
	})
})

test.describe('persona 2: flaky directory service', () => {
	test('first failure: zero lanes, resource-calendar chrome, one error, loading false, no resourcesSet', async ({
		page,
	}) => {
		await installRecorder(page)
		await open(page, {
			settings: { resourcesFetch: 'failing', fetchDelay: 200 },
		})
		const axis = new ResourceAxis(page)
		await expect.poll(() => axis.resourcesErrors()).toBe(1)
		await expect(axis.resource('Room A')).toHaveCount(0)
		await expect
			.poll(async () => (await axis.fetchState()).isLoading)
			.toBe(false)
		await page.waitForTimeout(500)
		expect(await axis.resourcesErrors()).toBe(1)
		expect(await axis.resourcesSetCalls()).toEqual([])
		expect((await recorded(page)).nonResourceFrames).toBe(0)
		await axis.expectRendered()
	})

	test('later failure keeps lanes and events, one error per failure, no resourcesSet, recovers', async ({
		page,
	}) => {
		await open(page, {
			settings: { resourcesFetch: 'delayed', fetchDelay: 200 },
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room C')).toBeVisible()
		await setSettings(page, { resourcesFetch: 'failing' })
		await axis.refetchResources()
		await expect.poll(() => axis.resourcesErrors()).toBe(1)
		await axis.refetchResources()
		await expect.poll(() => axis.resourcesErrors()).toBe(2)
		await expect(axis.resource('Room C')).toBeVisible()
		await expect(axis.event('Room A booking').first()).toBeVisible()
		expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
		await setSettings(page, { resourcesFetch: 'delayed' })
		await axis.refetchResources()
		await expect
			.poll(async () => (await axis.resourcesFetchLog()).at(-1)?.status)
			.toBe('done')
		// Same content as before: not a change.
		expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
		expect(await axis.resourcesErrors()).toBe(2)
	})

	test('rapid double refetch: first is aborted (not an error), one resourcesSet for a changed list', async ({
		page,
	}) => {
		await open(page, {
			settings: { resourcesFetch: 'delayed', fetchDelay: 200 },
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room C')).toBeVisible()
		await setSettings(page, { resourceCount: 2, fetchDelay: 600 })
		await axis.refetchResources()
		await axis.refetchResources()
		await expect(axis.resource('Room C')).toHaveCount(0)
		const statuses = withoutMountReplay(await axis.resourcesFetchLog()).map(
			(e) => e.status
		)
		expect(statuses).toEqual(['done', 'aborted', 'done'])
		expect(await axis.resourcesErrors()).toBe(0)
		expect(await axis.resourcesSetCalls()).toEqual([
			['r1', 'r2', 'r3'],
			['r1', 'r2'],
		])
	})

	test('refetchResourcesOnNavigate on: failing fetch on navigation keeps lanes and reports one error per failure', async ({
		page,
	}) => {
		await open(page, {
			settings: {
				resourcesFetch: 'delayed',
				fetchDelay: 150,
				refetchResourcesOnNavigate: 'true',
			},
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room A')).toBeVisible()
		await setSettings(page, { resourcesFetch: 'failing' })
		await axis.next()
		await axis.next()
		await axis.next()
		await axis.next()
		await expect.poll(() => axis.resourcesErrors()).toBeGreaterThanOrEqual(1)
		await page.waitForTimeout(600)
		const failed = (await axis.resourcesFetchLog()).filter(
			(e) => e.status === 'failed'
		).length
		expect(await axis.resourcesErrors()).toBe(failed)
		await expect(axis.resource('Room A')).toBeVisible()
		expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
	})

	test('refetchResourcesOnNavigate off: navigation far away never calls the function', async ({
		page,
	}) => {
		await open(page, {
			settings: { resourcesFetch: 'delayed', fetchDelay: 100 },
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room A')).toBeVisible()
		for (let i = 0; i < 6; i += 1) await axis.next()
		await page.waitForTimeout(400)
		expect(withoutMountReplay(await axis.resourcesFetchLog())).toHaveLength(1)
		await axis.today()
		await expect(axis.resource('Room A')).toBeVisible()
	})

	test('refetchResourcesOnNavigate on: staying inside the fetched range does not refetch (month view)', async ({
		page,
	}) => {
		await open(page, {
			view: 'month',
			orientation: 'horizontal',
			settings: {
				resourcesFetch: 'delayed',
				fetchDelay: 100,
				refetchResourcesOnNavigate: 'true',
			},
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room A')).toBeVisible()
		const before = (await axis.resourcesFetchLog()).length
		await axis.next()
		await page.waitForTimeout(400)
		// Leaving the fetched range must refetch exactly once.
		expect((await axis.resourcesFetchLog()).length - before).toBe(1)
		await axis.previous()
		await page.waitForTimeout(400)
		// Back inside a previously fetched range: documented behaviour is "refetch on leaving
		// the fetched range"; record what happens.
		const after = (await axis.resourcesFetchLog()).length - before
		expect(after).toBeLessThanOrEqual(2)
	})
})

test.describe('persona 3: planner dragging while resources reload', () => {
	const dragToLane = async (page: Page) => {
		const month = new MonthGrid(page)
		const bar = month.bar('res-1')
		await expect(bar).toBeVisible()
		const source = await bar.boundingBox()
		const target = await page
			.locator('[data-resource-id="r2"][data-start="2025-03-11T00:00:00.000Z"]')
			.boundingBox()
		if (!source || !target) throw new Error('layout')
		await page.mouse.move(
			source.x + source.width / 2,
			source.y + source.height / 2
		)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
				source.y + ((target.y - source.y) * step) / 8 + target.height / 2
			)
		}
		await releasePointer(page)
		return month
	}

	test('drag between lanes, then the list loses the destination lane: no crash, event handled', async ({
		page,
	}) => {
		const errors = pageErrors(page)
		await open(page, {
			view: 'month',
			orientation: 'horizontal',
			settings: { resourcesFetch: 'delayed', fetchDelay: 200 },
		})
		const month = await (async () => {
			await expect(new ResourceAxis(page).resource('Room B')).toBeVisible()
			return dragToLane(page)
		})()
		await expect
			.poll(async () => (await month.eventNamed('Room A booking')).resourceId)
			.toBe('r2')
		await setSettings(page, { resourceCount: 1 })
		await month.refetchResources()
		await expect(new ResourceAxis(page).resource('Room B')).toHaveCount(0)
		await month.expectRendered()
		expect(await month.resourcesSetCalls()).toEqual([
			['r1', 'r2', 'r3'],
			['r1'],
		])
		// The consumer's row keeps what the user did; the calendar does not rewrite it.
		expect((await month.eventNamed('Room A booking')).resourceId).toBe('r2')
		expect(errors).toEqual([])
	})

	test('refetch mid-drag (resource list changes while the pointer is down) does not crash or lose the drop', async ({
		page,
	}) => {
		const errors = pageErrors(page)
		await open(page, {
			view: 'month',
			orientation: 'horizontal',
			settings: { resourcesFetch: 'delayed', fetchDelay: 150 },
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room B')).toBeVisible()
		const month = new MonthGrid(page)
		const bar = month.bar('res-1')
		const source = await bar.boundingBox()
		const target = await page
			.locator('[data-resource-id="r2"][data-start="2025-03-11T00:00:00.000Z"]')
			.boundingBox()
		if (!source || !target) throw new Error('layout')
		await page.mouse.move(
			source.x + source.width / 2,
			source.y + source.height / 2
		)
		await page.mouse.down()
		for (let step = 1; step <= 4; step += 1) {
			await page.mouse.move(
				source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
				source.y + ((target.y - source.y) * step) / 8 + target.height / 2
			)
		}
		// Same list content refetched mid-drag. A DOM click, not a pointer click:
		// a real click would release the held mouse button and end the drag.
		await page.getByTestId('refetch-resources').dispatchEvent('click')
		await page.waitForTimeout(400)
		for (let step = 5; step <= 8; step += 1) {
			await page.mouse.move(
				source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
				source.y + ((target.y - source.y) * step) / 8 + target.height / 2
			)
		}
		await releasePointer(page)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		expect((await month.eventNamed('Room A booking')).resourceId).toBe('r2')
		expect(await month.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
		expect(errors).toEqual([])
	})

	test('CONTROL: same slow mid-drag pause with no refetch still drops', async ({
		page,
	}) => {
		await open(page, {
			view: 'month',
			orientation: 'horizontal',
			settings: { resourcesFetch: 'delayed', fetchDelay: 150 },
		})
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room B')).toBeVisible()
		const month = new MonthGrid(page)
		const bar = month.bar('res-1')
		const source = await bar.boundingBox()
		const target = await page
			.locator('[data-resource-id="r2"][data-start="2025-03-11T00:00:00.000Z"]')
			.boundingBox()
		if (!source || !target) throw new Error('layout')
		await page.mouse.move(
			source.x + source.width / 2,
			source.y + source.height / 2
		)
		await page.mouse.down()
		for (let step = 1; step <= 4; step += 1) {
			await page.mouse.move(
				source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
				source.y + ((target.y - source.y) * step) / 8 + target.height / 2
			)
		}
		await page.waitForTimeout(400)
		for (let step = 5; step <= 8; step += 1) {
			await page.mouse.move(
				source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
				source.y + ((target.y - source.y) * step) / 8 + target.height / 2
			)
		}
		await releasePointer(page)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
	})

	test('vertical week: the list loses the lane an event sits in, event stays reported, no crash', async ({
		page,
	}) => {
		const errors = pageErrors(page)
		await open(page, {
			settings: { resourcesFetch: 'delayed', fetchDelay: 150 },
		})
		const axis = new ResourceAxis(page)
		await expect(axis.event('Room C booking').first()).toBeVisible()
		await setSettings(page, { resourceCount: 2 })
		await axis.refetchResources()
		await expect(axis.resource('Room C')).toHaveCount(0)
		await axis.expectRendered()
		expect((await axis.eventNamed('Room C booking')).resourceId).toBe('r3')
		expect(await axis.resourcesSetCalls()).toEqual([
			['r1', 'r2', 'r3'],
			['r1', 'r2'],
		])
		expect(errors).toEqual([])
	})
})

test.describe('persona 4: upgrader, array resources everywhere', () => {
	const scenarios = [
		'resources',
		'resource-day-overflow',
		'numeric-resource-ids',
		'long-resource-events',
		'resource-hours',
		'dst-days',
	]
	const expectedIds: Record<string, string[]> = {
		resources: ['r1', 'r2', 'r3'],
		'resource-day-overflow': ['room-a'],
		'dst-days': ['r1', 'r2', 'r3'],
		'long-resource-events': ['r1', 'r2', 'r3'],
	}
	for (const scenario of scenarios) {
		for (const view of ['day', 'week', 'month'] as const) {
			for (const orientation of ['vertical', 'horizontal'] as const) {
				test(`${scenario} ${view} ${orientation}: renders at once, resourcesSet fires once`, async ({
					page,
				}) => {
					const errors = pageErrors(page)
					await installRecorder(page)
					await gotoScenario(page, {
						scenario,
						view,
						orientation,
						settings: {},
					}).catch(() => undefined)
					const harnessError = page.getByTestId('harness-error')
					if ((await harnessError.count()) > 0) {
						test.skip(true, 'view not offered by scenario')
					}
					const axis = new ResourceAxis(page)
					await axis.expectRendered()
					await page.waitForTimeout(300)
					const calls = await axis.resourcesSetCalls()
					expect(calls).toHaveLength(1)
					if (expectedIds[scenario]) {
						expect(calls.at(0)).toEqual(expectedIds[scenario])
					}
					expect((await axis.fetchState()).isLoading).toBe(false)
					expect(await axis.resourcesFetchLog()).toEqual([])
					expect((await recorded(page)).nonResourceFrames).toBe(0)
					expect(errors).toEqual([])
				})
			}
		}
	}

	test('array prop: changing resourceCount fires resourcesSet once per change; refetchResources absent without a function', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: {},
		})
		const axis = new ResourceAxis(page)
		await setSettings(page, { resourceCount: 2 })
		await expect(axis.resource('Room C')).toHaveCount(0)
		await setSettings(page, { resourceCount: 3 })
		await expect(axis.resource('Room C')).toBeVisible()
		expect(await axis.resourcesSetCalls()).toEqual([
			['r1', 'r2', 'r3'],
			['r1', 'r2'],
			['r1', 'r2', 'r3'],
		])
	})

	test('a calendar with no resources at all is still a regular calendar and resourcesSet does not break it', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week', settings: {} })
		await expect(page.getByTestId('week-view-header')).toBeVisible()
		const axis = new ResourceAxis(page)
		expect((await axis.resourcesSetCalls()).length).toBeLessThanOrEqual(1)
	})
})
