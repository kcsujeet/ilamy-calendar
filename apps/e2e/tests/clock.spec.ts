import { expect, test } from '@playwright/test'
import { gotoScenario, PINNED_NOW } from './support/harness'

/*
 * A calendar renders almost everything from "today", so a suite that lets the
 * real clock through asserts something different every day: today's highlight
 * moves, month padding changes at a month boundary, and every screenshot
 * baseline rots within 24 hours. These tests exist to prove the pinning works
 * before anything is built on top of it.
 */
test.describe('determinism', () => {
	test('the page clock reports the pinned instant, not the real one', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })

		const now = await page.evaluate(() => new Date().toISOString())

		expect(now).toBe(PINNED_NOW)
	})

	test('today is the pinned day, wherever the suite runs', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })

		// The harness pins 12 March 2025, so that cell is today and no other.
		const today = page.getByTestId('day-number-today')

		await expect(today).toHaveCount(1)
		await expect(today).toHaveText('12')
	})

	test('the month grid renders the days the pinned date implies', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })

		// March 2025 with a Sunday start: the grid opens on 23 February and runs
		// to 5 April, six rows of seven.
		const cells = page.locator('[data-testid^="day-cell-"]')

		await expect(cells).toHaveCount(42)
		await expect(cells.first()).toHaveAttribute('data-start', /2025-02-23/)
		await expect(cells.last()).toHaveAttribute('data-start', /2025-04-05/)
	})
})

/*
 * A typo in a scenario name must not look like a passing test of the wrong
 * screen. The harness renders the mistake instead of falling back to a default,
 * because a silent fallback is how a suite ends up green while testing nothing
 * anyone asked for.
 */
test.describe('harness contract', () => {
	test('refuses an unknown scenario instead of guessing', async ({ page }) => {
		await page.goto('/?scenario=does-not-exist&view=month')

		await expect(page.getByTestId('harness-error')).toHaveText(
			/Unknown scenario: does-not-exist/
		)
		await expect(page.getByTestId('ilamy-calendar')).toHaveCount(0)
	})

	test('refuses an unknown view instead of guessing', async ({ page }) => {
		await page.goto('/?scenario=basic&view=fortnight')

		await expect(page.getByTestId('harness-error')).toHaveText(
			/Unknown view: fortnight/
		)
	})
})
