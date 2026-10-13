import type { CalendarEvent } from '@ilamy/types'

export interface CalendarEditFlags {
	editable?: boolean
	eventStartEditable?: boolean
	eventDurationEditable?: boolean
	/**
	 * Deprecated alias of `editable={false}`. It only sets the `editable`
	 * default, so an explicit `eventStartEditable` still enables moving.
	 */
	disableDragAndDrop?: boolean
}

type EventEditFlags = Pick<
	CalendarEvent,
	'editable' | 'startEditable' | 'durationEditable'
>

/**
 * Whether an event can be edited in one way, resolved the way FullCalendar
 * does (v7.1.1 `component-util/event-ui.ts:61-94`): within a level the
 * specific flag beats `editable`, and the event beats the calendar.
 */
const resolveEditable = (
	eventEditable: boolean | undefined,
	eventSpecific: boolean | undefined,
	calendar: CalendarEditFlags,
	calendarSpecific: boolean | undefined
): boolean => {
	const isEditableByCalendar = calendar.editable ?? !calendar.disableDragAndDrop
	const isAllowedByCalendar = calendarSpecific ?? isEditableByCalendar
	const isAllowedByEvent = eventSpecific ?? eventEditable
	return isAllowedByEvent ?? isAllowedByCalendar
}

/**
 * Whether an event can be moved. Pass `{}` as the event to ask about the
 * calendar level alone.
 */
export const resolveStartEditable = (
	event: EventEditFlags,
	calendar: CalendarEditFlags
): boolean =>
	resolveEditable(
		event.editable,
		event.startEditable,
		calendar,
		calendar.eventStartEditable
	)

/** Whether an event can be resized, with the same precedence as moving. */
export const resolveDurationEditable = (
	event: EventEditFlags,
	calendar: CalendarEditFlags
): boolean =>
	resolveEditable(
		event.editable,
		event.durationEditable,
		calendar,
		calendar.eventDurationEditable
	)
