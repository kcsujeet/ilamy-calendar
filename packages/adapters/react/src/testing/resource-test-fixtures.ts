import { expect } from 'bun:test'
import type { BusinessHours, CalendarEvent, Resource } from '@ilamy/types'

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
export const resourceWeekInitialDate = '2025-01-01T00:00:00.000Z'

const paddedHour = (n: number): string => String(n).padStart(2, '0')

function assertHourRange(
	expectVisible: (hour: string) => void,
	expectHidden: (hour: string) => void,
	firstVisible: number,
	lastVisible: number,
	firstHidden: number,
	lastHidden: number
): void {
	expectVisible(paddedHour(firstVisible))
	expectVisible(paddedHour(lastVisible))
	expectHidden(paddedHour(firstHidden))
	expectHidden(paddedHour(lastHidden))
}

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
	assertHourRange(
		(hour) =>
			expect(screen.getByTestId(`vertical-time-${hour}`)).toBeInTheDocument(),
		(hour) =>
			expect(
				screen.queryByTestId(`vertical-time-${hour}`)
			).not.toBeInTheDocument(),
		firstVisible,
		lastVisible,
		firstHidden,
		lastHidden
	)
}

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
	assertHourRange(
		(hour) =>
			expect(
				screen.getAllByTestId(`resource-week-time-label-${hour}`).length
			).toBeGreaterThan(0),
		(hour) =>
			expect(
				screen.queryAllByTestId(`resource-week-time-label-${hour}`).length
			).toBe(0),
		firstVisible,
		lastVisible,
		firstHidden,
		lastHidden
	)
}
