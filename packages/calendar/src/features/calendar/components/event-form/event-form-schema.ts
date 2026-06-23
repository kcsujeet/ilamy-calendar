import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import * as v from 'valibot'
import { buildDateTime } from '@/features/calendar/utils/event-form-utils'

const DEFAULT_EVENT_COLOR = 'bg-blue-100 text-blue-800'

/**
 * The event form's editable fields. Dates are kept as `Date` (what the pickers
 * speak) and times as `"HH:mm"` strings; they are recombined into Dayjs values
 * on submit. Resource requirement is enforced in the component (it depends on
 * whether the calendar has resources), not in this static schema.
 */
export const eventFormSchema = v.object({
	title: v.pipe(v.string(), v.minLength(1)),
	description: v.string(),
	location: v.string(),
	startDate: v.date(),
	endDate: v.date(),
	startTime: v.string(),
	endTime: v.string(),
	isAllDay: v.boolean(),
	color: v.string(),
	resourceId: v.optional(v.union([v.string(), v.number()])),
})

export type EventFormValues = v.InferOutput<typeof eventFormSchema>

/** The selected event's fields mapped to form values, or the new-event defaults. */
export const toEventFormValues = (
	selectedEvent?: CalendarEvent | null
): EventFormValues => {
	const {
		resourceId,
		resourceIds,
		start = dayjs(),
		end = dayjs().add(1, 'hour'),
		allDay = false,
		color = DEFAULT_EVENT_COLOR,
		title = '',
		description = '',
		location = '',
	} = selectedEvent ?? {}

	return {
		title,
		description,
		location,
		startDate: start.toDate(),
		endDate: end.toDate(),
		startTime: start.format('HH:mm'),
		endTime: end.format('HH:mm'),
		isAllDay: allDay,
		color,
		resourceId: resourceId ?? resourceIds?.at(0),
	}
}

interface EventFieldsContext {
	hasResources: boolean
	/** Resource to keep on a non-resource calendar (the event's existing one). */
	fallbackResourceId?: string | number
	/** Plugin-contributed fields (e.g. recurrence's rrule) to merge in. */
	pluginUpdates: Partial<CalendarEvent>
}

/**
 * Map submitted form values to `CalendarEvent` fields: recombine date + time
 * (all-day events span the whole day), resolve the resource, and merge plugin
 * fields. Returns the fields without an `id` so the caller decides create vs
 * update.
 */
export const toEventFields = (
	values: EventFormValues,
	{ hasResources, fallbackResourceId, pluginUpdates }: EventFieldsContext
): Partial<CalendarEvent> => {
	const startTime = values.isAllDay ? '00:00' : values.startTime
	const endTime = values.isAllDay ? '23:59' : values.endTime
	return {
		title: values.title,
		start: buildDateTime(values.startDate, startTime),
		end: buildDateTime(values.endDate, endTime),
		resourceId: hasResources ? values.resourceId : fallbackResourceId,
		description: values.description,
		location: values.location,
		allDay: values.isAllDay,
		color: values.color,
		...pluginUpdates,
	}
}
