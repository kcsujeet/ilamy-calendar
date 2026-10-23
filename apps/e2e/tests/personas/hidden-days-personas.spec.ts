import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	setSettings,
	settleAnimations,
} from '../support/harness'
import { CalendarPage, MonthGrid, TimeGrid } from '../support/pages'

/** QA personas for 3.3.7b (hiddenDays / weekends in every view). Real pointer only. */

const centre = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const pressAndMoveTo = async (
	page: Page,
	start: { x: number; y: number },
	end: { x: number; y: number }
) => {
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	for (let step = 1; step <= 10; step += 1) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * step) / 10,
			start.y + ((end.y - start.y) * step) / 10
		)
	}
}

const dragTo = async (page: Page, from: Locator, to: Locator) => {
	await pressAndMoveTo(page, await centre(from), await centre(to))
	await releasePointer(page)
}

const open = async (
	page: Page,
	options: Parameters<typeof gotoScenario>[1]
) => {
	await gotoScenario(page, options)
	await settleAnimations(page)
}

const collectErrors = (page: Page) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	return errors
}

const handleOf = (bar: Locator, edge: 'start' | 'end') =>
	bar.locator(`[data-resize-handle="${edge}"]`)

const WEEKDAY_NAMES = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
]

const dayOfWeek = (iso: string) => new Date(iso).getUTCDay()

const cellStarts = async (cells: Locator) =>
	cells.evaluateAll((nodes) =>
		nodes.map((node) => node.getAttribute('data-start') ?? '')
	)

