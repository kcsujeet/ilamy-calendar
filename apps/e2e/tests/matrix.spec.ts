import { expect, test } from '@playwright/test'
import { gotoScenario, type ViewName } from './support/harness'
import { CalendarPage, ResourceAxis } from './support/pages'

/**
 * Axis 1 of the coverage matrix: every rendering surface reaches the screen.
 *
 * These are separate layout engines rather than variations of one, and each can
 * break alone. Testing any of them deeply before knowing they all render would
 * mean depth on a few surfaces and nothing at all on the rest — which is how
 * the first draft of this suite ended up covering only the month view.
 */

interface Surface {
	view: ViewName
	orientation?: 'vertical' | 'horizontal'
	plugins?: readonly string[]
}

const REGULAR_SURFACES: readonly Surface[] = [
	{ view: 'day' },
	{ view: 'week' },
	{ view: 'month' },
	{ view: 'year' },
	{ view: 'agenda', plugins: ['agenda'] },
]

const RESOURCE_SURFACES: readonly Surface[] = (
	['day', 'week', 'month'] as const
).flatMap((view) => [
	{ view, orientation: 'vertical' as const },
	{ view, orientation: 'horizontal' as const },
])

const label = (surface: Surface) =>
	surface.orientation
		? `${surface.view} (${surface.orientation})`
		: surface.view

test.describe('every regular surface renders', () => {
	for (const surface of REGULAR_SURFACES) {
		test(label(surface), async ({ page }) => {
			await gotoScenario(page, {
				scenario: 'basic',
				view: surface.view,
				plugins: surface.plugins,
			})

			await new CalendarPage(page).expectRendered()
		})
	}
})

test.describe('every resource surface renders', () => {
	for (const surface of RESOURCE_SURFACES) {
		test(label(surface), async ({ page }) => {
			await gotoScenario(page, {
				scenario: 'resources',
				view: surface.view,
				orientation: surface.orientation,
			})

			const axis = new ResourceAxis(page)
			await axis.expectRendered()

			// The point of a resource surface is the axis. A calendar that renders
			// without one has quietly ignored `resources` — which is exactly what
			// the harness did before it passed the prop at all.
			await expect(axis.resource('Room A').first()).toBeVisible()
			await expect(axis.resource('Room C').first()).toBeVisible()
		})
	}
})

/*
 * `year.tsx` has no `orientation` branch, so year has no resource form. This
 * asserts the absence rather than leaving a hole in the table: if year ever
 * grows one, this test fails and the matrix above gets a new row.
 */
test('year has no resource form', async ({ page }) => {
	await gotoScenario(page, {
		scenario: 'resources',
		view: 'month',
		orientation: 'vertical',
	})

	await expect(page.getByRole('button', { name: 'Year' })).toHaveCount(0)
})
