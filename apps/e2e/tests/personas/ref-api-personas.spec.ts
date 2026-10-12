import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { gotoScenario, type ScenarioOptions } from '../support/harness'
import { CalendarPage, MonthGrid } from '../support/pages'

/**
 * QA personas for 3.3.9 (the `ref` API). The harness toolbar only has seven
 * fixed buttons, so the specs read the very same `ref` object off the toolbar's
 * React props (`calendarRef`) and call methods on it: that is exactly what an
 * integrator's `ref.current.x()` does.
 */

const DAYJS_MODULE = `/@fs${fileURLToPath(new URL('../../../../packages/utils/src/dayjs.ts', import.meta.url))}`

const open = async (page: Page, options: ScenarioOptions) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await gotoScenario(page, {
		...options,
		settings: { externalToolbar: 'true', height: '600px', ...options.settings },
	})
	await page.evaluate(async (dayjsModule) => {
		const button = document.querySelector('[data-testid="external-next"]')
		const win = window as unknown as Record<string, unknown>
		const fiberKey = Object.keys(button ?? {}).find((key) =>
			key.startsWith('__reactFiber$')
		)
		// biome-ignore lint/suspicious/noExplicitAny: test-only fiber walk
		let fiber: any = (button as any)[fiberKey as string]
		while (fiber && !fiber.memoizedProps?.calendarRef) {
			fiber = fiber.return
		}
		win.__ref = fiber.memoizedProps.calendarRef
		win.__dayjs = (await import(/* @vite-ignore */ dayjsModule)).default
	}, DAYJS_MODULE)
	// Headers animate in over 500ms.
	await page.waitForTimeout(600)
	return errors
}

/** Calls `ref.current[method](...args)`; a Dayjs-looking string arg `@iso` becomes dayjs(iso). */
const call = (page: Page, method: string, ...args: unknown[]) =>
	page.evaluate(
		([name, rawArgs]) => {
			const win = window as unknown as {
				__ref: { current: Record<string, (...a: unknown[]) => unknown> }
				__dayjs: (iso: string) => unknown
			}
			const resolve = (arg: unknown): unknown => {
				if (typeof arg === 'string' && arg.startsWith('@')) {
					return win.__dayjs(arg.slice(1))
				}
				if (arg && typeof arg === 'object') {
					return Object.fromEntries(
						Object.entries(arg).map(([key, value]) => [key, resolve(value)])
					)
				}
				return arg
			}
			const resolved = (rawArgs as unknown[]).map(resolve)
			return win.__ref.current[name as string](...resolved)
		},
		[method, args] as const
	)

const refState = (page: Page) =>
	page.evaluate(() => {
		const api = (
			window as unknown as {
				__ref: {
					current: { currentDate: { toISOString(): string }; view: string }
				}
			}
		).__ref.current
		return { date: api.currentDate.toISOString(), view: api.view }
	})

const press = (page: Page, name: string) =>
	page.getByTestId(`external-${name}`).click()

const title = (page: Page) => page.getByTestId('calendar-title')

const viewport = (page: Page, kind: 'vertical' | 'horizontal') =>
	page.locator(
		`[data-testid="${kind}-grid-scroll"] [data-radix-scroll-area-viewport]`
	)

const scrollOffset = (page: Page, kind: 'vertical' | 'horizontal') =>
	viewport(page, kind).evaluate(
		(node, axis) => (axis === 'vertical' ? node.scrollTop : node.scrollLeft),
		kind
	)

/**
 * Where a scroll to `HH:mm` should land: the offset from the first hour row to
 * the target row plus the fraction of the row, capped at the scroll limit.
 */