/* ---------------------------------------------------------------------- */
/* Persona 1: office worker, weekends=false                                */
/* ---------------------------------------------------------------------- */
test.describe('persona 1: office worker (weekends=false)', () => {
	test('every month of 2025 draws only Mon-Fri, whole rows, each weekday of the month once', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		await open(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-01-15T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
			const starts = await cellStarts(month.cells)
			expect(
				starts.length % 5,
				`month ${monthIndex}: cells ${starts.length}`
			).toBe(0)
			const days = starts.map(dayOfWeek)
			expect(
				days.every((day) => day >= 1 && day <= 5),
				`month ${monthIndex} has weekend cells: ${starts.join(' ')}`
			).toBe(true)
			// each row Mon..Fri
			for (let row = 0; row < starts.length / 5; row += 1) {
				expect(days.slice(row * 5, row * 5 + 5)).toEqual([1, 2, 3, 4, 5])
			}
			// no duplicate
			expect(new Set(starts).size).toBe(starts.length)
			// every weekday of the calendar month is present
			const title = (await month.title.textContent()) ?? ''
			const sample = new Date(starts.at(10) ?? '')
			const year = sample.getUTCFullYear()
			const m = sample.getUTCMonth()
			const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
			for (let d = 1; d <= last; d += 1) {
				const iso = new Date(Date.UTC(year, m, d))
				const wd = iso.getUTCDay()
				if (wd >= 1 && wd <= 5) {
					const key = iso.toISOString().slice(0, 10)
					expect(
						starts.some((s) => s.startsWith(key)),
						`${title}: missing ${key}`
					).toBe(true)
				}
			}
			await month.next()
			await settleAnimations(page)
		}
		expect(errors).toEqual([])
	})

	test('month starting on Saturday (Mar 2025): first row, today, prev/next/today', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		const starts = await cellStarts(month.cells)
		console.log(
			'MAR first row',
			starts.slice(0, 5).join(' '),
			'last',
			starts.at(-1)
		)
		await expect(month.todayMarker).toHaveCount(1)
		await month.next()
		await settleAnimations(page)
		await month.today()
		await settleAnimations(page)
		await expect(month.todayMarker).toHaveCount(1)
		await month.previous()
		await settleAnimations(page)
		await expect(month.title).toContainText('Feb')
		await month.today()
		await settleAnimations(page)
		await expect(month.title).toContainText('Mar')
	})

	test('month starting on Sunday (Jun 2025): grid and first row', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-06-10T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		const starts = await cellStarts(month.cells)
		console.log(
			'JUN first row',
			starts.slice(0, 5).join(' '),
			'n',
			starts.length
		)
		expect(starts.at(0)?.slice(0, 10)).toBe('2025-06-02')
	})

	test('clicking a cell opens the form on that date', async ({ page }) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		await month.cellOn('2025-03-18').click()
		await expect(page.getByRole('dialog')).toBeVisible()
		const dialogText = await page.getByRole('dialog').innerText()
		console.log('FORM', dialogText.replace(/\n/g, ' | ').slice(0, 300))
		expect(dialogText).toContain('Mar 18, 2025')
	})

	test('drag Fri event to Monday lands on Monday', async ({ page }) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		// Standup is Thu 13 10:00 (timed). Drag onto Mon 17.
		await dragTo(
			page,
			month.event('Standup').first(),
			month.cellOn('2025-03-17')
		)
		await expect
			.poll(async () => (await month.eventNamed('Standup')).start)
			.toMatch(/^2025-03-17/)
	})

	test('drag Fri 14 weekend-trip first segment (Fri) to Mon 24 keeps duration over visible+hidden', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		const before = await month.eventNamed('Weekend trip')
		const bar = month.bar('trip-1').first()
		await dragTo(page, bar, month.cellOn('2025-03-24'))
		await expect
			.poll(async () => (await month.eventNamed('Weekend trip')).start)
			.not.toBe(before.start)
		const after = await month.eventNamed('Weekend trip')
		console.log(
			'TRIP drag',
			before.start,
			before.end,
			'->',
			after.start,
			after.end
		)
		expect(after.start).toMatch(/^2025-03-24/)
		expect(after.end).toBe('2025-03-28T00:00:00.000Z')
	})

	test('resize all-day event end across hidden weekend lands on visible day', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		// Public holiday Wed 12 (one day). Resize end to Tue 18.
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-18')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Public holiday')
		console.log('RESIZE', row.start, row.end)
		// end exclusive: Tue 18 inclusive -> Wed 19 00:00
		expect(row.end).toBe('2025-03-19T00:00:00.000Z')
	})

	test('resize end onto Friday: end is exclusive Sat 00:00 (hidden), bar still ends at Friday with end affordance', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-14')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await settleAnimations(page)
		const row = await month.eventNamed('Public holiday')
		console.log('RESIZE to Fri', row.start, row.end)
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
		// the end affordance must still be there (event ends on the exclusive Sat boundary)
		await expect(handleOf(month.bar('allday-1'), 'end')).toHaveCount(1)
	})

	test('week view: 5 columns, day view prev/next from Fri to Mon and back', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { weekends: 'false' },
		})
		await expect(new TimeGrid(page).dayColumns).toHaveCount(5)
		await open(page, {
			scenario: 'basic',
			view: 'day',
			date: '2025-03-14T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		const cal = new CalendarPage(page)
		await cal.next()
		await expect(page.getByTestId('day-view-header')).toContainText(
			'Monday, March 17'
		)
		await cal.previous()
		await expect(page.getByTestId('day-view-header')).toContainText(
			'Friday, March 14'
		)
		await cal.previous()
		await expect(page.getByTestId('day-view-header')).toContainText(
			'Thursday, March 13'
		)
	})

	test('day view starting on Monday: previous goes to Friday', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'day',
			date: '2025-03-17T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		await new CalendarPage(page).previous()
		await expect(page.getByTestId('day-view-header')).toContainText(
			'Friday, March 14'
		)
	})

	test('initial date on Sunday, day view', async ({ page }) => {
		await open(page, {
			scenario: 'basic',
			view: 'day',
			date: '2025-03-16T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		const text = await page.getByTestId('day-view-header').innerText()
		console.log('SUN INITIAL day view', text.replace(/\n/g, ' '))
	})

	test('initial date on Saturday, week view and month view', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-03-15T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		console.log('SAT week title', await new TimeGrid(page).title.textContent())
		await open(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-03-15T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		console.log(
			'SAT month title',
			await new MonthGrid(page).title.textContent()
		)
	})

	test('drag-to-create across the weekend gap in the week view creates range on visible days', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			plugins: ['drag-to-create'],
			settings: { weekends: 'false', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const from = grid.slotAt('2025-03-11T13:00')
		const to = grid.slotAt('2025-03-13T15:00')
		await pressAndMoveTo(page, await centre(from), await centre(to))
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('drag-to-create in the month across a Fri->Mon gap', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			plugins: ['drag-to-create'],
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		await pressAndMoveTo(
			page,
			await centre(month.cellOn('2025-03-20')),
			await centre(month.cellOn('2025-03-25'))
		)
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
		const inputs = await page
			.getByRole('dialog')
			.locator('input')
			.evaluateAll((nodes) => nodes.map((n) => (n as HTMLInputElement).value))
		console.log('D2C month inputs', inputs.join(' , '))
	})

	test('+N more in a month with dayMaxEvents', async ({ page }) => {
		await open(page, {
			scenario: 'many-events',
			view: 'month',
			settings: { weekends: 'false', dayMaxEvents: 2 },
		})
		const month = new MonthGrid(page)
		console.log('MORE', await month.overflowIndicators.allTextContents())
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 2: rota planner, hiddenDays=wednesday, week starts Monday       */
/* ---------------------------------------------------------------------- */
const ROTA = { hiddenDays: 'wednesday', firstDayOfWeek: 'monday' } as const

const lane = (page: Page, resourceId: string, startPrefix: string) =>
	page
		.locator(`[data-resource-id="${resourceId}"][data-start^="${startPrefix}"]`)
		.first()

const widthOf = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('no layout')
	}
	return box.width
}

test.describe('persona 2: rota planner (hiddenDays=wednesday)', () => {
	for (const orientation of ['vertical', 'horizontal'] as const) {
		for (const granularity of ['hourly', 'daily'] as const) {
			test(`resource week ${orientation} ${granularity}: no Wednesday, Thursday bar present`, async ({
				page,
			}) => {
				const errors = collectErrors(page)
				await open(page, {
					scenario: 'resources',
					view: 'week',
					orientation,
					settings: { ...ROTA, granularity },
				})
				await expect(page.locator('[data-start^="2025-03-12"]')).toHaveCount(0)
				await expect(
					page.locator('[data-start^="2025-03-11"]').first()
				).toBeVisible()
				await expect(
					page.locator('[data-start^="2025-03-13"]').first()
				).toBeVisible()
				// Room A, later is Thursday 13 (visible); Wed bookings are not drawn
				await expect(page.getByText('Room A, later').first()).toBeVisible()
				await expect(page.getByText('Room A booking')).toHaveCount(0)
				expect(errors).toEqual([])
			})
		}
		test(`resource month ${orientation}: no Wednesday cells`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'resources',
				view: 'month',
				orientation,
				settings: ROTA,
			})
			for (const day of ['05', '12', '19', '26']) {
				await expect(
					page.locator(`[data-start^="2025-03-${day}"]`)
				).toHaveCount(0)
			}
			await expect(
				page.locator('[data-start^="2025-03-13"]').first()
			).toBeVisible()
		})
	}

	for (const orientation of ['vertical', 'horizontal'] as const) {
		test(`resource month ${orientation}: Mar 3-12 bar across Wednesdays 5 and 12 is one continuous bar`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 2400, height: 900 })
			await open(page, {
				scenario: 'long-resource-events',
				view: 'month',
				orientation,
				settings: ROTA,
			})
			const bars = page.getByTestId('horizontal-event-long-res-1')
			const vbars = page.getByTestId('vertical-event-long-res-1')
			console.log(
				'RES month',
				orientation,
				'hbars',
				await bars.count(),
				'vbars',
				await vbars.count()
			)
			const boxes = await bars.evaluateAll((n) =>
				n.map((e) => {
					const r = e.getBoundingClientRect()
					return [
						Math.round(r.x),
						Math.round(r.y),
						Math.round(r.width),
						Math.round(r.height),
					]
				})
			)
			console.log('RES month bars', orientation, JSON.stringify(boxes))
			const cell = lane(page, 'r1', '2025-03-04')
			console.log('cell box', JSON.stringify(await cell.boundingBox()))
		})
	}

	test('resource week horizontal daily: cross-resource drag over the hidden column', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { ...ROTA, granularity: 'daily' },
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-4').first()
		await dragTo(page, bar, lane(page, 'r3', '2025-03-11'))
		await expect
			.poll(async () => (await grid.eventNamed('Room A, later')).resourceId)
			.toBe('r3')
		const row = await grid.eventNamed('Room A, later')
		console.log('XRES daily horiz', row.start, row.end)
		expect(row.start).toMatch(/^2025-03-11/)
	})

	test('resource week vertical hourly: cross-resource drag Thu -> Tue other resource', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { ...ROTA, scrollTime: '12:00' },
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('vertical-event-res-4').first()
		// r2, not r3: r3's Tuesday sits within the grid's auto-scroll zone at the
		// 1280px viewport, so the held pointer scrolls the grid sideways for as
		// long as the drag lasts and the drop lands on whichever day is under it
		// by then. A slow runner holds it longer, so it landed on Mon or Thu.
		await dragTo(page, bar, lane(page, 'r2', '2025-03-11T15'))
		await expect
			.poll(async () => (await grid.eventNamed('Room A, later')).resourceId)
			.toBe('r2')
		const row = await grid.eventNamed('Room A, later')
		console.log('XRES hourly vert', row.start, row.end)
		expect(row.start).toMatch(/^2025-03-11T1[45]/)
	})

	test('resource month horizontal: cross-resource drag of Thu event to Mon of another resource', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await open(page, {
			scenario: 'resources',
			view: 'month',
			orientation: 'horizontal',
			settings: ROTA,
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-4').first()
		await dragTo(page, bar, lane(page, 'r2', '2025-03-10'))
		await expect
			.poll(async () => (await grid.eventNamed('Room A, later')).resourceId)
			.toBe('r2')
		const row = await grid.eventNamed('Room A, later')
		console.log('XRES month horiz', row.start, row.end)
		expect(row.start).toMatch(/^2025-03-10/)
	})

	test('month view hiddenDays=wednesday: Mon-start grid, 6 columns, header names', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: ROTA,
		})
		await expect(
			page.locator('[data-testid^="month-header-weekday-"]')
		).toHaveText(['Mon', 'Tue', 'Thu', 'Fri', 'Sat', 'Sun'])
		const month = new MonthGrid(page)
		const starts = await cellStarts(month.cells)
		expect(starts.map(dayOfWeek).slice(0, 6)).toEqual([1, 2, 4, 5, 6, 0])
	})

	// One test per firstDayOfWeek, each opening the calendar once and changing
	// `hiddenDays` on the mounted calendar: a goto and a settle per combination
	// (21 in one test) outlasted the 30s timeout on a slow runner.
	for (const first of ['sunday', 'monday', 'saturday']) {
		test(`hide each single weekday, firstDayOfWeek=${first}: month columns and no hidden date`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'basic',
				view: 'month',
				settings: { hiddenDays: 'sunday', firstDayOfWeek: first },
			})
			const month = new MonthGrid(page)
			for (const hidden of WEEKDAY_NAMES) {
				await setSettings(page, { hiddenDays: hidden })
				const hiddenIndex = WEEKDAY_NAMES.indexOf(hidden)
				// Polled: the grid re-renders after the setting changes, and the
				// previous grid still draws this weekday, so a stale read fails
				// the condition instead of passing it.
				await expect
					.poll(
						async () => {
							const starts = await cellStarts(month.cells)
							const isWholeRows = starts.length % 6 === 0
							const hidesWeekday = !starts.map(dayOfWeek).includes(hiddenIndex)
							return isWholeRows && hidesWeekday
						},
						{ message: `${first}/${hidden}` }
					)
					.toBe(true)
			}
		})
	}

	test('week view hiddenDays=wednesday multi-day all-day event spanning it draws one bar', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { hiddenDays: 'friday', firstDayOfWeek: 'monday' },
		})
		await expect(page.getByTestId('horizontal-event-trip-1')).toHaveCount(1)
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 3: edge-case hunter                                             */
/* ---------------------------------------------------------------------- */
const ALL_DAYS = 'sunday,monday,tuesday,wednesday,thursday,friday,saturday'

