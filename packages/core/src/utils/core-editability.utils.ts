import type { CalendarEditFlags, CalendarEvent } from '../core-calendar.types'

type EventEditFlags = Pick<
	CalendarEvent,
	'editable' | 'startEditable' | 'durationEditable'
>

/**
 * Resolves whether an event can be moved or resized, matching FullCalendar
 * (`component-util/event-ui.ts:61-94`, v7.1.1):
 * - Calendar `editable` defaults to `false` (D8).
 * - Within a level, the specific flag (`startEditable`/`durationEditable`)
 *   beats `editable`.
 * - Per-event flags beat calendar-level flags.
 */
const resolveEditable = (
	eventEditable: boolean | undefined,
	eventSpecific: boolean | undefined,
	calendar: CalendarEditFlags,
	calendarSpecific: boolean | undefined
): boolean => {
	const isEditableByCalendar = calendar.editable ?? false
	const isAllowedByCalendar = calendarSpecific ?? isEditableByCalendar
	const isAllowedByEvent = eventSpecific ?? eventEditable
	return isAllowedByEvent ?? isAllowedByCalendar
}

/** Whether an event can be moved. */
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

/** Whether an event can be resized by its edges. */
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