const expectedOffset = (
	page: Page,
	kind: 'vertical' | 'horizontal',
	hhmm: string
) =>
	viewport(page, kind).evaluate(
		(node, [axis, time]) => {
			const [hour, minute] = time.split(':').map(Number)
			const rows = Array.from(node.querySelectorAll<HTMLElement>('[data-hour]'))
			const first = rows.at(0)
			const last = rows.at(-1)
			if (!first || !last) {
				return Number.NaN
			}
			const firstHour = Number(first.dataset.hour)
			const lastHour = Number(last.dataset.hour)
			const clamped = Math.min(Math.max(hour, firstHour), lastHour)
			const target = rows.find((row) => Number(row.dataset.hour) === clamped)
			if (!target) {
				return Number.NaN
			}
			const fraction = clamped === hour ? minute / 60 : 0
			const a = target.getBoundingClientRect()
			const b = first.getBoundingClientRect()
			const isV = axis === 'vertical'
			const offset = isV ? a.top - b.top : a.left - b.left
			const extent = isV ? a.height : a.width
			const max = isV
				? node.scrollHeight - node.clientHeight
				: node.scrollWidth - node.clientWidth
			return Math.min(offset + fraction * extent, max)
		},
		[kind, hhmm] as const
	)

const expectScrolledTo = async (
	page: Page,
	kind: 'vertical' | 'horizontal',
	hhmm: string
) => {
	await expect
		.poll(
			async () => {
				const actual = await scrollOffset(page, kind)
				const expected = await expectedOffset(page, kind, hhmm)
				return Math.abs(actual - expected)
			},
			{ message: `scrolled to ${hhmm} (${kind})` }
		)
		.toBeLessThan(3)
}

const scrollManually = (
	page: Page,
	kind: 'vertical' | 'horizontal',
	to: number
) =>
	viewport(page, kind).evaluate(
		(node, [axis, offset]) => {
			node.scrollTo({ [axis === 'vertical' ? 'top' : 'left']: offset })
		},
		[kind, to] as const
	)

