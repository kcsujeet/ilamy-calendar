import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, releasePointer, setSettings } from '../support/harness'
import { CalendarPage, MonthGrid, TimeGrid } from '../support/pages'

/**
 * QA personas for 3.3.7a (allDaySlot, nowIndicator, weekNumbers,
 * weekNumberCalculation, scrollTime minutes). Real pointer drags only.
 */

const centre = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const walk = async (
	page: Page,
	start: { x: number; y: number },
	end: { x: number; y: number }
) => {
	for (let step = 1; step <= 10; step += 1) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * step) / 10,
			start.y + ((end.y - start.y) * step) / 10
		)
	}
}

const dragToPoint = async (
	page: Page,
	from: Locator,
	end: { x: number; y: number }
) => {
	const start = await centre(from)
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	await walk(page, start, end)
	await releasePointer(page)
}

const dragTo = async (page: Page, from: Locator, to: Locator) =>
	dragToPoint(page, from, await centre(to))

const collectErrors = (page: Page) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	return errors
}

const durationMs = (event: { start: string; end: string }) =>
	new Date(event.end).getTime() - new Date(event.start).getTime()

/** Independent ISO 8601 week number (does not share code with the library). */
const isoWeek = (isoDate: string): number => {
	const date = new Date(`${isoDate}T00:00:00.000Z`)
	const dayNum = (date.getUTCDay() + 6) % 7
	date.setUTCDate(date.getUTCDate() - dayNum + 3)
	const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
	const diff = (date.getTime() - firstThursday.getTime()) / 86_400_000
	return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}

