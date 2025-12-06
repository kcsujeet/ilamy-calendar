import type { DragEndEvent } from '@dnd-kit/core'
import dayjs from '@/lib/configs/dayjs-config'
import type { CalendarEvent } from '../types'

export const getUpdatedEvent = (
	event: DragEndEvent,
	activeEvent: CalendarEvent | null
) => {
	const { active, over } = event

	if (!active || !over || !activeEvent) {
		return null
	}

	const isTimeCell = over.data.current?.type === 'time-cell'
	const { resourceId, allDay } = over.data.current || {}
	let newStart

	if (isTimeCell) {
		const { date, hour = 0, minute = 0 } = over.data.current

		// Create new start time based on the drop target
		newStart = dayjs(date).hour(hour).minute(minute)
	} else {
		const { date } = over.data.current

		newStart = dayjs(date)
	}

	const eventDuration = activeEvent.end.diff(activeEvent.start, 'second')

	// Create new end time by adding the original duration
	let newEnd = newStart.add(eventDuration, 'second')

	if (newEnd.isSame(newEnd.startOf('day'))) {
		// If the new end time is at midnight, set it to 24 hours of partial day
		newEnd = newEnd.subtract(1, 'day').endOf('day')
	}

	// Update the event with new times and resource if changed
	const updates = {
		start: newStart,
		end: newEnd,
		resourceId,
		allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
	}
	return { activeEvent, updates }
}
