import {
	type Browser,
	expect,
	type Locator,
	type Page,
	test,
} from '@playwright/test'
import {
	allDayBox,
	dateButtons,
	formDialog,
	pickDay,
	pickTime,
	saveForm,
	submitButton,
	timeShown,
} from './support/event-form'
import { gotoScenario } from './support/harness'
import { CalendarPage, MonthGrid, TimeGrid, YearGrid } from './support/pages'

/*
 * Instants around a clock change, seen through the form, the grids and
 * navigation.
 *
 * A dayjs date keeps the UTC offset it was built with through `.add()`,
 * `.subtract()` and `.hour()`, so on a day the clocks change it reads the right
 * clock face while being an hour off as an instant: the previous day at
 * midnight, or 10:00 where 9:00 was picked. Everything below is observed
 * through the real UI, in the zone whose clocks change, and asserts the instant
 * a consumer is handed. New York went forward on Sunday 9 March 2025 and back
 * on Sunday 2 November.
 */

const NEW_YORK = 'America/New_York'
const SPRING_FORWARD_DAY = '2025-03-09T12:00:00.000Z'
// 9 Mar 00:00 EST to 10 Mar 00:00 EDT.
const SPRING_DAY_START = '2025-03-09T05:00:00.000Z'
const SPRING_DAY_END = '2025-03-10T04:00:00.000Z'

const newYorkPage = async (browser: Browser) => {
	const context = await browser.newContext({
		timezoneId: NEW_YORK,
		locale: 'en-US',
		viewport: { width: 1280, height: 900 },
	})
	return { context, page: await context.newPage() }
}

/** A real pointer click at the centre: bars are aria-disabled when not draggable. */
const pointerClick = async (page: Page, target: Locator) => {
	const box = await target.boundingBox()
	if (!box) {
		throw new Error('target has no box')
	}
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

const lastRow = async (calendar: CalendarPage) =>
	(await calendar.eventState()).at(-1)

test.describe('New York, the day the clocks go forward (9 Mar 2025)', () => {
	test('a day-view all-day cell creates the event on the day being viewed', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'day',
			timezone: NEW_YORK,
			date: SPRING_FORWARD_DAY,
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await expect(grid.title).toHaveText('Sun, Mar 9, 2025')
		await grid.allDayRow.locator('[data-testid^="day-cell-"]').first().click()
		await formDialog(page).waitFor()
		await expect(dateButtons(page).nth(0)).toHaveText('Mar 9, 2025')
		await saveForm(page)
		const row = await lastRow(grid)
		expect(row?.start).toBe(SPRING_DAY_START)
		expect(row?.end).toBe(SPRING_DAY_END)
		await context.close()
	})

	test('every all-day cell of the week reports its own midnight', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			timezone: NEW_YORK,
			date: SPRING_FORWARD_DAY,
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const starts = await grid.allDayRow
			.locator('[data-testid^="day-cell-"]')
			.evaluateAll((cells) =>
				cells.map((cell) => cell.getAttribute('data-start'))
			)
		expect(starts).toEqual([
			'2025-03-09T05:00:00.000Z',
			'2025-03-10T04:00:00.000Z',
			'2025-03-11T04:00:00.000Z',
			'2025-03-12T04:00:00.000Z',
			'2025-03-13T04:00:00.000Z',
			'2025-03-14T04:00:00.000Z',
			'2025-03-15T04:00:00.000Z',
		])
		await context.close()
	})

	test('ticking All day on the month cell keeps End Date on the day and saves one whole day', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			timezone: NEW_YORK,
			date: SPRING_FORWARD_DAY,
		})
		const month = new MonthGrid(page)
		await month.cellOn('2025-03-09').click()
		await formDialog(page).waitFor()
		await allDayBox(page).click()
		await expect(dateButtons(page).nth(0)).toHaveText('Mar 9, 2025')
		await expect(dateButtons(page).nth(1)).toHaveText('Mar 9, 2025')
		await saveForm(page)
		const row = await lastRow(month)
		expect(row?.start).toBe(SPRING_DAY_START)
		expect(row?.end).toBe(SPRING_DAY_END)
		await context.close()
	})

	test('updating an untouched one-day all-day event keeps its range', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			timezone: NEW_YORK,
			date: SPRING_FORWARD_DAY,
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await grid.allDayRow
			.locator('[data-testid^="day-cell-"][data-start*="2025-03-09"]')
			.click()
		await formDialog(page).waitFor()
		await saveForm(page)
		const created = await lastRow(grid)
		expect(created?.start).toBe(SPRING_DAY_START)
		expect(created?.end).toBe(SPRING_DAY_END)

		await pointerClick(page, grid.event('New Event').first())
		await formDialog(page).waitFor()
		await expect(dateButtons(page).nth(1)).toHaveText('Mar 9, 2025')
		await saveForm(page)
		const after = await lastRow(grid)
		expect(after?.start).toBe(created?.start)
		expect(after?.end).toBe(created?.end)
		await context.close()
	})

	test('ticking All day on a timed event saves it from its own midnight', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			timezone: NEW_YORK,
			date: SPRING_FORWARD_DAY,
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await grid.slotAt('2025-03-09T14:00').first().click()
		await formDialog(page).waitFor()
		await allDayBox(page).click()
		await saveForm(page)
		const row = await lastRow(grid)
		expect(row?.start).toBe(SPRING_DAY_START)
		expect(row?.end).toBe(SPRING_DAY_END)
		await context.close()
	})

	test('a picked 9:00 AM is saved as 9:00 AM', async ({ browser }) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			timezone: NEW_YORK,
			date: SPRING_FORWARD_DAY,
		})
		const month = new MonthGrid(page)
		await month.cellOn('2025-03-09').click()
		await formDialog(page).waitFor()
		await pickTime(page, 'start', '9:00 AM')
		await saveForm(page)
		const row = await lastRow(month)
		// 9:00 EDT.
		expect(row?.start).toBe('2025-03-09T13:00:00.000Z')
		await context.close()
	})
})

