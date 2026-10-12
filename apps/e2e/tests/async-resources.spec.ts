import { expect, type Page, test } from '@playwright/test'
import { gotoScenario, setSettings } from './support/harness'
import { ResourceAxis } from './support/pages'

/*
 * `resources` as a function. The harness's function answers with the scenario's
 * resources after `fetchDelay` ms (`resourcesFetch=delayed`) or fails after it
 * (`resourcesFetch=failing`), and publishes each call it receives, the
 * `resourcesSet` calls and the failures it was told about. Until it resolves the
 * calendar has no resource axis.
 */
const DELAYED = { resourcesFetch: 'delayed', fetchDelay: 300 }

const open = (
	page: Page,
	orientation: 'vertical' | 'horizontal',
	settings: Record<string, string | number> = DELAYED
) =>
	gotoScenario(page, {
		scenario: 'resources',
		view: 'week',
		orientation,
		settings,
	})

for (const orientation of ['vertical', 'horizontal'] as const) {
	test.describe(`resources as a function, ${orientation}`, () => {
		test('draws the lanes once the function resolves, not before', async ({
			page,
		}) => {
			await open(page, orientation)
			const axis = new ResourceAxis(page)

			await expect(axis.resource('Room A')).toHaveCount(0)
			expect((await axis.fetchState()).isLoading).toBe(true)

			await expect(axis.resource('Room A')).toBeVisible()
			await expect(axis.resource('Room C')).toBeVisible()
			await expect(axis.event('Room A booking')).toBeVisible()
			expect((await axis.fetchState()).isLoading).toBe(false)
			expect(await axis.resourcesSetCalls()).toEqual([['r1', 'r2', 'r3']])
		})

		test('is a resource calendar, with no lanes, while the first fetch is pending', async ({
			page,
		}) => {
			await open(page, orientation, { ...DELAYED, fetchDelay: 1500 })
			const axis = new ResourceAxis(page)

			expect((await axis.fetchState()).isLoading).toBe(true)
			await expect(axis.root).toBeVisible()
			// A regular week would draw its own header and one column per day.
			await expect(page.getByTestId('week-view-header')).toHaveCount(0)
			await expect(
				page.locator('[data-testid^="vertical-col-day-col-"]')
			).toHaveCount(0)
			await expect(axis.resource('Room A')).toHaveCount(0)

			await expect(axis.resource('Room A')).toBeVisible()
			await expect(page.getByTestId('week-view-header')).toHaveCount(0)
		})

		test('a failure keeps the lanes, reports it, and refetchResources recovers', async ({
			page,
		}) => {
			await open(page, orientation)
			const axis = new ResourceAxis(page)
			await expect(axis.resource('Room A')).toBeVisible()

			await setSettings(page, { resourcesFetch: 'failing' })
			await axis.refetchResources()

			await expect.poll(() => axis.resourcesErrors()).toBe(1)
			await expect(axis.resource('Room A')).toBeVisible()
			await axis.expectRendered()

			await setSettings(page, { resourcesFetch: 'delayed', resourceCount: 2 })
			await axis.refetchResources()

			await expect(axis.resource('Room C')).toHaveCount(0)
			await expect(axis.resource('Room B')).toBeVisible()
			expect(await axis.resourcesSetCalls()).toEqual([
				['r1', 'r2', 'r3'],
				['r1', 'r2'],
			])
		})
	})
}

test.describe('resources as a function', () => {
	test('a first fetch that fails leaves no lanes, and refetchResources loads them', async ({
		page,
	}) => {
		await open(page, 'vertical', {
			resourcesFetch: 'failing',
			fetchDelay: 100,
		})
		const axis = new ResourceAxis(page)

		await expect.poll(() => axis.resourcesErrors()).toBe(1)
		await expect(axis.resource('Room A')).toHaveCount(0)

		await setSettings(page, { resourcesFetch: 'delayed' })
		await axis.refetchResources()

		await expect(axis.resource('Room A')).toBeVisible()
	})

	test('navigating does not refetch by default, and does with refetchResourcesOnNavigate', async ({
		page,
	}) => {
		await open(page, 'vertical')
		const axis = new ResourceAxis(page)
		await expect(axis.resource('Room A')).toBeVisible()
		const callsAfterLoad = (await axis.resourcesFetchLog()).length

		await axis.next()
		await axis.next()
		await expect(axis.resource('Room A')).toBeVisible()
		expect(await axis.resourcesFetchLog()).toHaveLength(callsAfterLoad)

		await setSettings(page, { refetchResourcesOnNavigate: 'true' })
		await axis.next()
		await axis.next()
		await axis.next()
		await axis.next()
		// Six weeks on from the week the calendar opened on (Sun 9 March).
		await expect
			.poll(async () => (await axis.resourcesFetchLog()).at(-1))
			.toMatchObject({ start: '2025-04-20T00:00:00.000Z', status: 'done' })
		await expect(axis.resource('Room A')).toBeVisible()
	})

	test('events fetched from a function and resources fetched from a function share one loading', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { ...DELAYED, fetch: 'delayed' },
		})
		const axis = new ResourceAxis(page)

		expect((await axis.fetchState()).isLoading).toBe(true)
		await expect(axis.resource('Room A')).toBeVisible()
		await expect(axis.event('Room A booking')).toBeVisible()
		expect((await axis.fetchState()).isLoading).toBe(false)
	})
})
