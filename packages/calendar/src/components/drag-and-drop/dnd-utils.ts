import type { DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { type GrabOffset, NO_GRAB_OFFSET } from '@/lib/utils/grab-offset'

export interface DropCellData {
	type?: string
	date?: string | Dayjs
	hour?: number
	minute?: number
	resourceId?: string | number
	allDay?: boolean
}

type ResourceId = string | number

/**
 * An hour grid publishes the slot's `hour` on every cell it registers; a day
 * grid (month, all-day band) leaves it undefined. That, not the `type` field,
 * is what separates "dropped on a time slot" from "dropped on a day" — every
 * cell reports `type: 'day-cell'` (`grid-cell.tsx`), so branching on the type
 * silently sent hour-grid drops down the day path and discarded the hour.
 */
const isTimeSlotDrop = (data: DropCellData): boolean => data.hour !== undefined

/**
 * Calculates candidate start, end, and allDay status when an event is dragged
 * over a cell, respecting the grab offset and preserving time of day when a
 * timed event moves between day cells (matching FullCalendar and Google
 * Calendar, which keep the clock and change only the date).
 */
export const calculateDropTimes = (
	activeEvent: CalendarEvent,
	data: DropCellData,
	grabOffset: GrabOffset = NO_GRAB_OFFSET
): { start: Dayjs; end: Dayjs; allDay: boolean } => {
	const { date, hour = 0, minute = 0, allDay } = data
	const eventDuration = activeEvent.end.diff(activeEvent.start, 'second')

	// An end landing on midnight is kept: `end` is exclusive (#248), so it is a
	// legitimate end and the layout paints it on the day it actually covers.
	// Snapping it back to the previous 23:59:59.999, as this used to, resized
	// the event on every drag.
	const withDuration = (start: Dayjs) => ({
		start,
		end: start.add(eventDuration, 'second'),
	})

	if (isTimeSlotDrop(data)) {
		const slotTime = dayjs(date).hour(hour).minute(minute)
		const grabbedSlot = slotTime.subtract(grabOffset.minutes, 'minute')
		return { ...withDuration(grabbedSlot), allDay: false }
	}

	const targetDate = dayjs(date).subtract(grabOffset.days, 'day')
	const droppedOnAllDayCell = allDay === true
	const cellTakesEitherKind = allDay === undefined
	const staysAllDay =
		droppedOnAllDayCell || (cellTakesEitherKind && Boolean(activeEvent.allDay))

	if (staysAllDay) {
		return { ...withDuration(targetDate.startOf('day')), allDay: true }
	}

	const keptTimeOfDay = targetDate
		.hour(activeEvent.start.hour())
		.minute(activeEvent.start.minute())
		.second(activeEvent.start.second())
		.millisecond(activeEvent.start.millisecond())
	return { ...withDuration(keptTimeOfDay), allDay: false }
}

/**
 * The resource-axis half of a drop, mirroring FullCalendar's resource mutation
 * (`premium/packages/preact-scheduler/src/resource/EventDragging.ts`): the row
 * the drag STARTED from is removed from the membership and the drop target
 * takes its place, deduped; an event that was not in the source row is left
 * untouched. Writing only `resourceId` moved nothing for a cross-resource
 * event, because `getEventResourceIds` ignores `resourceId` whenever
 * `resourceIds` is present.
 *
 * Single-resource events take the target even when the drag reports no source
 * row (dragging out of the "all events" dialog, which has no resource axis).
 */
const getResourceUpdates = (
	activeEvent: CalendarEvent,
	fromResourceId: ResourceId | undefined,
	toResourceId: ResourceId | undefined
): Partial<CalendarEvent> => {
	const droppedOutsideResourceAxis = toResourceId === undefined
	if (droppedOutsideResourceAxis || fromResourceId === toResourceId) {
		return {}
	}

	if (!activeEvent.resourceIds) {
		return { resourceId: toResourceId }
	}

	const sourceIndex = activeEvent.resourceIds.indexOf(
		fromResourceId as ResourceId
	)
	if (sourceIndex === -1) {
		return {}
	}

	const resourceIds = activeEvent.resourceIds.slice()
	resourceIds.splice(sourceIndex, 1)
	if (!resourceIds.includes(toResourceId)) {
		resourceIds.push(toResourceId)
	}
	return { resourceIds }
}

export const getUpdatedEvent = (
	event: DragEndEvent,
	activeEvent: CalendarEvent | null,
	grabOffset: GrabOffset = NO_GRAB_OFFSET
) => {
	const { active, over } = event

	if (!active || !over || !activeEvent) {
		return null
	}

	const data = (over.data.current || {}) as DropCellData
	const { resourceId } = data
	const { start, end, allDay } = calculateDropTimes(
		activeEvent,
		data,
		grabOffset
	)

	const sourceResourceId = (
		active.data.current as { sourceResourceId?: ResourceId } | undefined
	)?.sourceResourceId

	// Update the event with new times and resource if changed
	const updates = {
		start,
		end,
		...getResourceUpdates(activeEvent, sourceResourceId, resourceId),
		allDay,
	}
	return { activeEvent, updates }
}
