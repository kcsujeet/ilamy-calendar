import type { CalendarEvent } from '@ilamy/types'
import { add, endOf, now, startOf, toOffsetIso } from '@ilamy/utils/temporal'

export function generateMockEvents({ count = 5 } = {}): CalendarEvent[] {
	const weekStart = startOf(now(), 'week', 0)
	const events: CalendarEvent[] = []
	for (let i = 0; i < count; i++) {
		const day = add(weekStart, i, 'day')
		events.push({
			id: i.toString(),
			title: `Mock Event ${i + 1}`,
			start: toOffsetIso(startOf(day, 'day')),
			end: toOffsetIso(endOf(day, 'day')),
			color: 'bg-gray-100 text-gray-800',
		})
	}
	return events
}
