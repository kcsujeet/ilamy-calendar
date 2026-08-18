import type { DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import type { DragSnapInterval } from '@/features/calendar/types'

interface DropCellData {
	type?: string
	date?: string
	hour?: number
	minute?: number
	resourceId?: string | number
	allDay?: boolean
}

interface DragResolutionOptions {
	/** Unsnapped event-leading-edge time resolved from destination geometry. */
	rawStart?: Dayjs
	/** Clock interval used for timed destinations. */
	snapInterval?: DragSnapInterval
	/** Resource resolved from destination geometry, including an unassigned lane. */
	resourceId?: string | number
}

export const getUpdatedEvent = (
	event: Pick<DragEndEvent, 'active' | 'over'>,
	activeEvent: CalendarEvent | null,
	options: DragResolutionOptions = {}
) => {
	const { active, over } = event

	if (!active || !activeEvent || (!over && !options.rawStart)) {
		return null
	}

	const data = (over?.data.current || {}) as DropCellData
	const isTimeCell = Boolean(options.rawStart) || data.type === 'time-cell'
	const resourceId =
		'resourceId' in options ? options.resourceId : data.resourceId
	const { allDay } = data
	let newStart: Dayjs

	if (isTimeCell) {
		const { date, hour = 0, minute = 0 } = data
		const rawStart = options.rawStart ?? dayjs(date).hour(hour).minute(minute)
		const snapInterval = options.snapInterval ?? 60
		const rawClockMinutes =
			rawStart.hour() * 60 +
			rawStart.minute() +
			rawStart.second() / 60 +
			rawStart.millisecond() / 60_000
		const snappedClockMinutes =
			Math.floor(rawClockMinutes / snapInterval + 0.5) * snapInterval
		const dayOffset = Math.floor(snappedClockMinutes / (24 * 60))
		const minutesOnDay = snappedClockMinutes - dayOffset * 24 * 60
		const snappedHour = Math.floor(minutesOnDay / 60)
		const snappedMinute = minutesOnDay % 60

		newStart = rawStart
			.startOf('day')
			.add(dayOffset, 'day')
			.hour(snappedHour)
			.minute(snappedMinute)
			.second(0)
			.millisecond(0)
	} else {
		const { date } = data

		newStart = dayjs(date)
	}

	const eventDuration = activeEvent.end.diff(activeEvent.start, 'millisecond')

	// Create new end time by adding the original duration. An end landing on
	// midnight is kept: `end` is exclusive (#248), so it is a legitimate end and
	// the layout paints it on the day it actually covers. Snapping it back to the
	// previous 23:59:59.999, as this used to, resized the event on every drag.
	const newEnd = newStart.add(eventDuration, 'millisecond')

	// Update the event with new times and resource if changed
	const updates = {
		start: newStart,
		end: newEnd,
		resourceId,
		allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
	}
	return { activeEvent, updates }
}
