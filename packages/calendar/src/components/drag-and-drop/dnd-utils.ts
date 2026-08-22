import type { DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'

interface DropCellData {
	type?: string
	date?: string
	hour?: number
	minute?: number
	resourceId?: string
	allDay?: boolean
}

export const getUpdatedEvent = (
	event: DragEndEvent,
	activeEvent: CalendarEvent | null,
	slotDuration: number
) => {
	const { active, over } = event

	if (!active || !over || !activeEvent) {
		return null
	}

	const data = (over.data.current || {}) as DropCellData
	const isTimeCell = data.type === 'time-cell'
	const { resourceId, allDay } = data
	let newStart: Dayjs

	if (isTimeCell) {
		const { date, hour = 0, minute = 0 } = data

		// Create new start time based on the drop target
		newStart = dayjs(date).hour(hour).minute(minute)
	} else {
		const { date } = data

		newStart = dayjs(date)
	}

	const isTimedGridCell = isTimeCell || data.hour !== undefined
	const translatedRect = active.rect?.current.translated
	const dropTargetRect = over.rect
	if (
		isTimedGridCell &&
		!activeEvent.allDay &&
		translatedRect &&
		dropTargetRect?.height
	) {
		const slotOffset = Math.round(
			(translatedRect.top - dropTargetRect.top) / dropTargetRect.height
		)
		newStart = newStart.add(slotOffset * slotDuration, 'minute')
	}

	const eventDuration = activeEvent.end.diff(activeEvent.start, 'second')

	// Create new end time by adding the original duration. An end landing on
	// midnight is kept: `end` is exclusive (#248), so it is a legitimate end and
	// the layout paints it on the day it actually covers. Snapping it back to the
	// previous 23:59:59.999, as this used to, resized the event on every drag.
	const newEnd = newStart.add(eventDuration, 'second')

	// Update the event with new times and resource if changed
	const updates = {
		start: newStart,
		end: newEnd,
		resourceId,
		allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
	}
	return { activeEvent, updates }
}
