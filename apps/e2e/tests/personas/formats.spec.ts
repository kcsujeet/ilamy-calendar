import { expect, test } from '@playwright/test'
import { gotoScenario } from '../support/harness'
import { TimeGrid } from '../support/pages'

/**
 * QA personas for 3.3.6 (slotHeaderFormat, eventTimeFormat, displayEventTime,
 * displayEventEnd, dayHeaderFormat, titleFormat). Each option changes its own
 * text and nothing else; with no parameter the text is what it always was.
 */

const TWENTY_FOUR_HOUR = JSON.stringify({
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
})

const openWeek = async (
	page: Parameters<typeof gotoScenario>[0],
	scenario: string,
	settings: Record<string, string> = {}
) => {
	await gotoScenario(page, { scenario, view: 'week', settings })
	return new TimeGrid(page)
}

// Intl writes a thin or no-break space around a range dash and before AM/PM.
const plain = (text: string | null) => text?.replace(/[   ]/g, ' ')

test.describe('formats', () => {
	test('with no parameter the text is what it always was', async ({ page }) => {
		const grid = await openWeek(page, 'short-events')

		await expect(grid.bars('short-2')).toHaveText('Half hour')
		await expect(grid.hourLabels.filter({ hasText: /^9 AM$/ })).toHaveCount(1)
		await expect(page.getByTestId('week-header-weekday-wednesday')).toHaveText(
			'Wed12'
		)
		await expect(grid.title).toHaveText('Mar 9 – 15')
	})

	test('eventTimeFormat writes the start time on the bar', async ({ page }) => {
		const grid = await openWeek(page, 'short-events', {
			eventTimeFormat: TWENTY_FOUR_HOUR,
		})

		await expect(grid.bars('short-2')).toHaveText('09:30Half hour')
	})

	test('displayEventTime=false hides it again', async ({ page }) => {
		const grid = await openWeek(page, 'short-events', {
			eventTimeFormat: TWENTY_FOUR_HOUR,
			displayEventTime: 'false',
		})

		await expect(grid.bars('short-2')).toHaveText('Half hour')
	})

	test('displayEventEnd runs the time to the end', async ({ page }) => {
		const grid = await openWeek(page, 'short-events', {
			eventTimeFormat: TWENTY_FOUR_HOUR,
			displayEventEnd: 'true',
		})

		const barText = await grid.bars('short-2').textContent()
		expect(plain(barText)).toBe('09:30 – 10:00Half hour')
	})

	test('displayEventEnd on an overnight event writes times only', async ({
		page,
	}) => {
		const grid = await openWeek(page, 'overnight-event', {
			eventTimeFormat: TWENTY_FOUR_HOUR,
			displayEventEnd: 'true',
		})

		const firstBar = grid.bars('overnight-1').first()
		const barText = await firstBar.textContent()
		expect(plain(barText)).toBe('22:00 – 02:00Night shift')
	})

	test('an all-day event gets no time text', async ({ page }) => {
		const grid = await openWeek(page, 'all-day-events', {
			eventTimeFormat: TWENTY_FOUR_HOUR,
			displayEventTime: 'true',
		})

		await expect(grid.allDayRow).toContainText('Public holiday')
		await expect(grid.allDayRow).not.toContainText(/\d:\d\d/)
	})

	test('slotHeaderFormat changes the gutter labels', async ({ page }) => {
		const grid = await openWeek(page, 'short-events', {
			slotHeaderFormat: TWENTY_FOUR_HOUR,
		})

		await expect(grid.hourLabels.filter({ hasText: /^09:00$/ })).toHaveCount(1)
		await expect(grid.bars('short-2')).toHaveText('Half hour')
	})

	test('timeFormat decides 12 or 24 hour when the format leaves it open', async ({
		page,
	}) => {
		const grid = await openWeek(page, 'short-events', {
			slotHeaderFormat: JSON.stringify({ hour: '2-digit', minute: '2-digit' }),
			timeFormat: '24-hour',
		})

		await expect(grid.hourLabels.filter({ hasText: /^09:00$/ })).toHaveCount(1)
	})

	test('dayHeaderFormat uses the calendar locale', async ({ page }) => {
		await openWeek(page, 'short-events', {
			dayHeaderFormat: JSON.stringify({ weekday: 'long' }),
			locale: 'de',
		})

		await expect(page.getByTestId('week-header-weekday-wednesday')).toHaveText(
			'Mittwoch'
		)
	})

	test('dayHeaderFormat changes the weekday label', async ({ page }) => {
		await openWeek(page, 'short-events', {
			dayHeaderFormat: JSON.stringify({ weekday: 'long' }),
		})

		await expect(page.getByTestId('week-header-weekday-wednesday')).toHaveText(
			'Wednesday'
		)
	})

	test('dayHeaderFormat reaches the month and resource headers', async ({
		page,
	}) => {
		const dayHeaderFormat = JSON.stringify({ weekday: 'long' })

		await gotoScenario(page, {
			scenario: 'short-events',
			view: 'month',
			settings: { dayHeaderFormat },
		})
		await expect(page.getByTestId('month-header-weekday-wed')).toHaveText(
			'Wednesday'
		)

		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { dayHeaderFormat },
		})
		await expect(
			page.getByTestId('resource-week-day-header').nth(3)
		).toContainText('Wednesday')
	})

	test('dayHeaderFormat can carry the day number itself', async ({ page }) => {
		await openWeek(page, 'short-events', {
			dayHeaderFormat: JSON.stringify({ weekday: 'short', day: 'numeric' }),
		})

		// The order of weekday and day is the engine's own ("Wed 12" or "12 Wed").
		const expected = await page.evaluate(() =>
			new Intl.DateTimeFormat('en', {
				weekday: 'short',
				day: 'numeric',
				timeZone: 'UTC',
			}).format(new Date('2025-03-12T09:00:00.000Z'))
		)
		await expect(page.getByTestId('week-header-weekday-wednesday')).toHaveText(
			expected
		)
	})

	test('dayHeaderFormat is the whole day view header', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { dayHeaderFormat: JSON.stringify({ weekday: 'long' }) },
		})

		await expect(page.getByTestId('day-view-header')).toContainText('Wednesday')
		await expect(page.getByTestId('day-view-header')).not.toContainText('March')
	})

	test('the day view header is unchanged without dayHeaderFormat', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'short-events', view: 'day' })

		await expect(page.getByTestId('day-view-header')).toContainText(
			'Wednesday, March 12, 2025'
		)
	})

	test('the locale decides 12 or 24 hour when timeFormat is not passed', async ({
		page,
	}) => {
		const grid = await openWeek(page, 'short-events', {
			slotHeaderFormat: JSON.stringify({ hour: '2-digit', minute: '2-digit' }),
			eventTimeFormat: JSON.stringify({ hour: '2-digit', minute: '2-digit' }),
			locale: 'de',
		})

		await expect(grid.hourLabels.filter({ hasText: /^09:00$/ })).toHaveCount(1)
		await expect(grid.bars('short-2')).toHaveText('09:30Half hour')
	})

	test('titleFormat changes the toolbar title', async ({ page }) => {
		const grid = await openWeek(page, 'short-events', {
			titleFormat: JSON.stringify({ month: 'long', year: 'numeric' }),
		})

		await expect(grid.title).toHaveText('March 2025')
	})

	test('a bad format is reported rather than guessed', async ({ page }) => {
		await page.goto(
			'/?scenario=short-events&view=week&titleFormat=not-json&tz=UTC'
		)

		await expect(
			page.getByText('titleFormat: expected a JSON object')
		).toBeVisible()
	})
})
