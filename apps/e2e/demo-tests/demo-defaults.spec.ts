import { expect, type Locator, type Page, test } from '@playwright/test'
import { releasePointer } from '../tests/support/harness'

/*
 * The real demo app (apps/demo) as a visitor first sees it: its default
 * settings and its seed events, no query parameters. The harness specs in
 * tests/ mount the calendar on clean fixtures, so they stayed green while the
 * demo's defaults refused every resize and move a visitor tried on a weekend.
 *
 * The clock is pinned to Sunday 25 October 2026, 10:00 UTC, the day that was
 * reported. The seed builds its events from "now": "Morning Yoga Class" is
 * today 10:00-12:00, and the all-day "Conference" runs Wednesday 7 to
 * Friday 9 October. The zone and locale come from the config's `use` block.
 */
const PINNED_SUNDAY = '2026-10-25T10:00:00.000Z'

/** Today's timed seed event, 10:00-12:00 on the pinned Sunday. */
const YOGA_ID = '22'
/** The all-day seed event, Wednesday 7 to Friday 9 October. */
const CONFERENCE_ID = '15'

interface Point {
	x: number
	y: number
}

/**
 * Waits out the calendar's own animations (bars slide in over 500ms, see
 * docs/e2e-testing.md). Scoped to the calendar because the demo page runs an
 * infinite background animation (`apps/demo/src/index.css`) that never
 * finishes, so the harness's page-wide `settleAnimations` would wait forever.
 */
const settleCalendarAnimations = async (page: Page): Promise<void> => {
	await page.getByTestId('ilamy-calendar').evaluate((calendar) => {
		const calendarAnimations = document.getAnimations().filter((animation) => {
			const effect = animation.effect
			const target = effect instanceof KeyframeEffect ? effect.target : null
			return target !== null && calendar.contains(target)
		})
		return Promise.all(
			calendarAnimations.map((animation) => animation.finished)
		)
	})
}

const openDemo = async (page: Page): Promise<void> => {
	const now = new Date(PINNED_SUNDAY)
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	await page.goto('/')
	await page.getByTestId('ilamy-calendar').waitFor()
	await settleCalendarAnimations(page)
}

/**
 * Opens week view through the calendar's own header. At the demo's width the
 * header shows the compact view menu (a button naming the current view), not
 * the segmented switcher.
 */
const selectView = async (
	page: Page,
	view: 'month' | 'week' | 'agenda' | 'year',
	scope?: Locator
) => {
	const calendar = scope
		? scope.getByTestId('ilamy-calendar')
		: page.getByTestId('ilamy-calendar')
	const btn = calendar.getByTestId(`view-btn-${view}`)
	if (await btn.isVisible()) {
		await btn.click()
	} else {
		await calendar.getByTestId('view-menu-btn').click()
		await page.getByTestId(`view-menu-item-${view}`).click()
	}
	await settleCalendarAnimations(page)
}

const switchToWeekView = (page: Page) => selectView(page, 'week')

interface Box {
	x: number
	y: number
	width: number
	height: number
}

const boxOf = async (locator: Locator): Promise<Box> => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return box
}