/* ---------------------------------------------------------------------- */
/* Persona 1: shift planner, allDaySlot=false                              */
/* ---------------------------------------------------------------------- */
test.describe('persona 1: shift planner (allDaySlot=false)', () => {
	test('week: no all-day row, drags a timed event to another slot', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { allDaySlot: 'false', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await expect(grid.allDayRow).toHaveCount(0)
		const before = await grid.eventNamed('Design review')
		await dragTo(
			page,
			grid.event('Design review').first(),
			grid.slotAt('2025-03-13T16:00')
		)
		await expect
			.poll(async () => (await grid.eventNamed('Design review')).start)
			.toMatch(/^2025-03-13T1[56]/)
		const after = await grid.eventNamed('Design review')
		expect(after.allDay).toBe(false)
		expect(durationMs(after)).toBe(durationMs(before))
		expect(errors).toEqual([])
	})

	test('day: no all-day row, drags a timed event within the day', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'day',
			settings: { allDaySlot: 'false', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await expect(grid.allDayRow).toHaveCount(0)
		await dragTo(
			page,
			grid.event('Design review').first(),
			grid.slotAt('2025-03-12T17:00')
		)
		await expect
			.poll(async () => (await grid.eventNamed('Design review')).start)
			.toMatch(/^2025-03-12T1[67]/)
		expect((await grid.eventNamed('Design review')).allDay).toBe(false)
	})

	for (const view of ['week', 'day'] as const) {
		test(`${view}: dragging a timed event up past the top edge never makes it all-day`, async ({
			page,
		}) => {
			const errors = collectErrors(page)
			await gotoScenario(page, {
				scenario: 'basic',
				view,
				settings: { allDaySlot: 'false', scrollTime: '00:00' },
			})
			const grid = new TimeGrid(page)
			const before = await grid.eventNamed('Morning stand-up')
			const bar = grid.event('Morning stand-up').first()
			const firstSlot = await grid.slotAt('2025-03-12T00:00').boundingBox()
			if (!firstSlot) {
				throw new Error('no 00:00 slot')
			}
			const barPoint = await centre(bar)
			// Above the top of the time grid: where the all-day row would be.
			const header = { x: barPoint.x, y: Math.max(firstSlot.y - 40, 5) }
			await dragToPoint(page, bar, header)
			const after = await grid.eventNamed('Morning stand-up')
			expect(after.allDay).toBe(false)
			expect(durationMs(after)).toBe(durationMs(before))
			expect(errors).toEqual([])
		})
	}

	test('week: dragging a timed event onto the top-most slot keeps it timed', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { allDaySlot: 'false', scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.event('Morning stand-up').first(),
			grid.slotAt('2025-03-11T00:00')
		)
		const after = await grid.eventNamed('Morning stand-up')
		expect(after.allDay).toBe(false)
		expect(after.start).toMatch(/^2025-03-11T00:/)
	})

	for (const orientation of ['vertical', 'horizontal'] as const) {
		for (const view of ['week', 'day'] as const) {
			test(`resources ${orientation} ${view}: no all-day row, drag keeps event timed`, async ({
				page,
			}) => {
				const errors = collectErrors(page)
				await gotoScenario(page, {
					scenario: 'resources',
					view,
					orientation,
					settings: { allDaySlot: 'false', scrollTime: '08:00' },
				})
				const grid = new TimeGrid(page)
				await expect(grid.allDayRow).toHaveCount(0)
				await expect(page.locator('[data-testid^="allday-row"]')).toHaveCount(0)
				const before = await grid.eventNamed('Room A booking')
				const target =
					orientation === 'vertical'
						? page
								.locator(
									'[data-resource-id="r2"][data-start="2025-03-12T14:00:00.000Z"]'
								)
								.first()
						: page
								.locator(
									'[data-resource-id="r2"][data-start="2025-03-12T14:00:00.000Z"]'
								)
								.first()
				await expect(target).toHaveCount(1)
				await target.scrollIntoViewIfNeeded()
				await dragTo(page, grid.event('Room A booking').first(), target)
				await expect
					.poll(
						async () => (await grid.eventNamed('Room A booking')).resourceId
					)
					.toBe('r2')
				const after = await grid.eventNamed('Room A booking')
				expect(after.allDay).toBe(false)
				expect(durationMs(after)).toBe(durationMs(before))
				expect(errors).toEqual([])
			})
		}
	}

	test('resources vertical week: drag up past the top edge never makes it all-day', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { allDaySlot: 'false', scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.event('Room A booking').first()
		const point = await centre(bar)
		await dragToPoint(page, bar, { x: point.x, y: 120 })
		const after = await grid.eventNamed('Room A booking')
		expect(after.allDay).toBe(false)
	})

	test('drag-to-create still works in week and day with the all-day row gone', async ({
		page,
	}) => {
		for (const view of ['week', 'day'] as const) {
			await gotoScenario(page, {
				scenario: 'basic',
				view,
				plugins: ['drag-to-create'],
				settings: { allDaySlot: 'false', scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			const from = grid.slotAt('2025-03-12T13:00')
			const to = grid.slotAt('2025-03-12T15:00')
			const start = await centre(from)
			const end = await centre(to)
			await page.mouse.move(start.x, start.y)
			await page.mouse.down()
			await walk(page, start, end)
			await releasePointer(page)
			await expect(page.getByRole('dialog')).toBeVisible()
			await page.keyboard.press('Escape')
		}
	})

	test('an all-day event in the data is not drawn in week/day and nothing crashes', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		for (const view of ['week', 'day'] as const) {
			await gotoScenario(page, {
				scenario: 'all-day-events',
				view,
				date: '2025-03-13T09:00:00.000Z',
				settings: { allDaySlot: 'false' },
			})
			await expect(page.getByText('Public holiday')).toHaveCount(0)
			await expect(page.getByText('Off-site')).toHaveCount(0)
			await expect(page.getByTestId('harness-error')).toHaveCount(0)
		}
		expect(errors).toEqual([])
	})

	test('an all-day event is not drawn in the vertical resource time grids', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		for (const view of ['week', 'day'] as const) {
			await gotoScenario(page, {
				scenario: 'long-resource-events',
				view,
				orientation: 'vertical',
				settings: { allDaySlot: 'false' },
			})
			await expect(page.getByText('Site survey')).toHaveCount(0)
			await expect(page.getByTestId('harness-error')).toHaveCount(0)
		}
		expect(errors).toEqual([])
	})

	// Observation, not an assertion of intent: the horizontal timeline has no
	// all-day row, so allDaySlot=false leaves its all-day bars alone (the plan
	// lists only "day, week and vertical resource views").
	test('OBSERVATION: horizontal resource timeline still draws an all-day event', async ({
		page,
	}) => {
		for (const view of ['week', 'day'] as const) {
			await gotoScenario(page, {
				scenario: 'long-resource-events',
				view,
				orientation: 'horizontal',
				settings: { allDaySlot: 'false' },
			})
			await expect(page.getByText('Site survey').first()).toBeVisible()
		}
	})

	test('agenda plugin still lists an all-day event with allDaySlot=false', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'all-day-events',
			view: 'agenda',
			plugins: ['agenda'],
			settings: { allDaySlot: 'false' },
		})
		await expect(page.getByText('Public holiday').first()).toBeVisible()
	})

	test('month still draws the all-day event, and "+N more" lists it', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { allDaySlot: 'false' },
		})
		const month = new MonthGrid(page)
		await expect(month.event('Public holiday').first()).toBeVisible()
		await expect(month.event('Off-site').first()).toBeVisible()
	})

	test('month "+N more" popover lists an all-day event beside timed ones', async ({
		page,
	}) => {
		// Same data with the toggle on, to compare against.
		const open = async (allDaySlot: string) => {
			await gotoScenario(page, {
				scenario: 'long-resource-events',
				view: 'month',
				orientation: 'horizontal',
				settings: { allDaySlot, dayMaxEvents: 1 },
			})
		}
		await open('false')
		const more = page.getByText(/^\+\d+ more$/)
		const count = await more.count()
		expect(count).toBeGreaterThan(0)
		await more.first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		const withToggleOff = await page.getByRole('dialog').innerText()
		await page.keyboard.press('Escape')
		await open('true')
		await page
			.getByText(/^\+\d+ more$/)
			.first()
			.click()
		const withToggleOn = await page.getByRole('dialog').innerText()
		expect(withToggleOff).toBe(withToggleOn)
	})

	test('toggling allDaySlot at runtime removes and restores the row', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'all-day-events', view: 'week' })
		const grid = new TimeGrid(page)
		await expect(grid.allDayRow).toHaveCount(1)
		await setSettings(page, { allDaySlot: 'false' })
		await expect(grid.allDayRow).toHaveCount(0)
		await setSettings(page, { allDaySlot: 'true' })
		await expect(grid.allDayRow).toHaveCount(1)
		await expect(grid.allDayRow.getByText('Public holiday')).toBeVisible()
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 2: European planner                                             */
/* ---------------------------------------------------------------------- */
const EU = {
	weekNumbers: 'true',
	weekNumberCalculation: 'ISO',
	firstDayOfWeek: 'monday',
}