const collectWarnings = (page: Page) => {
	const warnings: string[] = []
	page.on('console', (message) => {
		if (message.type() === 'warning') {
			warnings.push(message.text())
		}
	})
	return warnings
}

const isoWeek = (isoDate: string): number => {
	const date = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`)
	const dayNum = (date.getUTCDay() + 6) % 7
	date.setUTCDate(date.getUTCDate() - dayNum + 3)
	const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
	const diff = (date.getTime() - firstThursday.getTime()) / 86_400_000
	return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}

test.describe('persona 3: edge-case hunter', () => {
	for (const view of ['month', 'week', 'day'] as const) {
		const everyDayHidden: Record<string, string>[] = [
			{ hiddenDays: ALL_DAYS },
			{
				weekends: 'false',
				hiddenDays: 'monday,tuesday,wednesday,thursday,friday',
			},
		]
		for (const settings of everyDayHidden) {
			test(`all days hidden (${JSON.stringify(settings).slice(0, 30)}): ${view} stays usable and warns`, async ({
				page,
			}) => {
				const errors = collectErrors(page)
				const warnings = collectWarnings(page)
				await open(page, { scenario: 'across-hidden-days', view, settings })
				const cal = new CalendarPage(page)
				await cal.expectRendered()
				if (view === 'month') {
					await expect(new MonthGrid(page).cells).toHaveCount(42)
				}
				if (view === 'week') {
					await expect(new TimeGrid(page).dayColumns).toHaveCount(7)
				}
				await cal.next()
				await settleAnimations(page)
				await cal.previous()
				await cal.today()
				// NOTE: the warning is guarded by `typeof process`, which is undefined
				// in the vite harness, so it can never fire here (same for the
				// orientation warning). Recorded, not asserted.
				console.log('WARNINGS', JSON.stringify(warnings))
				expect(errors).toEqual([])
			})
		}
	}

	test('all days hidden in a resource week and month still renders', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		for (const view of ['week', 'month'] as const) {
			await open(page, {
				scenario: 'resources',
				view,
				orientation: 'horizontal',
				settings: { hiddenDays: ALL_DAYS },
			})
			await new CalendarPage(page).expectRendered()
			await expect(page.getByText('Room A booking').first()).toBeVisible()
		}
		expect(errors).toEqual([])
	})

	for (const timezone of ['America/New_York']) {
		test(`tz=${timezone} spring DST week: weekends=false week view Mon-Fri, correct hours`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'basic',
				view: 'week',
				timezone,
				date: '2025-03-12T13:00:00.000Z',
				settings: { weekends: 'false', scrollTime: '00:00' },
			})
			const grid = new TimeGrid(page)
			await expect(grid.dayColumns).toHaveCount(5)
			await expect(grid.title).toHaveText('Mar 10 – 14')
			const labels = await grid.hourLabels.count()
			console.log('NY hour labels', labels)
		})

		test(`tz=${timezone} day view steps across spring and autumn DST over the weekend`, async ({
			page,
		}) => {
			const cal = new CalendarPage(page)
			// Fri Mar 7 -> Mon Mar 10 crosses the Sunday Mar 9 clock change
			await open(page, {
				scenario: 'basic',
				view: 'day',
				timezone,
				date: '2025-03-07T15:00:00.000Z',
				settings: { weekends: 'false' },
			})
			await expect(page.getByTestId('day-view-header')).toContainText(
				'Friday, March 7'
			)
			await cal.next()
			await expect(page.getByTestId('day-view-header')).toContainText(
				'Monday, March 10'
			)
			await cal.previous()
			await expect(page.getByTestId('day-view-header')).toContainText(
				'Friday, March 7'
			)
			// Fri Oct 31 -> Mon Nov 3 crosses Sunday Nov 2 (clock back)
			await open(page, {
				scenario: 'basic',
				view: 'day',
				timezone,
				date: '2025-10-31T15:00:00.000Z',
				settings: { weekends: 'false' },
			})
			await expect(page.getByTestId('day-view-header')).toContainText(
				'Friday, October 31'
			)
			await cal.next()
			await expect(page.getByTestId('day-view-header')).toContainText(
				'Monday, November 3'
			)
			await cal.previous()
			await expect(page.getByTestId('day-view-header')).toContainText(
				'Friday, October 31'
			)
		})

		test(`tz=${timezone} month Mar and Nov 2025 weekends=false: whole Mon-Fri rows`, async ({
			page,
		}) => {
			for (const date of [
				'2025-03-12T13:00:00.000Z',
				'2025-11-12T13:00:00.000Z',
			]) {
				await open(page, {
					scenario: 'basic',
					view: 'month',
					timezone,
					date,
					settings: { weekends: 'false' },
				})
				const month = new MonthGrid(page)
				const starts = await cellStarts(month.cells)
				const days = starts.map((s) => new Date(s).getUTCDay())
				console.log(
					'NY month',
					date.slice(0, 7),
					starts.length,
					starts.slice(0, 5).join(' ')
				)
				expect(starts.length % 5).toBe(0)
				for (let row = 0; row < starts.length / 5; row += 1) {
					expect(
						days.slice(row * 5, row * 5 + 5).map((d) => d % 7)
					).toHaveLength(5)
				}
			}
		})

		test(`tz=${timezone} month trip bar Fri->Mon is two column-wide bars`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'across-hidden-days',
				view: 'month',
				timezone,
				settings: { weekends: 'false' },
			})
			const month = new MonthGrid(page)
			await expect(month.bar('trip-1')).toHaveCount(2)
			// In New York the UTC-midnight fixture is Thu 13 20:00 .. Mon 17 20:00,
			// so the first row holds Thu+Fri (2 columns) and the second Mon (1).
			const colW = await widthOf(month.cellOn('2025-03-14'))
			const widths = [
				await widthOf(month.bar('trip-1').nth(0)),
				await widthOf(month.bar('trip-1').nth(1)),
			]
			expect(Math.abs(widths[0] - 2 * colW)).toBeLessThan(8)
			expect(Math.abs(widths[1] - colW)).toBeLessThan(8)
		})

		test(`tz=${timezone} drag Thu event to next Monday in month`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'across-hidden-days',
				view: 'month',
				timezone,
				settings: { weekends: 'false' },
			})
			const month = new MonthGrid(page)
			const before = await month.eventNamed('Standup')
			await dragTo(
				page,
				month.event('Standup').first(),
				month.cellOn('2025-03-17')
			)
			await expect
				.poll(async () => (await month.eventNamed('Standup')).start)
				.not.toBe(before.start)
			const after = await month.eventNamed('Standup')
			console.log('NY standup', before.start, '->', after.start, after.end)
			expect(after.start).toBe('2025-03-17T10:00:00.000Z')
		})
	}

	test('event starting on a hidden day: no start handle; ending on hidden day: no end handle (month)', async ({
		page,
	}) => {
		// mid-1 = Wed 12 .. Fri 14 inclusive.
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { hiddenDays: 'wednesday', eventResizableFromStart: 'true' },
		})
		const month = new MonthGrid(page)
		const bar = month.bar('mid-1')
		console.log(
			'start-hidden bar html',
			(await bar.first().evaluate((e) => e.outerHTML)).slice(0, 600)
		)
		await expect(handleOf(bar, 'start')).toHaveCount(0)
		await expect(handleOf(bar, 'end')).toHaveCount(1)
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { hiddenDays: 'friday', eventResizableFromStart: 'true' },
		})
		await expect(handleOf(month.bar('mid-1'), 'end')).toHaveCount(0)
		await expect(handleOf(month.bar('mid-1'), 'start')).toHaveCount(1)
	})

	test('event starting/ending on hidden day: week view all-day row handles', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { hiddenDays: 'wednesday', eventResizableFromStart: 'true' },
		})
		const bar = page.getByTestId('horizontal-event-mid-1')
		await expect(handleOf(bar, 'start')).toHaveCount(0)
		await expect(handleOf(bar, 'end')).toHaveCount(1)
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { hiddenDays: 'friday', eventResizableFromStart: 'true' },
		})
		await expect(
			handleOf(page.getByTestId('horizontal-event-mid-1'), 'end')
		).toHaveCount(0)
		await expect(
			handleOf(page.getByTestId('horizontal-event-mid-1'), 'start')
		).toHaveCount(1)
	})

	test('trip ending on hidden Monday (hiddenDays=monday): month, trip-1 Fri 14..Mon 17', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { hiddenDays: 'monday', eventResizableFromStart: 'true' },
		})
		const month = new MonthGrid(page)
		const bars = month.bar('trip-1')
		console.log('trip bars w/ monday hidden', await bars.count())
		// Sat 15 (visible), Sun 16 (visible): one bar? Fri-Sun in one row (Sun-start rows: Sun16 next row)
		const ends = await page.locator('[data-resize-handle="end"]').count()
		console.log('end handles', ends)
	})

	test('wholly hidden event is not drawn and not counted in +N more', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'many-events',
			view: 'month',
			settings: { hiddenDays: 'wednesday', dayMaxEvents: 2 },
		})
		const month = new MonthGrid(page)
		await expect(month.overflowIndicators).toHaveCount(0)
		await expect(page.getByText(/Event \d/)).toHaveCount(0)
	})

	test('wholly hidden event in resource month/week not drawn', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'month',
			orientation: 'vertical',
			settings: { hiddenDays: 'wednesday' },
		})
		await expect(page.getByText('Room A booking')).toHaveCount(0)
		await expect(page.getByText('Room A, later').first()).toBeVisible()
	})

	test('week numbers per row right when the row first day is hidden (ISO), every month', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-01-15T09:00:00.000Z',
			settings: {
				weekends: 'false',
				weekNumbers: 'true',
				weekNumberCalculation: 'ISO',
			},
		})
		const month = new MonthGrid(page)
		for (let i = 0; i < 12; i += 1) {
			const starts = await cellStarts(month.cells)
			const expected = []
			for (let row = 0; row < starts.length / 5; row += 1) {
				expected.push(String(isoWeek(starts[row * 5])))
			}
			await expect(month.weekNumbers, `month ${i}`).toHaveText(expected)
			await month.next()
			await settleAnimations(page)
		}
	})

	test('week numbers with hiddenDays=monday + firstDayOfWeek=monday (ISO) and local', async ({
		page,
	}) => {
		for (const calc of ['ISO', 'local']) {
			await open(page, {
				scenario: 'basic',
				view: 'month',
				settings: {
					hiddenDays: 'monday',
					firstDayOfWeek: 'monday',
					weekNumbers: 'true',
					weekNumberCalculation: calc,
				},
			})
			const month = new MonthGrid(page)
			const starts = await cellStarts(month.cells)
			const nums = await month.weekNumbers.allTextContents()
			console.log(
				'WN',
				calc,
				starts
					.filter((_, i) => i % 6 === 0)
					.map((s) => s.slice(5, 10))
					.join(' '),
				'=>',
				nums.join(',')
			)
			if (calc === 'ISO') {
				const expected = []
				for (let row = 0; row < starts.length / 6; row += 1) {
					expected.push(String(isoWeek(starts[row * 6])))
				}
				expect(nums).toEqual(expected)
			}
		}
	})

	test('dayHeaderFormat applies to visible columns only (week, month, day)', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				weekends: 'false',
				dayHeaderFormat: JSON.stringify({ weekday: 'long' }),
			},
		})
		const text = await page.getByTestId('ilamy-calendar').innerText()
		expect(text).not.toContain('Saturday')
		expect(text).not.toContain('Sunday')
		expect(text).toContain('Friday')
		await open(page, {
			scenario: 'basic',
			view: 'month',
			settings: {
				weekends: 'false',
				dayHeaderFormat: JSON.stringify({ weekday: 'long' }),
			},
		})
		await expect(
			page.locator('[data-testid^="month-header-weekday-"]')
		).toHaveText(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 4: upgrader                                                      */
/* ---------------------------------------------------------------------- */
const normalise = (html: string) =>
	html
		.replace(/(id|aria-controls|aria-labelledby|for)="[^"]*radix[^"]*"/g, '')
		.replace(/:r[0-9a-z]+:/g, ':r:')

test.describe('persona 4: upgrader', () => {
	const surfaces: Array<[string, Parameters<typeof gotoScenario>[1]]> = [
		['month', { scenario: 'across-hidden-days', view: 'month' }],
		['week', { scenario: 'across-hidden-days', view: 'week' }],
		['day', { scenario: 'across-hidden-days', view: 'day' }],
		['year', { scenario: 'across-hidden-days', view: 'year' }],
		[
			'res month v',
			{ scenario: 'resources', view: 'month', orientation: 'vertical' },
		],
		[
			'res month h',
			{ scenario: 'resources', view: 'month', orientation: 'horizontal' },
		],
		[
			'res week v',
			{ scenario: 'resources', view: 'week', orientation: 'vertical' },
		],
		[
			'res week h',
			{ scenario: 'resources', view: 'week', orientation: 'horizontal' },
		],
		[
			'res week h daily',
			{
				scenario: 'resources',
				view: 'week',
				orientation: 'horizontal',
				settings: { granularity: 'daily' },
			},
		],
	]
	for (const [name, options] of surfaces) {
		test(`${name}: explicit weekends=true and empty hiddenDays render identically to no params`, async ({
			page,
		}) => {
			await open(page, options)
			const base = normalise(
				await page.getByTestId('ilamy-calendar').innerHTML()
			)
			await open(page, {
				...options,
				settings: {
					...(options.settings ?? {}),
					weekends: 'true',
					hiddenDays: '',
				},
			})
			const explicit = normalise(
				await page.getByTestId('ilamy-calendar').innerHTML()
			)
			expect(explicit === base).toBe(true)
		})
	}

	test('no params: counts as before (month 42, week 7 columns, resources 7 days)', async ({
		page,
	}) => {
		await open(page, { scenario: 'across-hidden-days', view: 'month' })
		await expect(new MonthGrid(page).cells).toHaveCount(42)
		await open(page, { scenario: 'across-hidden-days', view: 'week' })
		await expect(new TimeGrid(page).dayColumns).toHaveCount(7)
		await open(page, { scenario: 'across-hidden-days', view: 'week' })
		await expect(new TimeGrid(page).title).toHaveText('Mar 9 – 15')
	})

	test('week view hiddenDays=wednesday (existing behaviour): 6 columns, title, bar', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { hiddenDays: 'wednesday' },
		})
		await expect(new TimeGrid(page).dayColumns).toHaveCount(6)
		await expect(new TimeGrid(page).title).toHaveText('Mar 9 – 15')
	})

	test('year view and agenda unchanged by weekends=false', async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'year' })
		const base = normalise(await page.getByTestId('ilamy-calendar').innerHTML())
		await open(page, {
			scenario: 'basic',
			view: 'year',
			settings: { weekends: 'false', hiddenDays: 'wednesday' },
		})
		expect(
			normalise(await page.getByTestId('ilamy-calendar').innerHTML()) === base
		).toBe(true)
		await open(page, { scenario: 'basic', view: 'agenda', plugins: ['agenda'] })
		const agendaBase = normalise(
			await page.getByTestId('ilamy-calendar').innerHTML()
		)
		await open(page, {
			scenario: 'basic',
			view: 'agenda',
			plugins: ['agenda'],
			settings: { weekends: 'false', hiddenDays: 'wednesday' },
		})
		expect(
			normalise(await page.getByTestId('ilamy-calendar').innerHTML()) ===
				agendaBase
		).toBe(true)
	})
})

/* ---------------------------------------------------------------------- */
/* Extra probes                                                             */
/* ---------------------------------------------------------------------- */
test.describe('extra probes', () => {
	test('resource month vertical: continuous bar height = 8 visible rows', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1600, height: 1400 })
		await open(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'vertical',
			settings: ROTA,
		})
		const bar = page.getByTestId('vertical-event-long-res-1')
		const box = await bar.first().boundingBox()
		const cell = await lane(page, 'r1', '2025-03-04').boundingBox()
		console.log(
			'VMONTH bar',
			JSON.stringify(box),
			'cell',
			JSON.stringify(cell),
			'count',
			await bar.count()
		)
		if (box && cell) {
			expect(Math.abs(box.height / cell.height - 8)).toBeLessThan(0.3)
		}
	})

	test('resource week horizontal daily: Site survey ends on hidden Wed: bar to Tue, no end handle', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'long-resource-events',
			view: 'week',
			orientation: 'horizontal',
			settings: {
				...ROTA,
				granularity: 'daily',
				eventResizableFromStart: 'true',
			},
		})
		const bar = page.getByTestId('horizontal-event-long-res-1')
		console.log('RES week daily bars', await bar.count())
		await expect(handleOf(bar, 'end')).toHaveCount(0)
		await expect(handleOf(bar, 'start')).toHaveCount(0)
	})

	test('hourly resource week: timed event on hidden day not drawn (Long shift Wed)', async ({
		page,
	}) => {
		for (const orientation of ['vertical', 'horizontal'] as const) {
			await open(page, {
				scenario: 'long-resource-events',
				view: 'week',
				orientation,
				settings: ROTA,
			})
			await expect(page.getByText('Long shift')).toHaveCount(0)
		}
	})

	test('day view hiddenDays=wednesday: opens Thursday on pinned Wednesday; prev -> Tue', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'day',
			settings: { hiddenDays: 'wednesday' },
		})
		const header = page.getByTestId('day-view-header')
		console.log(
			'DAY wed hidden opens',
			(await header.innerText()).replace(/\n/g, ' ')
		)
		await new CalendarPage(page).previous()
		console.log(
			'DAY wed hidden prev',
			(await header.innerText()).replace(/\n/g, ' ')
		)
		await new CalendarPage(page).next()
		await new CalendarPage(page).next()
		console.log(
			'DAY wed hidden next-next',
			(await header.innerText()).replace(/\n/g, ' ')
		)
	})

	test('day view saturday initial and Today when today is Saturday', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'day',
			now: '2025-03-15T10:00:00.000Z',
			date: '2025-03-15T10:00:00.000Z',
			settings: { weekends: 'false' },
		})
		const header = page.getByTestId('day-view-header')
		await expect(header).toContainText('Monday, March 17')
		// Previous from that Monday
		await new CalendarPage(page).previous()
		await expect(header).toContainText('Friday, March 14')
		await new CalendarPage(page).next()
		await new CalendarPage(page).today()
		console.log(
			'DAY after Today on Sat',
			(await header.innerText()).replace(/\n/g, ' ')
		)
	})

	test('month view today is Saturday: today marker absent; Today button', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			now: '2025-03-15T10:00:00.000Z',
			date: '2025-03-15T10:00:00.000Z',
			settings: { weekends: 'false' },
		})
		const cal = new CalendarPage(page)
		await expect(cal.todayMarker).toHaveCount(0)
		await cal.next()
		await settleAnimations(page)
		await cal.today()
		await settleAnimations(page)
		await expect(cal.title).toContainText('Mar')
	})

	test('header date picker: choose a Saturday in day view with weekends=false', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'day',
			settings: { weekends: 'false' },
		})
		await page.getByTestId('calendar-title').click()
		const dialog = page.getByRole('dialog')
		console.log('PICKER visible', await dialog.count())
		const text = await page
			.locator('[data-slot="popover-content"]')
			.first()
			.innerText()
		console.log('PICKER', text.replace(/\n/g, ' ').slice(0, 400))
		const sat = page
			.locator('[data-slot="popover-content"] button[data-day]')
			.filter({ hasText: /^15$/ })
			.first()
		console.log('SAT15 buttons', await sat.count())
		if (await sat.count()) {
			await sat.click()
			await settleAnimations(page)
			console.log(
				'DAY after pick Sat 15',
				(await page.getByTestId('day-view-header').innerText()).replace(
					/\n/g,
					' '
				)
			)
		}
	})

	test('month: +N more popup on a Friday cell, weekends=false', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'many-events',
			view: 'month',
			date: '2025-03-12T09:00:00.000Z',
			settings: { weekends: 'false', dayMaxEvents: 2 },
		})
		const month = new MonthGrid(page)
		await month.overflowIndicators.first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		console.log(
			'MORE popup',
			(await page.getByRole('dialog').innerText())
				.replace(/\n/g, ' ')
				.slice(0, 200)
		)
	})

	test('drag second (Monday) segment of Fri-Mon trip to Tue 25: moves by real days', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		const before = await month.eventNamed('Weekend trip')
		await dragTo(page, month.bar('trip-1').nth(1), month.cellOn('2025-03-25'))
		await expect
			.poll(async () => (await month.eventNamed('Weekend trip')).start)
			.not.toBe(before.start)
		const after = await month.eventNamed('Weekend trip')
		console.log('TRIP seg2 drag to Tue25:', after.start, after.end)
		// Monday is the 4th day of the event (Fri,Sat,Sun,Mon); dropping on Tue 25 puts that day on Tue 25: start Sat 22? (FullCalendar moves by days)
		expect(after.start).toBe('2025-03-22T00:00:00.000Z')
	})

	test('resize start handle of Fri-Mon trip leftwards across weekend (month, weekends=false)', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false', eventResizableFromStart: 'true' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('trip-1'), 'start'),
			month.cellOn('2025-03-11')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Weekend trip')
		console.log('TRIP start resize', row.start, row.end)
		expect(row.start).toBe('2025-03-11T00:00:00.000Z')
		expect(row.end).toBe('2025-03-18T00:00:00.000Z')
	})

	test('resize end handle of the Monday segment to Wed 19', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('trip-1'), 'end'),
			month.cellOn('2025-03-19')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Weekend trip')
		console.log('TRIP end resize', row.start, row.end)
		expect(row.end).toBe('2025-03-20T00:00:00.000Z')
	})

	test('week view weekends=false: drag timed Standup Thu -> Mon next week impossible; drag within week to Tue', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { weekends: 'false', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.event('Standup').first(),
			grid.slotAt('2025-03-11T14:00')
		)
		await expect
			.poll(async () => (await grid.eventNamed('Standup')).start)
			.toMatch(/^2025-03-11T14/)
	})

	test('month drag-to-create across Fri->Mon: dialog dates', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			plugins: ['drag-to-create'],
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)
		await pressAndMoveTo(
			page,
			await centre(month.cellOn('2025-03-20')),
			await centre(month.cellOn('2025-03-25'))
		)
		await releasePointer(page)
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		console.log(
			'D2C month dialog',
			(await dialog.innerText()).replace(/\n/g, ' | ').slice(0, 300)
		)
	})

	test('weekend resource week vertical hourly, dayHeader check and 5 days', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { weekends: 'false' },
		})
		const text = await page.getByTestId('ilamy-calendar').innerText()
		expect(text).not.toMatch(/\bSat\b|\bSun\b/)
	})
})

test.describe('extreme but valid', () => {
	test('only Saturday and Sunday visible (weekdays hidden): month, week, day, resource', async ({
		page,
	}) => {
		const errors = collectErrors(page)
		const settings = { hiddenDays: 'monday,tuesday,wednesday,thursday,friday' }
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings,
		})
		const starts = await cellStarts(new MonthGrid(page).cells)
		expect(starts.length % 2).toBe(0)
		expect(starts.every((s) => [0, 6].includes(dayOfWeek(s)))).toBe(true)
		await expect(page.getByText('Saturday market').first()).toBeVisible()
		await open(page, { scenario: 'across-hidden-days', view: 'week', settings })
		await expect(new TimeGrid(page).dayColumns).toHaveCount(2)
		await open(page, { scenario: 'across-hidden-days', view: 'day', settings })
		console.log(
			'WEEKEND-ONLY day',
			(await page.getByTestId('day-view-header').innerText()).replace(
				/\n/g,
				' '
			)
		)
		await new CalendarPage(page).next()
		console.log(
			'WEEKEND-ONLY day next',
			(await page.getByTestId('day-view-header').innerText()).replace(
				/\n/g,
				' '
			)
		)
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings,
		})
		await new CalendarPage(page).expectRendered()
		expect(errors).toEqual([])
	})

	test('only Wednesday visible: month has one column and bars do not overflow', async ({
		page,
	}) => {
		const settings = {
			hiddenDays: 'sunday,monday,tuesday,thursday,friday,saturday',
		}
		await open(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings,
		})
		const month = new MonthGrid(page)
		await expect(month.cells).toHaveCount(6)
		const bar = month.bar('mid-1')
		console.log('ONLY-WED mid-1 bars', await bar.count())
		const colW = await widthOf(month.cells.first())
		for (let i = 0; i < (await bar.count()); i += 1) {
			expect(await widthOf(bar.nth(i))).toBeLessThan(colW + 4)
		}
		await open(page, { scenario: 'across-hidden-days', view: 'day', settings })
		const header = page.getByTestId('day-view-header')
		await new CalendarPage(page).next()
		await expect(header).toContainText('Wednesday, March 19')
		await new CalendarPage(page).previous()
		await new CalendarPage(page).previous()
		await expect(header).toContainText('Wednesday, March 5')
	})
})