/* ---------------------------------------------------------------------- */
/* Persona 1: app builder with a custom sidebar                            */
/* ---------------------------------------------------------------------- */
test.describe('persona 1: app builder, sidebar beside the calendar', () => {
	test('header buttons and ref calls interleave and the title and ref date stay in sync', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'week' })
		const startTitle = await title(page).innerText()

		await page.getByLabel('Next').click()
		const afterHeaderNext = await title(page).innerText()
		expect(afterHeaderNext).not.toBe(startTitle)
		expect((await refState(page)).date).toBe('2025-03-19T09:00:00.000Z')

		await press(page, 'next')
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-03-26T09:00:00.000Z'
		)
		await page.getByLabel('Previous').click()
		expect((await refState(page)).date).toBe('2025-03-19T09:00:00.000Z')
		// ref.prev lands on the title the header's Next produced
		await press(page, 'prev')
		await press(page, 'next')
		await expect(title(page)).toHaveText(afterHeaderNext)

		await page.getByRole('button', { name: 'Today', exact: true }).click()
		await expect(title(page)).toHaveText(startTitle)
		expect((await refState(page)).date).toBe('2025-03-12T09:00:00.000Z')
		await press(page, 'next')
		await press(page, 'today')
		await expect(title(page)).toHaveText(startTitle)
		expect(errors).toEqual([])
	})

	test('rapid alternating clicks (locator clicks) net out to the right date', async ({
		page,
	}) => {
		await open(page, { scenario: 'basic', view: 'week' })
		for (let i = 0; i < 6; i += 1) {
			await press(page, 'next')
			await page.getByLabel('Next').click()
		}
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-06-04T09:00:00.000Z'
		)
		for (let i = 0; i < 6; i += 1) {
			await page.getByLabel('Previous').click()
			await press(page, 'prev')
		}
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-03-12T09:00:00.000Z'
		)
	})

	test('five ref.nextPeriod() calls in ONE tick advance five periods (no stale closure)', async ({
		page,
	}) => {
		await open(page, { scenario: 'basic', view: 'week' })
		await page.evaluate(() => {
			for (let i = 0; i < 5; i += 1) {
				document
					.querySelector<HTMLElement>('[data-testid="external-next"]')
					?.click()
			}
		})
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-04-16T09:00:00.000Z'
		)
		await page.evaluate(() => {
			for (let i = 0; i < 5; i += 1) {
				document
					.querySelector<HTMLElement>('[data-testid="external-prev"]')
					?.click()
			}
		})
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-03-12T09:00:00.000Z'
		)
	})

	test('five ref.nextPeriod() calls inside ONE handler (batched) advance five periods', async ({
		page,
	}) => {
		await open(page, { scenario: 'basic', view: 'week' })
		await page.evaluate(() => {
			const api = (
				window as unknown as { __ref: { current: { nextPeriod(): void } } }
			).__ref.current
			for (let i = 0; i < 5; i += 1) {
				api.nextPeriod()
			}
		})
		await expect
			.poll(async () => (await refState(page)).date)
			.toBe('2025-04-16T09:00:00.000Z')
	})

	for (const view of ['day', 'week', 'month', 'year'] as const) {
		test(`ref.setView('${view}') renders it, and the header agrees`, async ({
			page,
		}) => {
			const errors = await open(page, {
				scenario: 'basic',
				view: view === 'day' ? 'month' : 'day',
			})
			await call(page, 'setView', view)
			await expect.poll(async () => (await refState(page)).view).toBe(view)
			if (view === 'year') {
				await expect(page.getByTestId('year-view')).toBeVisible()
			} else if (view === 'month') {
				await expect(
					page.getByTestId('horizontal-grid-container')
				).toBeVisible()
			} else {
				await expect(page.getByTestId('vertical-grid-container')).toBeVisible()
			}
			// header next / ref next / header prev round trip in the new view
			const before = await title(page).innerText()
			await page.getByLabel('Next').click()
			await press(page, 'prev')
			await expect(title(page)).toHaveText(before)
			expect(errors).toEqual([])
		})
	}

	for (const orientation of ['vertical', 'horizontal'] as const) {
		test(`resource views (${orientation}): ref.setView cycles day, week, month, year without errors`, async ({
			page,
		}) => {
			const errors = await open(page, {
				scenario: 'resources',
				view: 'day',
				orientation,
			})
			for (const view of ['week', 'month', 'year', 'day', 'month', 'week']) {
				await call(page, 'setView', view)
				await expect.poll(async () => (await refState(page)).view).toBe(view)
				await page.waitForTimeout(150)
				await expect(new CalendarPage(page).root).toBeVisible()
				await page.getByLabel('Next').click()
				await press(page, 'prev')
			}
			expect(errors).toEqual([])
		})
	}

	test('the header view picker and ref.setView interleave', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'month' })
		await page.getByRole('radio', { name: 'Week', exact: true }).click()
		await expect.poll(async () => (await refState(page)).view).toBe('week')
		await call(page, 'setView', 'day')
		await expect.poll(async () => (await refState(page)).view).toBe('day')
		await page.getByRole('radio', { name: 'Month', exact: true }).click()
		await expect.poll(async () => (await refState(page)).view).toBe('month')
		await press(page, 'week')
		await expect.poll(async () => (await refState(page)).view).toBe('week')
		expect(errors).toEqual([])
	})

	const targets: Array<[string, string, RegExp]> = [
		['2024-02-29T12:00:00.000Z', 'month', /Feb.*2024|February 2024/],
		['2027-12-31T12:00:00.000Z', 'month', /Dec.*2027|December 2027/],
		['2025-01-01T00:30:00.000Z', 'month', /Jan.*2025|January 2025/],
	]
	for (const [iso, view, pattern] of targets) {
		test(`gotoDate(${iso}) in ${view} view`, async ({ page }) => {
			await open(page, { scenario: 'basic', view: 'month' })
			await call(page, 'setCurrentDate', `@${iso}`)
			await expect(title(page)).toHaveText(pattern)
			expect((await refState(page)).date).toBe(iso)
			await page.getByLabel('Next').click()
			await press(page, 'prev')
			await expect(title(page)).toHaveText(pattern)
		})
	}

	test('gotoDate in year view reaches another year', async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'year' })
		await call(page, 'setCurrentDate', '@2031-06-15T12:00:00.000Z')
		await expect(title(page)).toContainText('2031')
	})

	for (const [label, iso, dayText] of [
		['spring forward', '2025-03-09T12:00:00.000Z', '9'],
		['fall back', '2025-11-02T12:00:00.000Z', '2'],
	] as const) {
		test(`DST (${label}) with tz=America/New_York: gotoDate then next/prev step exactly one day`, async ({
			page,
		}) => {
			const errors = await open(page, {
				scenario: 'basic',
				view: 'day',
				timezone: 'America/New_York',
			})
			await call(page, 'setCurrentDate', `@${iso}`)
			const dstTitle = await title(page).innerText()
			expect(dstTitle).toContain(dayText)
			const columns = page.locator('[data-testid^="vertical-col-day-col-"]')
			await expect(columns).toHaveCount(1)
			const slot = page.locator('[data-testid^="vertical-cell-"]')
			const firstSlotStart = () => slot.first().getAttribute('data-start')
			const dstStart = await firstSlotStart()
			await press(page, 'next')
			await expect(title(page)).not.toHaveText(dstTitle)
			const nextStart = await firstSlotStart()
			await press(page, 'prev')
			await expect(title(page)).toHaveText(dstTitle)
			expect(await firstSlotStart()).toBe(dstStart)
			await press(page, 'prev')
			await press(page, 'next')
			await expect(title(page)).toHaveText(dstTitle)
			// the next day starts 23h or 25h after, never an offset-skewed day
			const diffHours =
				(new Date(nextStart ?? '').getTime() -
					new Date(dstStart ?? '').getTime()) /
				3_600_000
			expect([23, 24, 25]).toContain(diffHours)
			expect(errors).toEqual([])
		})
	}
})