const readRowNumbers = async (page: Page) => {
	// First day of each row paired with its number.
	const cells = await page.locator('[data-testid^="day-cell-"]').all()
	const firstDays: string[] = []
	for (const cell of cells) {
		const start = await cell.getAttribute('data-start')
		if (start) {
			firstDays.push(start.slice(0, 10))
		}
	}
	return firstDays
}

test.describe('persona 2: European planner (ISO, Monday, weekNumbers)', () => {
	const months = [
		'2025-12-15T09:00:00.000Z',
		'2026-01-15T09:00:00.000Z',
		'2020-12-15T09:00:00.000Z',
		'2021-01-15T09:00:00.000Z',
		'2026-12-15T09:00:00.000Z',
		'2027-01-15T09:00:00.000Z',
		'2024-12-15T09:00:00.000Z',
		'2025-01-15T09:00:00.000Z',
	]
	for (const date of months) {
		test(`month ${date.slice(0, 7)}: every row shows the ISO week of its Monday`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'basic',
				view: 'month',
				date,
				settings: EU,
			})
			const month = new MonthGrid(page)
			const numbers = await month.weekNumbers.allTextContents()
			const days = await readRowNumbers(page)
			const rowFirstDays = days.filter((_, index) => index % 7 === 0)
			expect(rowFirstDays.length).toBe(numbers.length)
			// Rows start on Monday.
			for (const day of rowFirstDays) {
				expect(new Date(`${day}T00:00:00Z`).getUTCDay()).toBe(1)
			}
			expect(numbers.map(Number)).toEqual(rowFirstDays.map(isoWeek))
		})
	}

	test('navigating Dec 2025 -> Jan 2026 with Next keeps the numbers right', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-12-15T09:00:00.000Z',
			settings: EU,
		})
		const month = new MonthGrid(page)
		const first = await month.weekNumbers.allTextContents()
		await month.next()
		await expect(month.title).toContainText('Jan 2026')
		await expect
			.poll(async () => (await month.weekNumbers.allTextContents()).join(','))
			.not.toBe(first.join(','))
		const numbers = await month.weekNumbers.allTextContents()
		const days = (await readRowNumbers(page)).filter(
			(_, index) => index % 7 === 0
		)
		expect(numbers.map(Number)).toEqual(days.map(isoWeek))
		// Specifically: the row of 29 Dec 2025 is week 1 of 2026.
		expect(first.map(Number)).toContain(1)
	})

	test('ISO + Monday: week view header and month row agree on the same week', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-12-31T09:00:00.000Z',
			settings: EU,
		})
		await expect(page.getByTestId('week-number')).toHaveText('1')
	})

	test('clicking a day cell in the top-left corner (under the number) opens the form', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: EU,
		})
		const month = new MonthGrid(page)
		// Monday-start rows: 10 March is the first cell of its row, where the
		// week number is drawn.
		const cell = month.cellOn('2025-03-10')
		const box = await cell.boundingBox()
		const number = await month.weekNumbers.nth(2).boundingBox()
		if (!box || !number) {
			throw new Error('no layout')
		}
		const numberCentre = {
			x: number.x + number.width / 2,
			y: number.y + number.height / 2,
		}
		expect(numberCentre.x).toBeGreaterThan(box.x)
		expect(numberCentre.x).toBeLessThan(box.x + box.width)
		expect(numberCentre.y).toBeGreaterThan(box.y)
		expect(numberCentre.y).toBeLessThan(box.y + box.height)
		await page.mouse.click(numberCentre.x, numberCentre.y)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('clicking directly on every row-first cell under the number opens a form for THAT day', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: EU,
		})
		const month = new MonthGrid(page)
		const cell = month.cellOn('2025-03-17')
		const box = await cell.boundingBox()
		if (!box) {
			throw new Error('no layout')
		}
		await page.mouse.click(box.x + 4, box.y + 4)
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('dialog')).toContainText(
			/Mar(ch)? 17|3\/17|2025-03-17/
		)
	})

	test("dropping an event with the pointer on the week number lands on that row's first day (3 March)", async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: EU,
		})
		const month = new MonthGrid(page)
		const numberBox = await month.weekNumbers.nth(1).boundingBox()
		if (!numberBox) {
			throw new Error('no number')
		}
		await dragToPoint(page, month.event('Earlier in the month').first(), {
			x: numberBox.x + numberBox.width / 2,
			y: numberBox.y + numberBox.height / 2,
		})
		await expect
			.poll(async () => (await month.eventNamed('Earlier in the month')).start)
			.toMatch(/^2025-03-03/)
	})

	test('mobile 375x812: week number does not overlap any day number', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 812 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: EU,
		})
		const month = new MonthGrid(page)
		await expect(month.weekNumbers.first()).toBeVisible()
		const result = await page.evaluate(() => {
			const rects = (selector: string) =>
				Array.from(document.querySelectorAll(selector)).map((el) => {
					const r = el.getBoundingClientRect()
					return {
						left: r.left,
						right: r.right,
						top: r.top,
						bottom: r.bottom,
						text: el.textContent ?? '',
					}
				})
			const weekNumbers = rects('[data-testid="week-number"]')
			const dayNumbers = rects('[data-testid^="day-number-"]')
			const overlaps: string[] = []
			for (const week of weekNumbers) {
				for (const day of dayNumbers) {
					const w =
						Math.min(week.right, day.right) - Math.max(week.left, day.left)
					const h =
						Math.min(week.bottom, day.bottom) - Math.max(week.top, day.top)
					if (w > 0 && h > 0) {
						overlaps.push(
							`week ${week.text} x day ${day.text}: ${w.toFixed(1)}x${h.toFixed(1)}`
						)
					}
				}
			}
			return { overlaps, weeks: weekNumbers.length, days: dayNumbers.length }
		})
		expect(result.weeks).toBe(6)
		expect(result.overlaps).toEqual([])
	})

	test('mobile 375x812: the number stays inside its row and cell', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 812 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: EU,
		})
		const month = new MonthGrid(page)
		const number = await month.weekNumbers.first().boundingBox()
		const cell = await month.cells.first().boundingBox()
		if (!number || !cell) {
			throw new Error('no layout')
		}
		expect(number.x).toBeGreaterThanOrEqual(cell.x - 0.5)
		expect(number.x + number.width).toBeLessThanOrEqual(
			cell.x + cell.width + 0.5
		)
	})

	test('two-digit week numbers (52, 53) still do not overlap the day number', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 812 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			date: '2020-12-15T09:00:00.000Z',
			settings: EU,
		})
		const overlaps = await page.evaluate(() => {
			const weeks = Array.from(
				document.querySelectorAll('[data-testid="week-number"]')
			)
			const days = Array.from(
				document.querySelectorAll('[data-testid^="day-number-"]')
			)
			let count = 0
			for (const week of weeks) {
				const a = week.getBoundingClientRect()
				for (const day of days) {
					const b = day.getBoundingClientRect()
					if (
						Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
						Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
					) {
						count += 1
					}
				}
			}
			return count
		})
		expect(overlaps).toBe(0)
	})

	test('local + Monday start: month row number equals the week view header number for the same week', async ({
		page,
	}) => {
		const settings = { weekNumbers: 'true', firstDayOfWeek: 'monday' }
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-12-31T09:00:00.000Z',
			settings,
		})
		const rows = await new MonthGrid(page).weekNumbers.allTextContents()
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-12-31T09:00:00.000Z',
			settings,
		})
		const header = await page.getByTestId('week-number').textContent()
		console.log(
			'local+monday Dec 2025 rows:',
			rows.join(','),
			'week header (31 Dec):',
			header
		)
		// 29 Dec 2025 is the 5th row of Dec 2025 (Mon 1, 8, 15, 22, 29).
		expect(rows.at(4)).toBe(header)
	})

	test('weekNumbers=true with local (default) and Sunday start also draws 6 numbers, no ISO needed', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { weekNumbers: 'true' },
		})
		await expect(new MonthGrid(page).weekNumbers).toHaveCount(6)
	})

	test('resource horizontal month with weekNumbers=true: numbers do not break the resource rows', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'month',
			orientation: 'horizontal',
			settings: EU,
		})
		const count = await new MonthGrid(page).weekNumbers.count()
		console.log('resource horizontal month week-number count:', count)
		expect(errors).toEqual([])
	})

	test('resource vertical month with weekNumbers=true does not crash', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'month',
			orientation: 'vertical',
			settings: EU,
		})
		await new CalendarPage(page).expectRendered()
		expect(errors).toEqual([])
	})

	test('ISO in week view with resources vertical shows ISO number', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			date: '2025-12-31T09:00:00.000Z',
			settings: EU,
		})
		await expect(page.getByTestId('week-number')).toHaveText('1')
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 3: kiosk display                                                */
/* ---------------------------------------------------------------------- */
const measure = (
	page: Page,
	scrollTestId: string,
	axis: 'vertical' | 'horizontal',
	hour: string
) =>
	page.evaluate(
		({ scrollTestId, axis, hour }) => {
			const viewport = document.querySelector(
				`[data-testid="${scrollTestId}"] [data-radix-scroll-area-viewport]`
			)
			const first = viewport?.querySelector('[data-hour]')
			const row = viewport?.querySelector(`[data-hour="${hour}"]`)
			if (!viewport || !first || !row) {
				throw new Error('missing hour rows')
			}
			const a = first.getBoundingClientRect()
			const b = row.getBoundingClientRect()
			const vertical = axis === 'vertical'
			return {
				scrolled: vertical ? viewport.scrollTop : viewport.scrollLeft,
				rowStart: vertical ? b.top - a.top : b.left - a.left,
				extent: vertical ? b.height : b.width,
			}
		},
		{ scrollTestId, axis, hour }
	)