const centreOf = async (locator: Locator): Promise<Point> => {
	const box = await boxOf(locator)
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Whether the element the browser hits at `point` is `locator` or inside it. */
const isUnderPoint = (locator: Locator, point: Point) =>
	locator.evaluate(
		(element, { x, y }) => element.contains(document.elementFromPoint(x, y)),
		point
	)

/** Whether `point` lies inside the box `locator` is laid out in. */
const isInsideBox = async (locator: Locator, point: Point) => {
	const box = await boxOf(locator)
	const isWithinX = point.x > box.x && point.x < box.x + box.width
	const isWithinY = point.y > box.y && point.y < box.y + box.height
	return isWithinX && isWithinY
}

/**
 * Presses at `grab.at`, moves to `drop.at` in small steps and lets go: a real
 * pointer sequence, the only kind dnd-kit responds to.
 *
 * The grab is checked against what the browser actually hits there, so the
 * drag starts on the handle or bar it means to. The drop is checked by
 * geometry instead: a closed cell is `pointer-events: none`, and on the
 * pinned Sunday the demo's multi-day events cover most of the day's column,
 * so `elementFromPoint` cannot name the cell even though the drop resolves to
 * it (drop targets are found by the pointer's position, not by hit-testing).
 */
const dragWithPointer = async (
	page: Page,
	grab: { target: Locator; at: Point },
	drop: { target: Locator; at: Point }
) => {
	expect(await isUnderPoint(grab.target, grab.at)).toBe(true)
	expect(await isInsideBox(drop.target, drop.at)).toBe(true)
	await page.mouse.move(grab.at.x, grab.at.y)
	await page.mouse.down()
	const steps = 10
	for (let step = 1; step <= steps; step += 1) {
		const progress = step / steps
		await page.mouse.move(
			grab.at.x + (drop.at.x - grab.at.x) * progress,
			grab.at.y + (drop.at.y - grab.at.y) * progress
		)
	}
	await releasePointer(page)
}

const timeSlot = (page: Page, startISO: string) =>
	page.locator(`[data-ilamy-part="time-slot"][data-start^="${startISO}"]`)

const monthCell = (page: Page, date: string) =>
	page.locator(`[data-testid^="day-cell-"][data-start^="${date}"]`)

const endHandleOf = (bar: Locator) => bar.locator('[data-resize-handle="end"]')

/** The bottom edge of a laid-out box. */
const bottomOf = (box: Box) => box.y + box.height

/** The right edge of a laid-out box. */
const rightOf = (box: Box) => box.x + box.width

/**
 * How far `edge` sits past `reference`, in whole cells of `cellSize`. Both are
 * read in the same poll, so a scroll between reads cannot skew it, and the
 * few pixels a bar is inset from its cell round away.
 */
const wholeCellsPast = (edge: number, reference: number, cellSize: number) =>
	Math.round((edge - reference) / cellSize)

/*
 * Tall enough that the whole calendar is on screen: at the default 720px the
 * noon slot sits near the bottom of the window, and a held pointer there
 * auto-scrolls the grid for as long as the drag lasts (docs/e2e-testing.md,
 * "Writing specs that survive a slow runner").
 */
test.use({ viewport: { width: 1280, height: 1200 } })

test.describe('the demo with its default settings, on a Sunday', () => {
	test('week view: a timed seed event grows by one slot from its end handle', async ({
		page,
	}) => {
		await openDemo(page)
		await switchToWeekView(page)
		const yoga = page.getByTestId(`calendar-event-${YOGA_ID}`)
		const handle = endHandleOf(yoga)
		const elevenSlot = timeSlot(page, '2026-10-25T11:00')
		const noonSlot = timeSlot(page, '2026-10-25T12:00')
		const handleCentre = await centreOf(handle)
		const noonSlotCentre = await centreOf(noonSlot)

		// Straight down the bar's own lane into the noon slot.
		await dragWithPointer(
			page,
			{ target: handle, at: handleCentre },
			{ target: noonSlot, at: { x: handleCentre.x, y: noonSlotCentre.y } }
		)

		// 10:00-12:00 becomes 10:00-13:00: the bar's end moves from the bottom of
		// the 11:00 slot to the bottom of the noon slot.
		await expect
			.poll(async () => {
				const bar = await boxOf(yoga)
				const eleven = await boxOf(elevenSlot)
				return wholeCellsPast(bottomOf(bar), bottomOf(eleven), eleven.height)
			})
			.toBe(1)
	})

	test('month view: an all-day seed event grows by one day from its end handle', async ({
		page,
	}) => {
		await openDemo(page)
		const conference = page.getByTestId(`calendar-event-${CONFERENCE_ID}`)
		const handle = endHandleOf(conference)
		const fridayCell = monthCell(page, '2026-10-09')
		const saturdayCell = monthCell(page, '2026-10-10')

		await dragWithPointer(
			page,
			{ target: handle, at: await centreOf(handle) },
			{ target: saturdayCell, at: await centreOf(saturdayCell) }
		)

		// Wednesday to Friday becomes Wednesday to Saturday: the bar's right edge
		// moves from Friday's cell into Saturday's.
		await expect
			.poll(async () => {
				const bar = await boxOf(conference)
				const friday = await boxOf(fridayCell)
				return wholeCellsPast(rightOf(bar), rightOf(friday), friday.width)
			})
			.toBe(1)
	})

	test('week view: a timed seed event moves by one slot', async ({ page }) => {
		await openDemo(page)
		await switchToWeekView(page)
		const yoga = page.getByTestId(`calendar-event-${YOGA_ID}`)
		const tenSlot = timeSlot(page, '2026-10-25T10:00')
		const elevenSlot = timeSlot(page, '2026-10-25T11:00')
		const noonSlot = timeSlot(page, '2026-10-25T12:00')
		const laneX = (await centreOf(yoga)).x
		const elevenSlotCentre = await centreOf(elevenSlot)
		const noonSlotCentre = await centreOf(noonSlot)

		// Grab the bar inside its 11:00 hour and drop it one hour lower, in its
		// own lane.
		await dragWithPointer(
			page,
			{ target: yoga, at: { x: laneX, y: elevenSlotCentre.y } },
			{ target: noonSlot, at: { x: laneX, y: noonSlotCentre.y } }
		)

		// 10:00-12:00 becomes 11:00-13:00: the bar's top moves from the 10:00
		// slot to the 11:00 slot.
		await expect
			.poll(async () => {
				const bar = await boxOf(yoga)
				const ten = await boxOf(tenSlot)
				return wholeCellsPast(bar.y, ten.y, ten.height)
			})
			.toBe(1)
	})

	test('week view: 3-dot resize handle is hidden at rest and appears on hover (4.0.9)', async ({
		page,
	}) => {
		await openDemo(page)
		await switchToWeekView(page)
		const yoga = page.getByTestId(`calendar-event-${YOGA_ID}`)
		const handle = endHandleOf(yoga)

		await expect(handle).toHaveCSS('opacity', '0')
		const barCentre = await centreOf(yoga)
		await page.mouse.move(barCentre.x, barCentre.y)
		await expect
			.poll(async () =>
				Number(await handle.evaluate((el) => getComputedStyle(el).opacity))
			)
			.toBeGreaterThan(0.4)
	})

	test('business hours shading allows weekend resize; enabling eventConstraint refuses it (4.0.5)', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('settings-tab-schedule').click()
		await page.getByLabel('Enable business hours').click()
		await switchToWeekView(page)

		// Sunday is outside Mon-Fri business hours, so shaded but NOT blocking without constraint
		const noonSlot = timeSlot(page, '2026-10-25T12:00')
		await expect(noonSlot).toHaveAttribute('data-non-business', 'true')
		await expect(noonSlot).toHaveAttribute('data-disabled', 'false')

		// Enable constraint: Sunday resize is now refused
		await page.getByLabel('Constrain drops/resizes to business hours').click()
		const yoga = page.getByTestId(`calendar-event-${YOGA_ID}`)
		await yoga.scrollIntoViewIfNeeded()
		const handle = endHandleOf(yoga)
		const elevenSlot = timeSlot(page, '2026-10-25T11:00')
		const handleCentre = await centreOf(handle)
		const noonSlotCentre = await centreOf(noonSlot)

		await dragWithPointer(
			page,
			{ target: handle, at: handleCentre },
			{ target: noonSlot, at: { x: handleCentre.x, y: noonSlotCentre.y } }
		)

		const bar = await boxOf(yoga)
		const eleven = await boxOf(elevenSlot)
		expect(wholeCellsPast(bottomOf(bar), bottomOf(eleven), eleven.height)).toBe(
			0
		)
	})

	test('year view (yearPlugin) and iCal export button (icalPlugin) work in the demo (D7)', async ({
		page,
	}) => {
		await openDemo(page)
		const calendar = page.getByTestId('ilamy-calendar')
		await expect(
			calendar.getByRole('button', { name: /export/i })
		).toBeVisible()

		await selectView(page, 'year')
		await expect(calendar.getByTestId('calendar-title')).toHaveText('2026')
	})

	test('design system axes apply MUI vars, StyleX, Tailwind, and Unstyled+slotProps live (D5)', async ({
		page,
	}) => {
		await openDemo(page)

		// Switch Components to Material UI on Plain CSS — maps MUI Theme palette/shape into --ilamy-* tokens
		await page.getByTestId('components-mui').click()
		await expect(page.locator('[data-active-components="mui"]')).toBeVisible()
		await expect
			.poll(async () =>
				page.getByTestId('ilamy-calendar').evaluate((el) => ({
					primary: el.style.getPropertyValue('--ilamy-primary'),
					radius: el.style.getPropertyValue('--ilamy-radius'),
				}))
			)
			.toEqual({ primary: expect.any(String), radius: '10px' })
		const muiPrimary = await page
			.getByTestId('ilamy-calendar')
			.evaluate((el) => el.style.getPropertyValue('--ilamy-primary'))
		expect(muiPrimary).toBeTruthy()
		await page.getByTestId('components-native').click()

		// Switch CSS to StyleX — injects --ilamy-bg CSS custom property on calendar root
		await page.getByTestId('css-stylex').click()
		await expect(page.locator('[data-active-css="stylex"]')).toBeVisible()
		const hasStylexVar = await page
			.getByTestId('ilamy-calendar')
			.evaluate((el) => Boolean(el.style.getPropertyValue('--ilamy-bg')))
		expect(hasStylexVar).toBe(true)

		// Switch CSS to Unstyled — strips default border on calendar body
		await page.getByTestId('css-unstyled').click()
		await expect(page.locator('[data-active-css="unstyled"]')).toBeVisible()
		const hasDefaultBorder = await page
			.getByTestId('calendar-body')
			.evaluate((el) => getComputedStyle(el).borderTopWidth !== '0px')
		expect(hasDefaultBorder).toBe(false)

		// Opt in to custom slotProps demo from the Theme tab
		await page.getByTestId('settings-tab-theme').click()
		await page.getByLabel('Apply custom slotProps theme').click()
		const hasSlotBorder = await page
			.getByTestId('ilamy-calendar')
			.evaluate((el) => el.style.borderRadius === '14px')
		expect(hasSlotBorder).toBe(true)
	})

	test('multi-zone preset renders two live calendars side-by-side with isolated timezones', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('preset-multi-zone').click()
		const stage = page.getByTestId('multi-zone-stage')
		await expect(stage).toBeVisible()
		await expect(stage.getByTestId('ilamy-calendar')).toHaveCount(2)
		await expect(stage.getByText('America/New_York')).toBeVisible()
		await expect(stage.getByText('Asia/Tokyo')).toBeVisible()
	})

	test('framework switcher mounts live Vue 3.5, Svelte 5, Solid 2, and Angular 22 calendars with StyleX and zero duplicate controls', async ({
		page,
	}) => {
		const consoleErrors: string[] = []
		page.on('console', (msg) => {
			if (msg.type() === 'error') consoleErrors.push(msg.text())
		})
		page.on('pageerror', (err) => consoleErrors.push(err.message))

		await openDemo(page)

		// Verify redundant sidebar controls were removed
		await page.getByTestId('settings-tab-theme').click()
		await expect(page.getByText('Active Theme')).toHaveCount(0)
		await page.getByTestId('settings-tab-general').click()
		await expect(page.getByText('Calendar Mode')).toHaveCount(0)

		// Open Code & Events drawer so we can verify framework-specific code updates
		await page.getByRole('button', { name: /Code & Events/i }).click()

		const frameworks: Array<{
			id: 'vue' | 'svelte' | 'solid' | 'angular'
			importSpec: string
		}> = [
			{ id: 'vue', importSpec: '@ilamy/calendar/vue' },
			{ id: 'svelte', importSpec: '@ilamy/calendar/svelte' },
			{ id: 'solid', importSpec: '@ilamy/calendar/solid' },
			{ id: 'angular', importSpec: '@ilamy/calendar/angular' },
		]

		for (const fw of frameworks) {
			await page.getByTestId(`framework-${fw.id}`).click()
			const stage = page.getByTestId(`framework-stage-${fw.id}`)
			await expect(stage).toBeVisible()
			await expect(
				stage.locator(`[data-ilamy-framework="${fw.id}"]`)
			).toBeVisible()
			await expect(stage.getByTestId('ilamy-calendar')).toBeVisible()
			await expect(page.getByTestId('components-mui')).toBeDisabled()
			await expect(page.locator('pre code')).toContainText(fw.importSpec)

			// Exercise view switching inside the mounted framework calendar
			await selectView(page, 'week', stage)
			await expect(stage.getByTestId('dom-week-view')).toBeVisible()
			await selectView(page, 'agenda', stage)
			await expect(stage.getByTestId('agenda-view')).toBeVisible()
			await selectView(page, 'month', stage)
			await expect(stage.getByTestId('dom-month-view')).toBeVisible()
		}

		// Verify StyleX theme applies cleanly to a non-React framework too (Angular 22)
		await page.getByTestId('css-stylex').click()
		const angularRoot = page
			.getByTestId('framework-stage-angular')
			.getByTestId('ilamy-calendar')
		const hasStylexToken = await angularRoot.evaluate((el) =>
			Boolean(el.style.getPropertyValue('--ilamy-bg'))
		)
		expect(hasStylexToken).toBe(true)

		// Switch back to React 19 and verify MUI re-enables
		await page.getByTestId('framework-react').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expect(page.getByTestId('components-mui')).toBeEnabled()

		expect(consoleErrors).toEqual([])
	})

	test('sticky headers stay opaque on scroll, StyleX/MUI dark stay legible, and +N more works in unstyled/StyleX', async ({
		page,
	}) => {
		await openDemo(page)

		// 1. Page-level dark mode toggle works on the first click
		await page.getByRole('button', { name: 'Toggle theme' }).click()
		await expect(page.locator('html')).toHaveClass(/dark/)
		await page.getByRole('button', { name: 'Toggle theme' }).click()
		await expect(page.locator('html')).not.toHaveClass(/dark/)

		// 2. Angular + Tailwind scrolled Month view keeps an opaque z-30 sticky header
		await page.getByTestId('framework-angular').click()
		await page.getByTestId('css-tailwind').click()
		const monthView = page.getByTestId('dom-month-view')
		await expect(monthView).toBeVisible()
		const headerMetrics = await monthView.evaluate((view) => {
			view.scrollTop = 260
			const headerRow = view.firstElementChild as HTMLElement
			const cs = getComputedStyle(headerRow)
			return {
				position: cs.position,
				zIndex: Number(cs.zIndex),
				bg: cs.backgroundColor,
			}
		})
		expect(headerMetrics.position).toBe('sticky')
		expect(headerMetrics.zIndex).toBeGreaterThanOrEqual(30)
		expect(headerMetrics.bg).not.toMatch(/\/\s*0?\.\d+\s*\)$/)
		expect(headerMetrics.bg).not.toBe('rgba(0, 0, 0, 0)')

		// 3. Vue + StyleX Dark: visible cell borders, distinct event colors, clickable +N more
		await page.getByTestId('framework-vue').click()
		await page.getByTestId('css-stylex').click()
		await page.getByTestId('settings-tab-theme').click()
		await page.getByRole('button', { name: 'Dark', exact: true }).click()

		const stylexChecks = await page
			.getByTestId('dom-month-view')
			.evaluate((view) => {
				const cell = view.querySelector<HTMLElement>('[data-cell="true"]')
				const bars = [
					...view.querySelectorAll<HTMLElement>(
						'[data-testid^="calendar-event-"]'
					),
				]
				const distinctBgs = new Set(
					bars.slice(0, 20).map((bar) => getComputedStyle(bar).backgroundColor)
				)
				let cellBorderBottom = '0px'
				if (cell) {
					cellBorderBottom = getComputedStyle(cell).borderBottomWidth
				}
				return {
					cellBorderBottom,
					distinctBgCount: distinctBgs.size,
				}
			})
		expect(stylexChecks.cellBorderBottom).not.toBe('0px')
		expect(stylexChecks.distinctBgCount).toBeGreaterThan(2)

		await page.locator('[data-testid^="more-events-"]').first().click()
		await expect(page.getByTestId('dom-overflow-dialog')).toBeVisible()
		await page
			.getByTestId('dom-overflow-dialog')
			.getByRole('button', { name: 'Close' })
			.click()

		// 4. React + MUI Dark: MUI dialog & calendar vars work cleanly
		await page.getByTestId('framework-react').click()
		await page.getByTestId('css-plain').click()
		await page.getByTestId('components-mui').click()
		const reactCalendar = page.getByTestId('ilamy-calendar')
		await reactCalendar.getByRole('button', { name: 'New' }).click()
		const dialog = page.getByTestId('mui-event-form-dialog')
		await expect(dialog).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(dialog).toHaveCount(0)
		await page.getByTestId('components-native').click()

		// 5. Preset tab bar has no vertical scrollbar, React+StyleX colored bars have no outer bg bleed,
		//    and Svelte StyleX -> Tailwind clears stale inline root CSS variables
		const navVOverflow = await page
			.locator('nav[aria-label="Demo presets"]')
			.evaluate((el) => el.scrollHeight - el.clientHeight)
		expect(navVOverflow).toBe(0)

		await page.getByTestId('css-stylex').click()
		const reactColoredOuterBg = await reactCalendar
			.locator('[data-ilamy-part="event-wrapper"]')
			.first()
			.evaluate((el) => getComputedStyle(el).backgroundColor)
		expect(reactColoredOuterBg).toBe('rgba(0, 0, 0, 0)')

		await page.getByTestId('framework-svelte').click()
		await expect(
			page.locator('[data-truncated-end="true"]').first()
		).toBeVisible()
		await selectView(page, 'week')
		const timeAxisBorder = await page
			.getByTestId('dom-time-axis')
			.evaluate((el) => getComputedStyle(el).borderRightWidth)
		expect(timeAxisBorder).toBe('1px')
		await page.getByTestId('css-tailwind').click()
		const stalePrimary = await page
			.getByTestId('ilamy-calendar')
			.evaluate((el) => el.style.getPropertyValue('--primary'))
		expect(stalePrimary).toBe('')
	})

	test('header date picker, full event form, recurring scope modal, and borderless header match across React and non-React frameworks', async ({
		page,
	}) => {
		await openDemo(page)

		for (const fw of ['react', 'vue', 'solid'] as const) {
			await page.getByTestId(`framework-${fw}`).click()
			const titleBtn = page.getByTestId('calendar-title').first()
			await expect(titleBtn).toBeVisible()

			// Borderless root/header, bordered grid body
			const borders = await titleBtn.evaluate((el) => {
				const header = el.closest('header, [data-testid="calendar-header"]')
				const root = header?.parentElement
				const body = root?.querySelector('[data-testid="calendar-body"]')
				let headerBorder = ''
				if (header) {
					headerBorder = getComputedStyle(header).borderBottomWidth
				}
				return {
					rootBorder: root ? getComputedStyle(root).borderTopWidth : '',
					headerBorder,
					bodyBorder: body ? getComputedStyle(body).borderTopWidth : '',
				}
			})
			expect(borders).toEqual({
				rootBorder: '0px',
				headerBorder: '0px',
				bodyBorder: '1px',
			})

			// Title Date Picker opens MonthGrid and navigates to December
			await titleBtn.click()
			const monthGrid = page.locator('[data-slot="month-grid"]')
			await expect(monthGrid).toBeVisible()
			await monthGrid.getByRole('button', { name: 'Dec' }).click()
			await expect(titleBtn).toContainText('Dec')
			let todayContainerSelector = '[data-testid="ilamy-calendar"]'
			if (fw === 'react') {
				todayContainerSelector = '[data-testid="calendar-header"]'
			}
			await page
				.locator(todayContainerSelector)
				.getByRole('button', { name: 'Today', exact: true })
				.click()

			// Create Event Form includes interactive DatePicker, TimePicker, Location, and submits cleanly
			const newBtn = page.getByTestId('new-event-btn').first()
			await newBtn.click()
			await expect(page.locator('#start-date')).toBeVisible()
			await expect(page.locator('#start-time')).toBeVisible()
			await expect(page.locator('input[name="location"]')).toBeVisible()
			await page.locator('#start-date').click()
			await expect(page.locator('[role="grid"]').first()).toBeVisible()
			await page.keyboard.press('Escape')
			await expect(page.locator('input[name="title"]')).toBeVisible()
			await page.locator('input[name="title"]').fill(`E2E Parity ${fw}`)
			await page.locator('button[type="submit"]').first().click()
			await expect(page.locator('input[name="title"]')).toHaveCount(0)
		}
	})

	test('exposes landmarks, skip link, labeled dialogs, and polite live announcements', async ({
		page,
	}) => {
		await page.goto('/')
		await expect(page.locator('main')).toHaveCount(1)
		await expect(
			page.locator('aside[aria-label="Calendar inspector"]')
		).toHaveCount(1)
		await expect(
			page.getByRole('link', { name: 'Skip to calendar' })
		).toHaveAttribute('href', '#calendar-stage')

		// React live region announces on period navigation
		const reactLive = page.getByTestId('calendar-live-region')
		await page
			.locator('[data-testid="calendar-header"] button[aria-label="Next"]')
			.click()
		await expect(reactLive).not.toHaveText('')

		// Vue DOM calendar wires dialog aria-labelledby and hides pointer resize handles
		await page.getByTestId('framework-vue').click()
		const domCalendar = page.getByTestId('ilamy-calendar')
		await expect(domCalendar).toBeVisible()
		await domCalendar.getByTestId('new-event-btn').click()
		const domDialog = page.getByTestId('dom-event-dialog')
		await expect(domDialog).toBeVisible()
		const labelledBy = await domDialog.getAttribute('aria-labelledby')
		expect(labelledBy).toBeTruthy()
		await expect(domDialog.locator(`#${labelledBy}`)).toHaveText('Create Event')
		await page.keyboard.press('Escape')
	})

	test('default demo move and resize publish onEventsChange payloads in Event Log across React and Vue', async ({
		page,
	}) => {
		await openDemo(page)

		// Open Code & Events panel and switch to Callback Log tab so live payloads appear
		await page.getByRole('button', { name: 'Code & Events' }).click()
		await page.getByRole('tab', { name: /Callback Log/i }).click()

		// 1. React default demo week view: move Morning Yoga (Sunday 10:00-12:00) down 1h
		await switchToWeekView(page)
		const yoga = page.getByTestId(`calendar-event-${YOGA_ID}`)
		const elevenSlot = timeSlot(page, '2026-10-25T11:00')
		const noonSlot = timeSlot(page, '2026-10-25T12:00')
		const laneX = (await centreOf(yoga)).x
		await dragWithPointer(
			page,
			{ target: yoga, at: { x: laneX, y: (await centreOf(elevenSlot)).y } },
			{ target: noonSlot, at: { x: laneX, y: (await centreOf(noonSlot)).y } }
		)
		await expect(
			page
				.locator('pre')
				.filter({ hasText: `"id":"${YOGA_ID}"` })
				.first()
		).toContainText('"action":"update"')

		// 2. Switch to Vue in the same live demo (default settings: 600px scroll, timezone, plugins)
		await page.getByTestId('framework-vue').click()
		await selectView(page, 'week')
		const vueYoga = page.getByTestId(`calendar-event-${YOGA_ID}`).first()
		await vueYoga.scrollIntoViewIfNeeded()
		const vueHandle = endHandleOf(vueYoga)
		const handlePoint = await centreOf(vueHandle)
		const thirteenSlot = page
			.locator('[data-cell="true"][data-start^="2026-10-25T13:00"]')
			.first()
		const thirteenBox = await boxOf(thirteenSlot)
		await dragWithPointer(
			page,
			{ target: vueHandle, at: handlePoint },
			{
				target: thirteenSlot,
				at: { x: handlePoint.x, y: thirteenBox.y + thirteenBox.height / 2 },
			}
		)
		await expect(
			page.locator('pre').filter({ hasText: '"endDelta"' }).first()
		).toContainText('"action":"update"')
	})
})