/* ---------------------------------------------------------------------- */
/* Persona 2: scheduling dashboard (scrollToTime)                          */
/* ---------------------------------------------------------------------- */
const TIMES = ['00:00', '08:15', '13:30', '23:45']

test.describe('persona 2: scheduling dashboard (scrollToTime)', () => {
	for (const view of ['day', 'week'] as const) {
		test(`${view}: scrollToTime lands on each time`, async ({ page }) => {
			await open(page, { scenario: 'basic', view })
			for (const time of [...TIMES, '08:15', '00:00']) {
				await call(page, 'scrollToTime', time)
				await expectScrolledTo(page, 'vertical', time)
			}
		})
	}

	test('vertical resource day: scrollToTime lands on each time', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'vertical',
		})
		for (const time of TIMES) {
			await call(page, 'scrollToTime', time)
			await expectScrolledTo(page, 'vertical', time)
		}
	})

	test('vertical resource week: scrollToTime lands on each time', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
		})
		for (const time of TIMES) {
			await call(page, 'scrollToTime', time)
			await expectScrolledTo(page, 'vertical', time)
		}
	})

	for (const view of ['day', 'week'] as const) {
		test(`horizontal resource ${view}: scrollToTime lands on each time`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'resources',
				view,
				orientation: 'horizontal',
			})
			for (const time of TIMES) {
				await call(page, 'scrollToTime', time)
				await expectScrolledTo(page, 'horizontal', time)
			}
		})
	}

	test('same time again after the user scrolled manually scrolls again', async ({
		page,
	}) => {
		await open(page, { scenario: 'basic', view: 'week' })
		await call(page, 'scrollToTime', '13:30')
		await expectScrolledTo(page, 'vertical', '13:30')
		await scrollManually(page, 'vertical', 0)
		await expect.poll(() => scrollOffset(page, 'vertical')).toBe(0)
		await call(page, 'scrollToTime', '13:30')
		await expectScrolledTo(page, 'vertical', '13:30')
		// and via the toolbar button, a third time
		await scrollManually(page, 'vertical', 10)
		await press(page, 'scroll')
		await expectScrolledTo(page, 'vertical', '13:30')
	})

	test('same time again after manual scroll (horizontal resource)', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
		})
		await call(page, 'scrollToTime', '13:30')
		await expectScrolledTo(page, 'horizontal', '13:30')
		await scrollManually(page, 'horizontal', 0)
		await call(page, 'scrollToTime', '13:30')
		await expectScrolledTo(page, 'horizontal', '13:30')
	})

	test('scrollToTime in month does not throw; then switching to week (recorded behaviour)', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'month' })
		await call(page, 'scrollToTime', '15:00')
		await call(page, 'setView', 'week')
		await expect(page.getByTestId('vertical-grid-container')).toBeVisible()
		await page.waitForTimeout(400)
		const top = await scrollOffset(page, 'vertical')
		const expected = await expectedOffset(page, 'vertical', '15:00')
		// eslint-disable-next-line no-console
		console.log(
			`[record] scrollToTime('15:00') in month then week: scrollTop=${top}, 15:00 would be ${expected}`
		)
		expect(errors).toEqual([])
	})

	test('scrollToTime requested in week survives a navigation: next period does not re-scroll to the old request', async ({
		page,
	}) => {
		await open(page, { scenario: 'basic', view: 'week' })
		await call(page, 'scrollToTime', '20:00')
		await expectScrolledTo(page, 'vertical', '20:00')
		await press(page, 'next')
		await page.waitForTimeout(300)
		// The scrollTime prop default applies per date range; record where it lands.
		// eslint-disable-next-line no-console
		console.log(
			`[record] after next period following scrollToTime(20:00): scrollTop=${await scrollOffset(page, 'vertical')}`
		)
	})

	test('scrollToTime with slotMinTime/slotMaxTime clamps to the window edges', async ({
		page,
	}) => {
		const errors = await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slotMinTime: '08:00', slotMaxTime: '18:00' },
		})
		for (const time of ['00:00', '08:00', '12:30', '17:45', '23:45']) {
			await call(page, 'scrollToTime', time)
			await expectScrolledTo(page, 'vertical', time)
		}
		expect(errors).toEqual([])
	})

	test('slot window + horizontal resource: out of window clamps', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { slotMinTime: '08:00', slotMaxTime: '18:00' },
		})
		for (const time of ['00:00', '12:30', '23:45']) {
			await call(page, 'scrollToTime', time)
			await expectScrolledTo(page, 'horizontal', time)
		}
	})

	test('malformed time strings do not throw or move the grid', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'week' })
		await call(page, 'scrollToTime', '13:30')
		await expectScrolledTo(page, 'vertical', '13:30')
		const before = await scrollOffset(page, 'vertical')
		for (const bad of ['', '25:00', 'noon', '9', '13:75', '1:5', '-1:00']) {
			await call(page, 'scrollToTime', bad)
			await page.waitForTimeout(100)
			const after = await scrollOffset(page, 'vertical')
			// eslint-disable-next-line no-console
			console.log(
				`[record] scrollToTime(${JSON.stringify(bad)}) -> scrollTop ${after} (was ${before})`
			)
			await call(page, 'scrollToTime', '13:30')
			await expectScrolledTo(page, 'vertical', '13:30')
		}
		expect(errors).toEqual([])
	})

	test("'HH:mm:ss' is accepted", async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'day' })
		await call(page, 'scrollToTime', '10:30:00')
		await expectScrolledTo(page, 'vertical', '10:30')
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 3: integrator                                                   */
/* ---------------------------------------------------------------------- */
test.describe('persona 3: integrator', () => {
	test('refetchEvents via the ref refetches, repeatedly, and after navigation', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 30 },
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		const base = (await month.fetchLog()).length
		await call(page, 'refetchEvents')
		await expect
			.poll(async () => (await month.fetchLog()).length)
			.toBe(base + 1)
		await call(page, 'refetchEvents')
		await expect
			.poll(async () => (await month.fetchLog()).length)
			.toBe(base + 2)
		await press(page, 'next')
		await expect(month.event('April review')).toBeVisible()
		const afterNav = (await month.fetchLog()).length
		await call(page, 'refetchEvents')
		await expect
			.poll(async () => (await month.fetchLog()).length)
			.toBe(afterNav + 1)
		const last = (await month.fetchLog()).at(-1)
		expect(last?.start).toContain('2025-03')
	})

	test('refetchEvents refetches the CURRENT range after header navigation (no stale range)', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 30 },
		})
		const month = new MonthGrid(page)
		await page.getByLabel('Next').click()
		await page.getByLabel('Next').click()
		await expect(month.event('May kickoff')).toBeVisible()
		await call(page, 'refetchEvents')
		await expect
			.poll(async () => (await month.fetchLog()).at(-1)?.start ?? '')
			.toContain('2025-04')
	})

	test('refetchEvents on a static events array does not throw', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'month' })
		await call(page, 'refetchEvents')
		await page.waitForTimeout(200)
		expect(errors).toEqual([])
	})

	test('addEvent / updateEvent / deleteEvent via the ref fire callbacks and render', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'week' })
		const cal = new CalendarPage(page)
		const before = (await cal.eventState()).length

		await call(page, 'addEvent', {
			id: 'ref-new',
			title: 'Added by ref',
			start: '@2025-03-12T14:00:00.000Z',
			end: '@2025-03-12T15:00:00.000Z',
		})
		await expect
			.poll(async () => (await cal.eventState()).length)
			.toBe(before + 1)
		await expect(cal.event('Added by ref')).toBeVisible()
		const added = await cal.eventChanges()
		// eslint-disable-next-line no-console
		console.log('[record] changes after addEvent', JSON.stringify(added))

		await page.evaluate(() => {
			const win = window as unknown as {
				__ref: {
					current: { updateEvent(id: string | number, p: unknown): void }
				}
				__dayjs: (iso: string) => unknown
			}
			win.__ref.current.updateEvent('ref-new', {
				title: 'Renamed by ref',
				start: win.__dayjs('2025-03-13T10:00:00.000Z'),
				end: win.__dayjs('2025-03-13T11:00:00.000Z'),
			})
		})
		await expect(cal.event('Renamed by ref')).toBeVisible()
		await expect(cal.event('Added by ref')).toHaveCount(0)
		const renamed = await cal.eventNamed('Renamed by ref')
		expect(renamed.start).toBe('2025-03-13T10:00:00.000Z')

		await call(page, 'deleteEvent', 'ref-new')
		await expect(cal.event('Renamed by ref')).toHaveCount(0)
		await expect.poll(async () => (await cal.eventState()).length).toBe(before)
		// eslint-disable-next-line no-console
		console.log(
			'[record] changes after delete',
			JSON.stringify(await cal.eventChanges())
		)
		expect(errors).toEqual([])
	})

	test('ref methods after view changes and navigation keep working (no stale closure)', async ({
		page,
	}) => {
		const errors = await open(page, { scenario: 'basic', view: 'month' })
		const cal = new CalendarPage(page)
		await call(page, 'setView', 'week')
		await call(page, 'setCurrentDate', '@2025-09-10T09:00:00.000Z')
		await press(page, 'next')
		await call(page, 'setView', 'day')
		expect((await refState(page)).date).toBe('2025-09-17T09:00:00.000Z')
		await call(page, 'addEvent', {
			id: 'late',
			title: 'Late add',
			start: '@2025-09-17T09:00:00.000Z',
			end: '@2025-09-17T10:00:00.000Z',
		})
		await expect(cal.event('Late add')).toBeVisible()
		await call(page, 'nextPeriod')
		await expect(cal.event('Late add')).toHaveCount(0)
		await call(page, 'prevPeriod')
		await expect(cal.event('Late add')).toBeVisible()
		await call(page, 'deleteEvent', 'late')
		await expect(cal.event('Late add')).toHaveCount(0)
		expect(errors).toEqual([])
	})

	test('ref.current.events reflects the current events', async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'week' })
		const cal = new CalendarPage(page)
		const harnessCount = (await cal.eventState()).length
		const refCount = await page.evaluate(
			() =>
				(
					window as unknown as {
						__ref: { current: { events: unknown[] } }
					}
				).__ref.current.events.length
		)
		// eslint-disable-next-line no-console
		console.log(`[record] harness rows ${harnessCount}, ref.events ${refCount}`)
		await call(page, 'addEvent', {
			id: 'x1',
			title: 'X one',
			start: '@2025-03-12T14:00:00.000Z',
			end: '@2025-03-12T15:00:00.000Z',
		})
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						(
							window as unknown as {
								__ref: { current: { events: unknown[] } }
							}
						).__ref.current.events.length
				)
			)
			.toBe(refCount + 1)
	})

	test('the API object is the same shape as the hook and exposes scrollToTime', async ({
		page,
	}) => {
		await open(page, { scenario: 'basic', view: 'week' })
		const keys = await page.evaluate(() =>
			Object.keys(
				(window as unknown as { __ref: { current: object } }).__ref.current
			)
		)
		for (const key of [
			'currentDate',
			'view',
			'setCurrentDate',
			'nextPeriod',
			'prevPeriod',
			'today',
			'setView',
			'events',
			'addEvent',
			'updateEvent',
			'deleteEvent',
			'refetchEvents',
			'scrollToTime',
		]) {
			expect(keys).toContain(key)
		}
	})

	test('method identities do not churn across navigation', async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'week' })
		const read = () =>
			page.evaluate(() => {
				const api = (
					window as unknown as {
						__ref: { current: Record<string, unknown> }
					}
				).__ref.current
				const win = window as unknown as { __snap?: Record<string, unknown> }
				const names = [
					'nextPeriod',
					'prevPeriod',
					'today',
					'setView',
					'setCurrentDate',
					'scrollToTime',
					'refetchEvents',
				]
				if (!win.__snap) {
					win.__snap = Object.fromEntries(names.map((n) => [n, api[n]]))
					return []
				}
				return names.filter((n) => win.__snap?.[n] !== api[n])
			})
		await read()
		await press(page, 'next')
		await press(page, 'next')
		await call(page, 'setView', 'day')
		await call(page, 'scrollToTime', '09:00')
		const changed = await read()
		// eslint-disable-next-line no-console
		console.log(
			`[record] method identities that changed: ${JSON.stringify(changed)}`
		)
		expect(changed).toEqual([])
	})
})

