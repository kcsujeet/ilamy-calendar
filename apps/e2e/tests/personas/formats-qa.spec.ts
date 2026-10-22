import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, type ScenarioOptions } from '../support/harness'
import { TimeGrid } from '../support/pages'

/**
 * QA pass over 3.3.6 formats: international users, header designers, and
 * upgraders who pass nothing.
 */

const json = (value: Intl.DateTimeFormatOptions) => JSON.stringify(value)
const HM = json({ hour: 'numeric', minute: '2-digit' })
const HM_2D = json({ hour: '2-digit', minute: '2-digit' })

/** What the browser's own Intl writes: the oracle every expectation is built from. */
const intl = (
	page: Page,
	locale: string,
	options: Intl.DateTimeFormatOptions,
	iso: string,
	timeZone: string,
	endIso?: string
) =>
	page.evaluate(
		([loc, opts, start, zone, end]) => {
			const formatter = new Intl.DateTimeFormat(loc as string, {
				...(opts as Intl.DateTimeFormatOptions),
				timeZone: zone as string,
			})
			return end
				? formatter.formatRange(
						new Date(start as string),
						new Date(end as string)
					)
				: formatter.format(new Date(start as string))
		},
		[locale, options, iso, timeZone, endIso ?? ''] as const
	)

const open = async (page: Page, options: ScenarioOptions) => {
	await gotoScenario(page, options)
	return new TimeGrid(page)
}

/**
 * Elements in `locator` whose text is wider than their box and that do not
 * show an ellipsis: text cut off with no sign of it (a sane truncation shows "…").
 */
const isClipped = (locator: Locator) =>
	locator.evaluate((root) => {
		const all = [root, ...Array.from(root.querySelectorAll('*'))]
		return all
			.filter(
				(el) =>
					el.scrollWidth > el.clientWidth + 1 &&
					el.clientWidth > 0 &&
					getComputedStyle(el).textOverflow !== 'ellipsis'
			)
			.map(
				(el) =>
					`${el.tagName}.${(el as HTMLElement).className} ${el.scrollWidth}>${el.clientWidth} "${el.textContent}"`
			)
	})

const ZONES = ['America/New_York', 'Asia/Kolkata']
/** The instant at which each zone's wall clock reads 15:00 on 12 March 2025. */
const GUTTER_15_00: Record<string, string> = {
	'America/New_York': '2025-03-12T19:00:00.000Z',
	'Asia/Kolkata': '2025-03-12T09:30:00.000Z',
}
const LOCALES = ['de', 'fr', 'ja', 'ar']

