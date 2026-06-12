import { expect } from 'bun:test'
import type { BusinessHours, Resource } from '@ilamy/types'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'

/**
 * Shared fixtures for the resource/business-hours test suites. Test files
 * import construction from here; each suite keeps its own assertions.
 */

/** Monday-to-Friday business hours over the given hour range. */
export const weekdayBusinessHours = (
	startTime: number,
	endTime: number
): BusinessHours => ({
	daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
	startTime,
	endTime,
})

/** A single plain resource. */
export const singleResource: Resource[] = [{ id: '1', title: 'Resource 1' }]

/** Two plain resources, as rendered by the resource week-view suites. */
export const twoResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

/** Empty event list shared by the resource week-view render helpers. */
export const noEvents: CalendarEvent[] = []

/** Wednesday, Jan 1 2025 — the anchor date of the resource week-view suites. */
export const resourceWeekInitialDate = dayjs('2025-01-01T00:00:00.000Z')

// ---------------------------------------------------------------------------
// Shared assertion helpers — dedupe the business-hours test clone groups.
// ---------------------------------------------------------------------------

/**
 * Assert that a vertical day-view shows only the given business hour range.
 * Used by both the regular and resource "weekend fallback" business-hours tests.
 */
export function assertVerticalBusinessHourRange(
	screen: {
		getByTestId: (id: string) => unknown
		queryByTestId: (id: string) => unknown
	},
	firstVisible: number,
	lastVisible: number,
	firstHidden: number,
	lastHidden: number
): void {
	const padded = (n: number) => String(n).padStart(2, '0')
	expect(
		screen.getByTestId(`vertical-time-${padded(firstVisible)}`)
	).toBeInTheDocument()
	expect(
		screen.getByTestId(`vertical-time-${padded(lastVisible)}`)
	).toBeInTheDocument()
	expect(
		screen.queryByTestId(`vertical-time-${padded(firstHidden)}`)
	).not.toBeInTheDocument()
	expect(
		screen.queryByTestId(`vertical-time-${padded(lastHidden)}`)
	).not.toBeInTheDocument()
}

/**
 * Assert that a resource-week horizontal view shows only the given business
 * hour range. Used by the resource-business-hours and resource-week-horizontal
 * test suites.
 */
export function assertResourceWeekBusinessHourRange(
	screen: {
		getAllByTestId: (id: string) => unknown[]
		queryAllByTestId: (id: string) => unknown[]
	},
	firstVisible: number,
	lastVisible: number,
	firstHidden: number,
	lastHidden: number
): void {
	const padded = (n: number) => String(n).padStart(2, '0')
	expect(
		screen.getAllByTestId(`resource-week-time-label-${padded(firstVisible)}`)
			.length
	).toBeGreaterThan(0)
	expect(
		screen.getAllByTestId(`resource-week-time-label-${padded(lastVisible)}`)
			.length
	).toBeGreaterThan(0)
	expect(
		screen.queryAllByTestId(`resource-week-time-label-${padded(firstHidden)}`)
			.length
	).toBe(0)
	expect(
		screen.queryAllByTestId(`resource-week-time-label-${padded(lastHidden)}`)
			.length
	).toBe(0)
}