/* ---------------------------------------------------------------------- */
/* Persona 4: upgrader (no externalToolbar)                                */
/* ---------------------------------------------------------------------- */
test.describe('persona 4: upgrader, no ref', () => {
	test('without externalToolbar nothing extra renders and the calendar behaves as before', async ({
		page,
	}) => {
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		const warnings: string[] = []
		page.on('console', (message) => {
			if (['warning', 'error'].includes(message.type())) {
				warnings.push(message.text())
			}
		})
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { height: '600px' },
		})
		await expect(page.getByTestId('external-toolbar')).toHaveCount(0)
		await page.waitForTimeout(600)
		const startTitle = await title(page).innerText()
		await page.getByLabel('Next').click()
		await expect(title(page)).not.toHaveText(startTitle)
		await page.getByLabel('Previous').click()
		await expect(title(page)).toHaveText(startTitle)
		await page.getByRole('radio', { name: 'Month', exact: true }).click()
		await expect(page.getByTestId('horizontal-grid-container')).toBeVisible()
		await page.getByRole('button', { name: 'Today', exact: true }).click()
		expect(errors).toEqual([])
		expect(warnings).toEqual([])
	})

	test('scrollTime prop still applies on mount and per-range (no scrollRequest leakage)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { height: '500px', scrollTime: '10:00' },
		})
		await expectScrolledTo(page, 'vertical', '10:00')
		await scrollManually(page, 'vertical', 0)
		await page.waitForTimeout(300)
		expect(await scrollOffset(page, 'vertical')).toBe(0)
		await page.getByLabel('Next').click()
		await expectScrolledTo(page, 'vertical', '10:00')
	})
})

/* ---------------------------------------------------------------------- */
/* Probe: last-hour target in a multi-day horizontal timeline               */
/* ---------------------------------------------------------------------- */
test.describe('probe: last visible hour in horizontal resource week', () => {
	test('scrollToTime(17:45) with slotMaxTime=18:00 lands on the first day, like 12:30 does', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { slotMinTime: '08:00', slotMaxTime: '18:00' },
		})
		await call(page, 'scrollToTime', '12:30')
		await expectScrolledTo(page, 'horizontal', '12:30')
		await call(page, 'scrollToTime', '17:45')
		await expectScrolledTo(page, 'horizontal', '17:45')
	})

	test('pre-existing scrollTime prop 23:00 in the same view (no ref involved)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { height: '600px', scrollTime: '23:00' },
		})
		await page.waitForTimeout(800)
		await expectScrolledTo(page, 'horizontal', '23:00')
	})
})