test.describe('persona 1: international user', () => {
	for (const locale of LOCALES) {
		for (const timezone of ZONES) {
			const tag = `${locale} in ${timezone}`

			test(`${tag}: gutter, bar and range follow the calendar zone and locale`, async ({
				page,
			}) => {
				const grid = await open(page, {
					scenario: 'short-events',
					view: 'week',
					timezone,
					settings: {
						locale,
						slotHeaderFormat: HM,
						eventTimeFormat: HM,
						displayEventEnd: 'true',
					},
				})
				const start = '2025-03-12T09:30:00.000Z'
				const end = '2025-03-12T10:00:00.000Z'
				const expected = await intl(
					page,
					locale,
					JSON.parse(HM),
					start,
					timezone,
					end
				)
				await expect(grid.bars('short-2')).toContainText(expected)

				// 15:00 on the calendar's wall clock, an hour the gutter draws.
				const gutterSample = GUTTER_15_00[timezone]
				const expectedGutter = await intl(
					page,
					locale,
					JSON.parse(HM),
					gutterSample,
					timezone
				)
				const labels = await grid.hourLabels.allTextContents()
				expect(labels).toContain(expectedGutter)
			})

			for (const timeFormat of ['12-hour', '24-hour']) {
				test(`${tag} timeFormat=${timeFormat}: gutter and bar agree`, async ({
					page,
				}) => {
					const grid = await open(page, {
						scenario: 'short-events',
						view: 'week',
						timezone,
						settings: {
							locale,
							timeFormat,
							slotHeaderFormat: HM_2D,
							eventTimeFormat: HM_2D,
						},
					})
					const hour12 = timeFormat === '12-hour'
					const opts = { hour: '2-digit', minute: '2-digit', hour12 } as const
					const expectedBar = await intl(
						page,
						locale,
						opts,
						'2025-03-12T09:30:00.000Z',
						timezone
					)
					const expectedGutter = await intl(
						page,
						locale,
						opts,
						GUTTER_15_00[timezone],
						timezone
					)
					await expect(grid.bars('short-2')).toContainText(expectedBar)
					expect(await grid.hourLabels.allTextContents()).toContain(
						expectedGutter
					)
				})
			}

			test(`${tag} no timeFormat: locale decides`, async ({ page }) => {
				const grid = await open(page, {
					scenario: 'short-events',
					view: 'week',
					timezone,
					settings: { locale, slotHeaderFormat: HM, eventTimeFormat: HM },
				})
				const expectedBar = await intl(
					page,
					locale,
					JSON.parse(HM),
					'2025-03-12T09:30:00.000Z',
					timezone
				)
				await expect(grid.bars('short-2')).toContainText(expectedBar)
			})

			test(`${tag}: dayHeaderFormat and titleFormat`, async ({ page }) => {
				const dayHeaderFormat = { weekday: 'long' } as const
				const titleFormat = { month: 'long', year: 'numeric' } as const
				const grid = await open(page, {
					scenario: 'short-events',
					view: 'week',
					timezone,
					settings: {
						locale,
						dayHeaderFormat: json(dayHeaderFormat),
						titleFormat: json(titleFormat),
					},
				})
				const weekday = await intl(
					page,
					locale,
					dayHeaderFormat,
					'2025-03-12T09:00:00.000Z',
					timezone
				)
				await expect(
					page.getByTestId('week-header-weekday-wednesday')
				).toHaveText(weekday)
				const title = await intl(
					page,
					locale,
					titleFormat,
					'2025-03-12T09:00:00.000Z',
					timezone
				)
				await expect(grid.title).toContainText(title)
			})
		}
	}

	test('midnight in a 24-hour gutter reads 00:00, not 24:00', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: {
				slotHeaderFormat: json({
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				}),
			},
		})
		const labels = await grid.hourLabels.allTextContents()
		expect(labels.filter((label) => label.startsWith('24'))).toEqual([])
	})

	test('midnight in a 24-hour gutter via timeFormat reads 00:00, not 24:00', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { slotHeaderFormat: HM_2D, timeFormat: '24-hour' },
		})
		const labels = await grid.hourLabels.allTextContents()
		expect(labels.filter((label) => label.startsWith('24'))).toEqual([])
	})

	test('an event at 00:30 reads 00:30, not 24:30, in 24-hour', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: {
				eventTimeFormat: json({
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				}),
			},
		})
		const text = await grid.root.textContent()
		expect(text).not.toMatch(/24:\d\d/)
	})

	test('timeFormat=24-hour with displayEventTime (no format) never prints 24:xx', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: { displayEventTime: 'true', timeFormat: '24-hour' },
		})
		expect(await grid.root.textContent()).not.toMatch(/24:\d\d/)
	})

	test('de default gutter (no params) is unchanged by the locale', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { locale: 'de' },
		})
		const labels = await grid.hourLabels.allTextContents()
		expect(labels.slice(9, 12)).toEqual(['9 AM', '10 AM', '11 AM'])
	})
})

