import { expect, type Page, test } from '@playwright/test'
import { gotoScenario, setSettings } from './support/harness'
import { MonthGrid } from './support/pages'

/*
 * `events` as a function. The harness's fetcher answers from the scenario after
 * `fetchDelay` ms (`fetch=delayed`) or fails after it (`fetch=failing`), and
 * publishes every call it receives and how each ended, so a spec can see what
 * the calendar asked for and which calls it abandoned.
 *
 * Month grids pad with the neighbouring months: March 2025 shows 23 February to
 * 5 April, April shows 30 March to 10 May.
 */
const DELAYED = { fetch: 'delayed', fetchDelay: 300 }

const openMarch = (page: Page) =>
	gotoScenario(page, {
		scenario: 'async-events',
		view: 'month',
		settings: DELAYED,
	})

test.describe('events as a function', () => {
	test('shows the events once the fetch returns, not before', async ({
		page,
	}) => {
		await openMarch(page)
		const month = new MonthGrid(page)

		await expect(month.event('March lunch')).toHaveCount(0)
		expect((await month.fetchState()).isLoading).toBe(true)

		await expect(month.event('March lunch')).toBeVisible()
		expect((await month.fetchState()).isLoading).toBe(false)
		// Dev builds mount twice (StrictMode), so the first call may be the
		// abandoned one; either way it asked for the same grid.
		const [first] = await month.fetchLog()
		expect(first.start).toBe('2025-02-23T00:00:00.000Z')
		expect(first.end).toBe('2025-04-06T00:00:00.000Z')
	})

	test('rapid navigation shows only the last range, and abandons the ones in between', async ({
		page,
	}) => {
		await openMarch(page)
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		const callsBefore = (await month.fetchLog()).length

		await month.next()
		await month.next()
		await month.next()

		await expect(month.event('June demo')).toBeVisible()
		await expect(month.event('April review')).toHaveCount(0)
		await expect(month.event('May kickoff')).toHaveCount(0)
		const fetches = (await month.fetchLog()).slice(callsBefore)
		expect(fetches.map((entry) => entry.status)).toEqual([
			'aborted',
			'aborted',
			'done',
		])
		expect(fetches.at(-1)?.start).toBe('2025-06-01T00:00:00.000Z')
	})

	test('a failed fetch keeps the shown events, reports it, and is retried', async ({
		page,
	}) => {
		await openMarch(page)
		const month = new MonthGrid(page)
		await expect(month.event('Month turn')).toBeVisible()

		await setSettings(page, { fetch: 'failing' })
		await month.next()

		await expect.poll(async () => (await month.fetchState()).errors).toBe(1)
		await expect(month.event('Month turn')).toBeVisible()
		await month.expectRendered()

		await setSettings(page, { fetch: 'delayed' })
		await month.previous()
		await month.next()

		await expect(month.event('April review')).toBeVisible()
	})

	test('a drag is reported and sticks while the events come from a function', async ({
		page,
	}) => {
		await openMarch(page)
		const month = new MonthGrid(page)
		const bar = month.event('March lunch')
		await expect(bar).toBeVisible()
		const callsBefore = (await month.fetchLog()).length
		const source = await bar.boundingBox()
		const target = await month.cellOn('2025-03-14').boundingBox()
		if (!source || !target) {
			throw new Error('the bar and the cell must both be laid out')
		}

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
		await page.mouse.up()

		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await expect
			.poll(async () => (await month.eventNamed('March lunch')).start)
			.toMatch(/^2025-03-14/)
		// Moving inside the fetched range asks the function for nothing more.
		expect(await month.fetchLog()).toHaveLength(callsBefore)
	})

	test('a series that began before the fetched range still shows its occurrences', async ({
		page,
	}) => {
		// The fetcher returns the series row (its recurrence intersects the
		// range) even though the first occurrence is in 2015; the recurrence
		// plugin expands it.
		await gotoScenario(page, {
			scenario: 'recurring',
			view: 'week',
			plugins: ['recurrence'],
			settings: DELAYED,
		})
		const week = new MonthGrid(page)

		await expect(week.event('Long-running class').first()).toBeVisible()
		await expect(week.event('Daily stand-up').first()).toBeVisible()
	})
})