// The clocks went back on Sunday 2 November: a day after it, built with `add`,
// was an hour early as an instant (the day before, at 23:00), though its clock
// face read right, so only the date handed to the calendar shows it.
test.describe('New York, the week the clocks go back, in the year view', () => {
	test('a mini-calendar day after the change opens that day', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'year',
			timezone: NEW_YORK,
			date: '2025-11-01T12:00:00.000Z',
			settings: { externalToolbar: 'true' },
		})
		await new YearGrid(page).monthCards.first().waitFor()
		await page.getByTestId('year-day-2025-11-2025-11-03').click()
		await expect(new CalendarPage(page).title).toHaveText('Mon, Nov 3, 2025')
		// The calendar's date is the day's own midnight (EST), not 23:00 the day before.
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-11-03T05:00:00.000Z'
		)
		await context.close()
	})
})

test.describe('New York, navigating over the day the clocks go back', () => {
	// 00:30 EDT on Sunday 2 Nov. One day on is 00:30 EST, which `add` used to
	// give as 23:30 EST on the 2nd (the previous day) because it kept EDT's offset.
	test('next and previous keep the clock time the consumer is handed', async ({
		browser,
	}) => {
		const { context, page } = await newYorkPage(browser)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'day',
			timezone: NEW_YORK,
			date: '2025-11-02T04:30:00.000Z',
			settings: { externalToolbar: 'true' },
		})
		const date = page.getByTestId('external-date')
		await page.getByTestId('external-next').click()
		await expect(date).toHaveText('2025-11-03T05:30:00.000Z')
		await page.getByTestId('external-prev').click()
		await expect(date).toHaveText('2025-11-02T04:30:00.000Z')
		await context.close()
	})
})

/*
 * The form's date picker reads its days from `getWeekDays` and
 * `getMonthWeeks`; the days right after a change used to be the previous day
 * as an instant, so picking one selected the day before.
 */
const pickerDaysAfterChange = [
	{
		zone: 'America/New_York',
		date: '2025-11-01T12:00:00.000Z',
		days: [3, 4, 5, 6, 7, 8],
		label: 'Nov',
	},
	{
		zone: 'Europe/London',
		date: '2025-10-20T12:00:00.000Z',
		days: [27, 28, 29],
		label: 'Oct',
	},
	{
		zone: 'Australia/Sydney',
		date: '2025-04-01T12:00:00.000Z',
		days: [7, 8, 9, 10, 11, 12],
		label: 'Apr',
	},
] as const

test.describe('the form date picker after a clock change', () => {
	for (const { zone, date, days, label } of pickerDaysAfterChange) {
		test(`${zone}: picking ${days.at(0)}-${days.at(-1)} ${label} shows that day`, async ({
			browser,
		}) => {
			const context = await browser.newContext({
				timezoneId: zone,
				locale: 'en-US',
				viewport: { width: 1280, height: 900 },
			})
			const page = await context.newPage()
			await gotoScenario(page, {
				scenario: 'basic',
				view: 'month',
				timezone: zone,
				date,
			})
			await page.getByRole('button', { name: /New/ }).click()
			await formDialog(page).waitFor()
			const shown: string[] = []
			for (const day of days) {
				await pickDay(page, 1, day)
				shown.push((await dateButtons(page).nth(1).textContent())?.trim() ?? '')
			}
			expect(shown).toEqual(days.map((day) => `${label} ${day}, 2025`))
			await context.close()
		})
	}
})

test.describe('the event form keeps its dates and times consistent', () => {
	// RFC 5545 section 3.8.2.2: DTEND "MUST be later in time than" DTSTART. The
	// first two specs used to pin start == end; the contract moved deliberately:
	// the edge the user did not touch moves to keep the length the form opened
	// with (the slot's hour), so the event is never zero-length.
	test('End Date moved back to the start day after an earlier End Time does not invert the event', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await grid.slotAt('2025-03-12T13:00').first().click()
		await formDialog(page).waitFor()
		await pickDay(page, 1, 13)
		await pickTime(page, 'end', '9:00 AM')
		await pickDay(page, 1, 12)
		await saveForm(page)
		const row = await lastRow(grid)
		expect(row?.start).toBe('2025-03-12T08:00:00.000Z')
		expect(row?.end).toBe('2025-03-12T09:00:00.000Z')
	})

	test('Start Date moved to the end day after an earlier End Time does not invert the event', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await grid.slotAt('2025-03-12T13:00').first().click()
		await formDialog(page).waitFor()
		await pickDay(page, 1, 13)
		await pickTime(page, 'end', '9:00 AM')
		await pickDay(page, 0, 13)
		await saveForm(page)
		const row = await lastRow(grid)
		expect(row?.start).toBe('2025-03-13T13:00:00.000Z')
		expect(row?.end).toBe('2025-03-13T14:00:00.000Z')
	})

	test('unticking All day gives the times back as they were', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await grid.slotAt('2025-03-12T13:00').first().click()
		await formDialog(page).waitFor()
		await allDayBox(page).click()
		await allDayBox(page).click()
		expect(await timeShown(page, 'start')).toBe('1:00 PM')
		expect(await timeShown(page, 'end')).toBe('2:00 PM')
		await expect(submitButton(page)).toBeEnabled()
		await saveForm(page)
		const row = await lastRow(grid)
		expect(row?.start).toBe('2025-03-12T13:00:00.000Z')
		expect(row?.end).toBe('2025-03-12T14:00:00.000Z')
	})
})
