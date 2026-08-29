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

type ResourceId = string | number

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
	activeEvent: CalendarEvent | null
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

	const eventDuration = activeEvent.end.diff(activeEvent.start, 'second')

	// Create new end time by adding the original duration. An end landing on
	// midnight is kept: `end` is exclusive (#248), so it is a legitimate end and
	// the layout paints it on the day it actually covers. Snapping it back to the
	// previous 23:59:59.999, as this used to, resized the event on every drag.
	const newEnd = newStart.add(eventDuration, 'second')

	const sourceResourceId = (
		active.data.current as { sourceResourceId?: ResourceId } | undefined
	)?.sourceResourceId

	// Update the event with new times and resource if changed
	const updates = {
		start: newStart,
		end: newEnd,
		...getResourceUpdates(activeEvent, sourceResourceId, resourceId),
		allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
	}
	return { activeEvent, updates }
}