test.describe('persona 2: designer', () => {
	const WEEKDAY_LONG = json({ weekday: 'long' })
	const LONG = json({ weekday: 'long', month: 'long', day: 'numeric' })

	for (const [name, format] of [
		['weekday long', WEEKDAY_LONG],
		['weekday long + month long + day', LONG],
		['weekday short + day', json({ weekday: 'short', day: 'numeric' })],
		['numeric day only', json({ day: 'numeric' })],
		['full date', json({ dateStyle: 'full' } as Intl.DateTimeFormatOptions)],
	] as const) {
		test(`week view, ${name}: text is not clipped`, async ({ page }) => {
			await open(page, {
				scenario: 'short-events',
				view: 'week',
				settings: { dayHeaderFormat: format },
			})
			const cell = page.getByTestId('week-header-weekday-wednesday')
			expect(await isClipped(cell)).toEqual([])
		})

		test(`month view, ${name}: text is not clipped`, async ({ page }) => {
			await open(page, {
				scenario: 'basic',
				view: 'month',
				settings: { dayHeaderFormat: format },
			})
			expect(await isClipped(page.getByTestId('month-header'))).toEqual([])
		})

		test(`resource horizontal week, ${name}: text is not clipped`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'resources',
				view: 'week',
				orientation: 'horizontal',
				settings: { dayHeaderFormat: format },
			})
			const cells = page.getByTestId('resource-week-day-header')
			expect(await isClipped(cells.nth(3))).toEqual([])
		})

		test(`resource vertical week, ${name}: text is not clipped`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'resources',
				view: 'week',
				orientation: 'vertical',
				settings: { dayHeaderFormat: format },
			})
			const today = page.locator('[data-today="true"]').first()
			await expect(today).toBeVisible()
			const header = today.locator('xpath=ancestor::*[3]')
			expect(await isClipped(header)).toEqual([])
		})
	}

	for (const width of [800, 1024]) {
		for (const [view, orientation, scenario, testid] of [
			['week', undefined, 'short-events', 'week-header-weekday-wednesday'],
			['month', undefined, 'basic', 'month-header'],
			['week', 'horizontal', 'resources', 'resource-week-day-header'],
		] as const) {
			test(`${width}px ${view} ${orientation ?? ''} with a long dayHeaderFormat: header text is cut with an ellipsis or fits`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: 700 })
				await open(page, {
					scenario,
					view,
					orientation,
					settings: { dayHeaderFormat: LONG, granularity: 'daily' },
				})
				await page.waitForTimeout(700)
				const header = page.getByTestId(testid).first()
				expect(await isClipped(header)).toEqual([])
			})
		}
	}

	for (const granularity of ['daily', 'hourly']) {
		test(`resource horizontal week (${granularity}) at 800px: every label stays inside its header cell`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 800, height: 700 })
			await open(page, {
				scenario: 'resources',
				view: 'week',
				orientation: 'horizontal',
				settings: { dayHeaderFormat: LONG, granularity },
			})
			await page.waitForTimeout(700)
			const cells = page.getByTestId('resource-week-day-header')
			const outside = await cells.evaluateAll((headerCells) =>
				headerCells.flatMap((cell) => {
					const cellBox = cell.getBoundingClientRect()
					return Array.from(cell.querySelectorAll('span'))
						.filter((label) => {
							const box = label.getBoundingClientRect()
							return (
								box.width > 0 &&
								(box.right > cellBox.right + 1 || box.left < cellBox.left - 1)
							)
						})
						.map((label) => label.textContent)
				})
			)
			expect(outside).toEqual([])
			expect(await isClipped(cells.nth(3))).toEqual([])
		})
	}

	test('a truncated header label carries its full text as a title', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { dayHeaderFormat: LONG },
		})
		const label = page
			.getByTestId('week-header-weekday-wednesday')
			.locator('span')
			.first()
		await expect(label).toHaveAttribute('title', 'Wednesday, March 12')
	})

	test('day view long format is whole header and today badge still shows', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { dayHeaderFormat: LONG },
		})
		const header = page.getByTestId('day-view-header')
		await expect(header).toContainText('Wednesday, March 12')
		await expect(header).toContainText(/today/i)
		expect(await isClipped(header)).toEqual([])
	})

	test('day view header for a non-today date has no today badge', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'short-events',
			view: 'day',
			date: '2025-03-13T09:00:00.000Z',
			settings: { dayHeaderFormat: LONG },
		})
		await expect(page.getByTestId('day-view-header')).not.toContainText(
			/today/i
		)
	})

	test('today stays highlighted in week, resource and only on today', async ({
		page,
	}) => {
		for (const [view, orientation, scenario] of [
			['week', undefined, 'short-events'],
			['week', 'horizontal', 'resources'],
			['week', 'vertical', 'resources'],
		] as const) {
			await open(page, {
				scenario,
				view,
				orientation,
				settings: { dayHeaderFormat: LONG },
			})
			const today = page.locator('[data-today="true"]')
			// one header per resource column in the vertical resource week
			await expect(today, `${scenario} ${orientation}`).toHaveCount(
				orientation === 'vertical' ? 3 : 1
			)
			await expect(today.first()).toContainText('Wednesday')
			const bg = await today
				.locator('span')
				.first()
				.evaluate((el) => getComputedStyle(el).backgroundColor)
			expect(bg).not.toBe('rgba(0, 0, 0, 0)')
		}
	})

	test('month view with dayHeaderFormat: today is still marked in the grid', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'month',
			settings: { dayHeaderFormat: LONG },
		})
		await expect(page.getByTestId('day-number-today')).toBeVisible()
	})

	test('resource month vertical/horizontal with dayHeaderFormat renders', async ({
		page,
	}) => {
		for (const orientation of ['vertical', 'horizontal'] as const) {
			await open(page, {
				scenario: 'resources',
				view: 'month',
				orientation,
				settings: {
					dayHeaderFormat: json({ weekday: 'short', day: 'numeric' }),
				},
			})
			await expect(page.getByTestId('harness-error')).toHaveCount(0)
			await expect(page.getByTestId('ilamy-calendar')).toContainText(/Wed/)
		}
	})

	test('titleFormat across a week that spans two months', async ({ page }) => {
		const grid = await open(page, {
			scenario: 'cross-month-week',
			view: 'week',
			date: '2025-03-31T09:00:00.000Z',
			settings: { titleFormat: json({ month: 'long', year: 'numeric' }) },
		})
		await expect(grid.title).toHaveText('March – April 2025')
		expect(await isClipped(grid.title)).toEqual([])
	})

	test('titleFormat across a year boundary week (2025-12-29)', async ({
		page,
	}) => {
		const format = { month: 'short', day: 'numeric', year: 'numeric' } as const
		const grid = await open(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-12-29T09:00:00.000Z',
			now: '2025-12-29T09:00:00.000Z',
			settings: { titleFormat: json(format) },
		})
		const start = await intl(
			page,
			'en-US',
			format,
			'2025-12-28T00:00:00.000Z',
			'UTC',
			'2026-01-03T23:59:59.999Z'
		)
		await expect(grid.title).toHaveText(start)
		expect(await isClipped(grid.title)).toEqual([])
	})

	test('titleFormat month+year in the year-boundary week', async ({ page }) => {
		const grid = await open(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-12-29T09:00:00.000Z',
			now: '2025-12-29T09:00:00.000Z',
			settings: { titleFormat: json({ month: 'long', year: 'numeric' }) },
		})
		await expect(grid.title).toHaveText('December 2025 – January 2026')
	})

	test('titleFormat in the default (unset) cross-year week is unchanged', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-12-29T09:00:00.000Z',
			now: '2025-12-29T09:00:00.000Z',
		})
		await expect(grid.title).toHaveText('Dec 28 – Jan 3')
	})

	test('titleFormat applies in day, month and year views', async ({ page }) => {
		const format = json({ month: 'long', year: 'numeric' })
		for (const [view, expected] of [
			['day', 'March 2025'],
			['month', 'March 2025'],
			// Contract moved: titleFormat formats the view's range (FullCalendar
			// title-formatting.ts:15-16, 25-31), so the year view names the year.
			['year', 'January – December 2025'],
		] as const) {
			const grid = await open(page, {
				scenario: 'basic',
				view,
				settings: { titleFormat: format },
			})
			await expect(grid.title, view).toHaveText(expected)
		}
	})
})

