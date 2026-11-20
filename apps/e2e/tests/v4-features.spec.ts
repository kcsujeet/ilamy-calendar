import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	settleAnimations,
} from './support/harness'
import { MonthGrid, TimeGrid } from './support/pages'

const centreOf = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const dragWithPointer = async (page: Page, from: Locator, to: Locator) => {
	const start = await centreOf(from)
	const end = await centreOf(to)
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	for (let step = 1; step <= 8; step += 1) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * step) / 8,
			start.y + ((end.y - start.y) * step) / 8
		)
	}
	await releasePointer(page)
}

test.describe('v4.0 multi-zone isolation (4.0.1)', () => {
	test('renders America/New_York and Asia/Tokyo calendars side-by-side with zero cross-talk', async ({
		page,
	}) => {
		const now = new Date('2025-03-12T09:00:00.000Z')
		await page.clock.install({ time: now })
		await page.clock.setFixedTime(now)
		await page.goto(
			'/?scenario=basic&view=day&date=2025-03-12T09:00:00.000Z&multiZone=true'
		)
		await page.getByTestId('multi-zone-harness').waitFor()

		// 2025-03-12T09:30:00Z is 5:30 AM EDT (-04:00) in New York and 6:30 PM JST (+09:00) in Tokyo.
		const nyBar = page
			.getByTestId('zone-ny')
			.getByTestId('vertical-event-basic-1')
		const tokyoBar = page
			.getByTestId('zone-tokyo')
			.getByTestId('vertical-event-basic-1')

		await expect(nyBar).toContainText(/5:30/)
		await expect(nyBar).toContainText(/AM/)
		await expect(tokyoBar).toContainText(/6:30/)
		await expect(tokyoBar).toContainText(/PM/)
	})
})

test.describe('v4.0 visible 3-dot resize handles (4.0.9)', () => {
	test('handle is invisible at rest, revealed on bar hover, full opacity on handle hover, and resizes via real pointer', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { editable: 'true', scrollTime: '08:00' },
		})
		await settleAnimations(page)

		const grid = new TimeGrid(page)
		const bar = grid.bars('basic-2').first()
		const handle = bar.locator('[data-resize-handle="end"]')

		// At rest: opacity is 0
		await expect(handle).toHaveCSS('opacity', '0')

		// Hover bar centre: opacity rises via group-hover/event
		const barCentre = await centreOf(bar)
		await page.mouse.move(barCentre.x, barCentre.y)
		await expect
			.poll(async () =>
				Number(await handle.evaluate((el) => getComputedStyle(el).opacity))
			)
			.toBeGreaterThan(0.4)

		// Hover handle directly: opacity reaches 1
		const handleCentre = await centreOf(handle)
		await page.mouse.move(handleCentre.x, handleCentre.y)
		await expect
			.poll(async () =>
				Number(await handle.evaluate((el) => getComputedStyle(el).opacity))
			)
			.toBeCloseTo(1, 1)

		// Real-pointer drag resize extends Design review (14:00-15:30) through 16:00-17:00
		await dragWithPointer(page, handle, grid.slotAt('2025-03-12T16:00'))
		await expect
			.poll(async () => (await grid.eventNamed('Design review')).end)
			.toBe('2025-03-12T17:00:00.000Z')
	})
})

test.describe('v4.0 businessHours shade-only vs constraints (4.0.5)', () => {
	test('businessHours without eventConstraint shades Saturday but still allows drops', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { editable: 'true', businessHours: '9-17' },
		})
		await settleAnimations(page)
		const month = new MonthGrid(page)
		const saturday = month.cellOn('2025-03-08')

		await expect(saturday).toHaveAttribute('data-non-business', 'true')
		await expect(saturday).toHaveAttribute('data-disabled', 'false')

		await dragWithPointer(
			page,
			month.event('Earlier in the month').first(),
			saturday
		)
		await expect
			.poll(async () => (await month.eventNamed('Earlier in the month')).start)
			.toMatch(/^2025-03-08/)
	})

	test('businessHours with eventConstraint=businessHours refuses drops onto Saturday', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: {
				editable: 'true',
				businessHours: '9-17',
				eventConstraint: 'businessHours',
			},
		})
		await settleAnimations(page)
		const month = new MonthGrid(page)
		const saturday = month.cellOn('2025-03-08')

		await dragWithPointer(
			page,
			month.event('Earlier in the month').first(),
			saturday
		)
		expect((await month.eventNamed('Earlier in the month')).start).toMatch(
			/^2025-03-04/
		)
		expect(await month.eventChanges()).toEqual([])
	})

	test('selectConstraint=businessHours refuses drag-to-create outside business hours', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			plugins: ['drag-to-create'],
			settings: {
				businessHours: '9-17',
				selectConstraint: 'businessHours',
				scrollTime: '00:00',
			},
		})
		await settleAnimations(page)
		const grid = new TimeGrid(page)

		// Drag across 06:00-08:00 (outside 9-17) -> no dialog opens
		await dragWithPointer(
			page,
			grid.slotAt('2025-03-13T06:00'),
			grid.slotAt('2025-03-13T08:00')
		)
		await expect(page.getByRole('dialog')).toHaveCount(0)

		// Drag across 10:00-12:00 (inside 9-17) -> create dialog opens
		await dragWithPointer(
			page,
			grid.slotAt('2025-03-13T10:00'),
			grid.slotAt('2025-03-13T12:00')
		)
		await expect(page.getByRole('dialog')).toHaveCount(1)
	})
})

test.describe('v4.0 optional plugins and theming primitives (D5, D7)', () => {
	test('year view is only available when yearPlugin is provided', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		await expect(page.getByRole('radio', { name: 'Year' })).toHaveCount(0)

		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			plugins: ['year'],
		})
		await page.getByRole('radio', { name: 'Year' }).click()
		await expect(page.getByTestId('calendar-title')).toHaveText('2025')
	})

	test('unstyled + slotProps applies custom classes and strips default chrome', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { unstyled: 'true', themeVariant: 'slot-props' },
		})

		const root = page.getByTestId('ilamy-calendar')
		await expect(root).toHaveClass(/harness-custom-root/)
		await expect(root).not.toHaveClass(/bg-background/)
		await expect(page.locator('.harness-custom-header')).toHaveCount(1)
		expect(await page.locator('.harness-custom-cell').count()).toBeGreaterThan(
			20
		)
	})

	test('components prop swaps primitive Button and stays interactive', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { themeVariant: 'custom-button' },
		})

		expect(
			await page.locator('button[data-custom-button="true"]').count()
		).toBeGreaterThan(0)
		await page.getByLabel('Next').click()
		await expect(page.getByTestId('calendar-title')).toHaveText('Apr 2025')
	})
})
