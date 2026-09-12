import { expect, test } from '@playwright/test'
import { gotoScenario, type ViewName } from './support/harness'
import { CalendarPage } from './support/pages'

/**
 * One baseline per rendering surface, on one fixture.
 *
 * Behaviour assertions cover everything else; a screenshot is only for what
 * behaviour cannot see — a layout that collapses, a colour that inverts, an
 * element that renders offscreen. Keeping it to one per surface is what stops
 * the diffs becoming a rubber stamp: every one of these is a file somebody has
 * to look at when it changes.
 *
 * `animations: 'disabled'` is load-bearing rather than tidiness. The headers
 * animate in over 500ms, and a screenshot taken mid-fade comes out washed out
 * and different every run.
 */

interface Surface {
	name: string
	view: ViewName
	orientation?: 'vertical' | 'horizontal'
	scenario?: string
	plugins?: readonly string[]
}

const SURFACES: readonly Surface[] = [
	{ name: 'day', view: 'day' },
	{ name: 'week', view: 'week' },
	{ name: 'month', view: 'month' },
	{ name: 'year', view: 'year' },
	{ name: 'agenda', view: 'agenda', plugins: ['agenda'] },
	{
		name: 'resource-day-vertical',
		view: 'day',
		orientation: 'vertical',
		scenario: 'resources',
	},
	{
		name: 'resource-day-horizontal',
		view: 'day',
		orientation: 'horizontal',
		scenario: 'resources',
	},
	{
		name: 'resource-week-vertical',
		view: 'week',
		orientation: 'vertical',
		scenario: 'resources',
	},
	{
		name: 'resource-week-horizontal',
		view: 'week',
		orientation: 'horizontal',
		scenario: 'resources',
	},
	{
		name: 'resource-month-vertical',
		view: 'month',
		orientation: 'vertical',
		scenario: 'resources',
	},
	{
		name: 'resource-month-horizontal',
		view: 'month',
		orientation: 'horizontal',
		scenario: 'resources',
	},
	// Not a surface, but the one layout that behaviour assertions describe
	// worst: an event cut into several bars across month rows.
	{ name: 'spanning-event-month', view: 'month', scenario: 'spanning-event' },
]

for (const surface of SURFACES) {
	test(surface.name, async ({ page }) => {
		await gotoScenario(page, {
			scenario: surface.scenario ?? 'basic',
			view: surface.view,
			orientation: surface.orientation,
			plugins: surface.plugins,
		})
		await new CalendarPage(page).expectRendered()

		await expect(page).toHaveScreenshot(`${surface.name}.png`, {
			animations: 'disabled',
			fullPage: false,
		})
	})
}