test.describe('persona 3: upgrader', () => {
	test('week: gutter, header, bar, title exactly as before', async ({
		page,
	}) => {
		const grid = await open(page, { scenario: 'short-events', view: 'week' })
		const labels = await grid.hourLabels.allTextContents()
		expect(labels.slice(0, 3)).toEqual(['12 AM', '1 AM', '2 AM'])
		expect(labels.at(12)).toBe('12 PM')
		expect(labels.at(13)).toBe('1 PM')
		await expect(page.getByTestId('week-header-weekday-wednesday')).toHaveText(
			'Wed12'
		)
		await expect(grid.bars('short-1')).toHaveText('Quarter hour')
		await expect(grid.bars('short-3')).toHaveText('Off the slot boundary')
		await expect(grid.title).toHaveText('Mar 9 – 15')
	})

	test('week timeFormat=24-hour: gutter is plain 0..23 as before', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { timeFormat: '24-hour' },
		})
		const labels = await grid.hourLabels.allTextContents()
		expect(labels.slice(0, 3)).toEqual(['0', '1', '2'])
		expect(labels.at(23)).toBe('23')
		await expect(grid.bars('short-2')).toHaveText('Half hour')
	})

	test('day, month, year, resource views: bar text carries no time', async ({
		page,
	}) => {
		for (const [scenario, view, orientation, title] of [
			['basic', 'day', undefined, 'Morning stand-up'],
			['basic', 'month', undefined, 'Morning stand-up'],
			['resources', 'week', 'vertical', 'Room A booking'],
			['resources', 'week', 'horizontal', 'Room A booking'],
			['resources', 'day', 'vertical', 'Room A booking'],
			['resources', 'month', 'horizontal', 'Room A booking'],
		] as const) {
			await open(page, { scenario, view, orientation })
			const bar = page
				.locator(
					'[data-testid^="vertical-event-"], [data-testid^="horizontal-event-"]'
				)
				.filter({ hasText: title })
				.first()
			await expect(bar, `${scenario} ${view} ${orientation}`).toHaveText(title)
		}
	})

	test('headers unchanged in every view', async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'month' })
		await expect(page.getByTestId('month-header-weekday-wed')).toHaveText('Wed')
		await open(page, { scenario: 'basic', view: 'day' })
		await expect(page.getByTestId('day-view-header')).toContainText(
			'Wednesday, March 12, 2025'
		)
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
		})
		await expect(
			page.getByTestId('resource-week-day-header').nth(3)
		).toHaveText('Wed12')
		await open(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
		})
		await expect(page.locator('[data-today="true"]')).toHaveCount(3)
	})

	test('titles unchanged: day, month, year', async ({ page }) => {
		for (const [view, expected] of [
			['day', 'Wed, Mar 12, 2025'],
			['month', 'Mar 2025'],
			['year', '2025'],
		] as const) {
			const grid = await open(page, { scenario: 'basic', view })
			await expect(grid.title, view).toHaveText(expected)
		}
	})

	test('de + tz, no formats: gutter stays "h A" (old behaviour)', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			timezone: 'Asia/Kolkata',
		})
		const labels = await grid.hourLabels.allTextContents()
		expect(labels.slice(0, 2)).toEqual(['12 AM', '1 AM'])
	})

	test('displayEventTime=false alone changes nothing', async ({ page }) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { displayEventTime: 'false' },
		})
		await expect(grid.bars('short-2')).toHaveText('Half hour')
	})

	test('displayEventEnd alone (no displayEventTime, no format) changes nothing', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { displayEventEnd: 'true' },
		})
		await expect(grid.bars('short-2')).toHaveText('Half hour')
	})

	test('displayEventTime=true alone (no format) shows a time', async ({
		page,
	}) => {
		const grid = await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { displayEventTime: 'true' },
		})
		await expect(grid.bars('short-2')).toContainText(/9:30\s?AM/)
	})

	test('renderEvent still wins over eventTimeFormat', async ({ page }) => {
		await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: {
				renderEventVariant: 'sticky-title',
				eventTimeFormat: HM,
				displayEventTime: 'true',
			},
		})
		const bar = page.getByTestId('vertical-event-short-2')
		await expect(bar).toContainText('Half hour')
		await expect(bar).not.toContainText(/9:30/)
	})
})
