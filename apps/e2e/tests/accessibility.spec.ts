import { expect, type Page, test } from '@playwright/test'
import { gotoScenario } from './support/harness'
import { MonthGrid } from './support/pages'

/**
 * Keyboard and screen-reader behaviour of the event bars and the event form.
 * WCAG 2.2: 2.1.1 Keyboard, 4.1.2 Name/Role/Value, 1.3.1 Info and
 * Relationships, 3.3.2 Labels or Instructions. Asserted as role and accessible
 * name, which is what an assistive technology reads, not with an axe scan:
 * axe is not a dependency of this repo.
 */

const openWeek = async (page: Page, plugins?: string[]) => {
	await gotoScenario(page, {
		scenario: 'basic',
		view: 'week',
		plugins,
		settings: { scrollTime: '09:00' },
	})
}

/** Tabs until the focused element's text contains `title`. */
const tabToEvent = async (page: Page, title: string) => {
	const maxTabs = 30
	for (let tabs = 0; tabs < maxTabs; tabs += 1) {
		await page.keyboard.press('Tab')
		const focusedText = await page.evaluate(
			() => document.activeElement?.textContent ?? ''
		)
		if (focusedText.includes(title)) {
			return
		}
	}
	throw new Error(`could not tab to ${title}`)
}

test.describe('event bars', () => {
	for (const [name, key] of [
		['Enter', 'Enter'],
		['Space', 'Space'],
	]) {
		test(`${name} on a focused event opens it`, async ({ page }) => {
			await openWeek(page)
			await tabToEvent(page, 'Morning stand-up')

			await page.keyboard.press(key)

			await expect(page.getByRole('dialog')).toHaveCount(1)
		})
	}

	test('an event that cannot move is still reachable and opens from the keyboard', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '09:00', editable: 'false' },
		})
		await tabToEvent(page, 'Morning stand-up')

		await page.keyboard.press('Enter')

		await expect(page.getByRole('dialog')).toHaveCount(1)
	})

	test('no bar promises a keyboard drag the calendar does not offer', async ({
		page,
	}) => {
		await openWeek(page)
		const bar = page.getByTestId('vertical-event-basic-1').getByRole('button')
		const descriptionId = await bar.getAttribute('aria-describedby')

		const description = await page.evaluate(
			(id) => (id ? document.getElementById(id)?.textContent : ''),
			descriptionId
		)

		expect(description?.trim()).toBe('')
	})

	test('a mouse drag announces nothing to a screen reader', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)
		const from = month.event('Earlier in the month').first()
		const source = await from.boundingBox()
		const target = await month.cellOn('2025-03-06').boundingBox()
		if (!(source && target)) {
			throw new Error('drag needs both elements laid out')
		}
		await page.mouse.move(source.x + 10, source.y + source.height / 2)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				source.x + 10 + ((target.x - source.x) * step) / 8,
				source.y + source.height / 2 + ((target.y - source.y) * step) / 8
			)
		}
		await page.mouse.up()

		const liveRegionText = await page
			.locator('[aria-live="assertive"]')
			.allTextContents()

		expect(liveRegionText.join('').trim()).toBe('')
	})
})

test.describe('event form', () => {
	const openForm = async (page: Page, plugins?: string[]) => {
		await openWeek(page, plugins)
		await page.getByRole('button', { name: 'New' }).click()
		return page.getByRole('dialog')
	}

	test('each date and time picker is named by its label', async ({ page }) => {
		const dialog = await openForm(page)

		await expect(
			dialog.getByRole('button', { name: /^Start Date/ })
		).toHaveCount(1)
		await expect(dialog.getByRole('button', { name: /^End Date/ })).toHaveCount(
			1
		)
		await expect(
			dialog.getByRole('combobox', { name: /^Start Time/ })
		).toHaveCount(1)
		await expect(
			dialog.getByRole('combobox', { name: /^End Time/ })
		).toHaveCount(1)
	})

	test('the Repeat checkbox is named by its label', async ({ page }) => {
		const dialog = await openForm(page, ['recurrence'])

		await expect(dialog.getByRole('checkbox', { name: 'Repeat' })).toHaveCount(
			1
		)
	})

	test('a time picker points aria-controls only at an element that exists', async ({
		page,
	}) => {
		const dialog = await openForm(page)
		const startTime = dialog.getByTestId('time-picker-start-time')

		const controlsWhileClosed = await startTime.getAttribute('aria-controls')

		const pointsAtNothing =
			controlsWhileClosed !== null &&
			(await page.locator(`[id="${controlsWhileClosed}"]`).count()) === 0
		expect(pointsAtNothing).toBe(false)
	})

	test('the date picker names its month navigation', async ({ page }) => {
		const dialog = await openForm(page)
		await dialog.getByRole('button', { name: /^Start Date/ }).click()

		await expect(
			page.getByRole('button', { name: 'Previous month' })
		).toHaveCount(1)
		await expect(page.getByRole('button', { name: 'Next month' })).toHaveCount(
			1
		)
	})
})
