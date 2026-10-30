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
const switchToWeekView = async (page: Page) => {
	const calendar = page.getByTestId('ilamy-calendar')
	await calendar.getByRole('button', { name: 'Month', exact: true }).click()
	await page.getByRole('menuitem', { name: 'Week' }).click()
	await settleCalendarAnimations(page)
}

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
	page.locator(`[data-testid^="vertical-cell-"][data-start^="${startISO}"]`)

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
		const yoga = page.getByTestId(`vertical-event-${YOGA_ID}`)
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
		const conference = page.getByTestId(`horizontal-event-${CONFERENCE_ID}`)
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
		const yoga = page.getByTestId(`vertical-event-${YOGA_ID}`)
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
})
