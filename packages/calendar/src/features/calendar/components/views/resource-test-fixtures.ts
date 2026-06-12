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