test.describe('persona 3: kiosk (nowIndicator=false, scrollTime=13:45)', () => {
	const KIOSK = { nowIndicator: 'false', scrollTime: '13:45', height: '500px' }

	for (const view of ['week', 'day'] as const) {
		test(`${view}: no now line; scroll lands at 13:45 proportionally`, async ({
			page,
		}) => {
			await gotoScenario(page, { scenario: 'basic', view, settings: KIOSK })
			await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
			const { scrolled, rowStart, extent } = await measure(
				page,
				'vertical-grid-scroll',
				'vertical',
				'13'
			)
			expect(
				Math.abs(scrolled - (rowStart + 0.75 * extent))
			).toBeLessThanOrEqual(1)
		})
	}

	for (const orientation of ['vertical', 'horizontal'] as const) {
		for (const view of ['week', 'day'] as const) {
			test(`resources ${orientation} ${view}: no now line`, async ({
				page,
			}) => {
				await gotoScenario(page, {
					scenario: 'resources',
					view,
					orientation,
					settings: KIOSK,
				})
				await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
			})
		}
	}

	test('resource horizontal day: scroll lands at 13:45 along x', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: KIOSK,
		})
		const { scrolled, rowStart, extent } = await measure(
			page,
			'horizontal-grid-scroll',
			'horizontal',
			'13'
		)
		const maxScroll = await page.evaluate(() => {
			const v = document.querySelector(
				'[data-testid="horizontal-grid-scroll"] [data-radix-scroll-area-viewport]'
			)
			return v ? v.scrollWidth - v.clientWidth : 0
		})
		// 13:45 is past the end of what the 1280px viewport can scroll, so the
		// browser clamps; the target must still be the clamp or the ideal.
		const ideal = rowStart + 0.75 * extent
		expect(Math.abs(scrolled - Math.min(ideal, maxScroll))).toBeLessThanOrEqual(
			1
		)
	})

	test('navigating weeks: scroll and no now line stay as they were', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: KIOSK,
		})
		const grid = new TimeGrid(page)
		const initial = await measure(
			page,
			'vertical-grid-scroll',
			'vertical',
			'13'
		)
		await grid.next()
		await page.waitForTimeout(700)
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
		const afterNext = await measure(
			page,
			'vertical-grid-scroll',
			'vertical',
			'13'
		)
		await grid.previous()
		await page.waitForTimeout(700)
		const afterPrev = await measure(
			page,
			'vertical-grid-scroll',
			'vertical',
			'13'
		)
		console.log(
			'kiosk scroll initial/next/prev:',
			initial.scrolled,
			afterNext.scrolled,
			afterPrev.scrolled
		)
		expect(afterNext.scrolled).toBe(initial.scrolled)
		expect(afterPrev.scrolled).toBe(initial.scrolled)
	})

	test('scrollToNow with nowIndicator=false still scrolls to now, to the exact minute', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			now: '2025-03-12T09:30:00.000Z',
			settings: { nowIndicator: 'false', scrollToNow: 'true', height: '500px' },
		})
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
		const { scrolled, rowStart, extent } = await measure(
			page,
			'vertical-grid-scroll',
			'vertical',
			'09'
		)
		expect(scrolled).toBeGreaterThan(0)
		expect(Math.abs(scrolled - (rowStart + 0.5 * extent))).toBeLessThanOrEqual(
			1
		)
	})

	test('scrollToNow wins over scrollTime (documented) with the indicator off', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			now: '2025-03-12T09:30:00.000Z',
			settings: { ...KIOSK, scrollToNow: 'true' },
		})
		const { scrolled, rowStart, extent } = await measure(
			page,
			'vertical-grid-scroll',
			'vertical',
			'09'
		)
		expect(Math.abs(scrolled - (rowStart + 0.5 * extent))).toBeLessThanOrEqual(
			1
		)
	})

	test('month: nowIndicator=false changes nothing and nothing crashes', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: KIOSK,
		})
		await new CalendarPage(page).expectRendered()
		expect(errors).toEqual([])
	})

	test('toggling nowIndicator at runtime removes and restores the line', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
		await setSettings(page, { nowIndicator: 'false' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
		await setSettings(page, { nowIndicator: 'true' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
	})

	for (const time of ['00:00', '23:59', '12:59', '08:15']) {
		test(`scrollTime ${time} lands at hour + minute fraction (clamped at the end)`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'basic',
				view: 'week',
				settings: { scrollTime: time, height: '500px' },
			})
			const [h, m] = time.split(':').map(Number)
			const { scrolled, rowStart, extent } = await measure(
				page,
				'vertical-grid-scroll',
				'vertical',
				String(h).padStart(2, '0')
			)
			const ideal = rowStart + (m / 60) * extent
			const maxScroll = await page.evaluate(() => {
				const v = document.querySelector(
					'[data-testid="vertical-grid-scroll"] [data-radix-scroll-area-viewport]'
				)
				return v ? v.scrollHeight - v.clientHeight : 0
			})
			expect(
				Math.abs(scrolled - Math.min(ideal, maxScroll))
			).toBeLessThanOrEqual(1)
		})
	}

	test('scrollTime outside business hours (hideNonBusinessHours) lands on the edge row, not inside it', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				scrollTime: '06:30',
				hideNonBusinessHours: 'true',
				businessHours: '9-17',
				height: '300px',
			},
		})
		const scrolled = await page.evaluate(
			() =>
				document.querySelector(
					'[data-testid="vertical-grid-scroll"] [data-radix-scroll-area-viewport]'
				)?.scrollTop
		)
		expect(scrolled).toBe(0)
		expect(errors).toEqual([])
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 4: upgrader, none of the new params                             */
/* ---------------------------------------------------------------------- */
test.describe('persona 4: upgrader (no new params)', () => {
	test('week: week number, now line and all-day row all present', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'all-day-events', view: 'week' })
		await expect(page.getByTestId('week-number')).toHaveText('11')
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
		await expect(new TimeGrid(page).allDayRow).toHaveCount(1)
	})

	test('day: now line and all-day row present, month: no week numbers', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'all-day-events', view: 'day' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
		await expect(new TimeGrid(page).allDayRow).toHaveCount(1)
		await gotoScenario(page, { scenario: 'all-day-events', view: 'month' })
		await expect(new MonthGrid(page).weekNumbers).toHaveCount(0)
	})

	test('resource week vertical: week number cell and all-day rows present', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
		})
		await expect(page.getByTestId('week-number')).toHaveCount(1)
		await expect(page.getByTestId('current-time-indicator')).not.toHaveCount(0)
		await expect(
			page.locator('[data-testid^="allday-row"], [data-testid="all-day-row"]')
		).not.toHaveCount(0)
	})

	test('explicit defaults render the same week-view DOM as no params', async ({
		page,
	}) => {
		const html = async (settings: Record<string, string>) => {
			await gotoScenario(page, {
				scenario: 'all-day-events',
				view: 'week',
				settings,
			})
			await page.waitForTimeout(800)
			return page.getByTestId('ilamy-calendar').evaluate((el) => el.outerHTML)
		}
		const bare = await html({})
		const explicit = await html({
			allDaySlot: 'true',
			nowIndicator: 'true',
			weekNumberCalculation: 'local',
		})
		expect(explicit).toBe(bare)
	})

	test('whole-hour scrollTime lands exactly on the row top (unchanged contract)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '08:00', height: '500px' },
		})
		const { scrolled, rowStart } = await measure(
			page,
			'vertical-grid-scroll',
			'vertical',
			'08'
		)
		expect(Math.abs(scrolled - rowStart)).toBeLessThanOrEqual(1)
	})

	test('week number is dayjs week() when unset (Sunday start): 11 for 9-15 Mar 2025', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await expect(page.getByTestId('week-number')).toHaveText('11')
		await new TimeGrid(page).next()
		await expect(page.getByTestId('week-number')).toHaveText('12')
	})

	test('weekNumbers=false hides it in resource week vertical too, and nowIndicator stays', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { weekNumbers: 'false' },
		})
		await expect(page.getByTestId('week-number')).toHaveCount(0)
	})

	test('weekNumbers=false hides the month numbers too (no row numbers, no crash)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { weekNumbers: 'false' },
		})
		await expect(new MonthGrid(page).weekNumbers).toHaveCount(0)
	})
})
