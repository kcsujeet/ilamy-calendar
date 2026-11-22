import type { CalendarEvent } from '@ilamy/types'
import { readableTextColor } from '@ilamy/utils/helpers'
import { add, now, toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'

const DEFAULT_EVENT_COLOR = 'bg-blue-100 text-blue-800'
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Preset Tailwind color pairs offered by the event form color picker. */
export const EVENT_COLOR_SWATCHES = [
	{ value: DEFAULT_EVENT_COLOR, label: 'Blue' },
	{ value: 'bg-green-100 text-green-800', label: 'Green' },
	{ value: 'bg-purple-100 text-purple-800', label: 'Purple' },
	{ value: 'bg-red-100 text-red-800', label: 'Red' },
	{ value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
	{ value: 'bg-pink-100 text-pink-800', label: 'Pink' },
	{ value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
	{ value: 'bg-amber-100 text-amber-800', label: 'Amber' },
	{ value: 'bg-emerald-100 text-emerald-800', label: 'Emerald' },
	{ value: 'bg-sky-100 text-sky-800', label: 'Sky' },
	{ value: 'bg-violet-100 text-violet-800', label: 'Violet' },
	{ value: 'bg-rose-100 text-rose-800', label: 'Rose' },
	{ value: 'bg-teal-100 text-teal-800', label: 'Teal' },
	{ value: 'bg-orange-100 text-orange-800', label: 'Orange' },
]

const pad2 = (value: number): string => String(value).padStart(2, '0')

/** Formats a zoned date's wall-clock time as `HH:mm`. */
export const formatClockTime = (date: ZonedDate): string =>
	`${pad2(date.hour)}:${pad2(date.minute)}`

/** Builds a compact timestamp-based identifier for newly created events. */
export const generateEventId = (date: ZonedDate): string =>
	`${date.year}${pad2(date.month)}${pad2(date.day)}${pad2(date.hour)}${pad2(date.minute)}${pad2(date.second)}`

/** Picks the initial color value displayed in the event color picker. */
export const resolveInitialColor = (
	backgroundColor: string | undefined,
	color: string | undefined
): string => {
	if (backgroundColor && HEX_COLOR_PATTERN.test(backgroundColor)) {
		return backgroundColor
	}
	return color ?? DEFAULT_EVENT_COLOR
}

const buildColorFields = (
	color: string
): Pick<CalendarEvent, 'backgroundColor' | 'color'> => {
	if (HEX_COLOR_PATTERN.test(color)) {
		return { backgroundColor: color, color: readableTextColor(color) }
	}
	return { backgroundColor: undefined, color }
}

interface ResolveColorFieldsInput {
	colorChanged: boolean
	hadInitialColor: boolean
	selectedColor: string
	initialBackgroundColor: string | undefined
	initialColor: string | undefined
}

/** Resolves `backgroundColor` and `color` fields to persist when saving an event. */
export const resolveColorFields = ({
	colorChanged,
	hadInitialColor,
	selectedColor,
	initialBackgroundColor,
	initialColor,
}: ResolveColorFieldsInput): Pick<
	CalendarEvent,
	'backgroundColor' | 'color'
> => {
	if (colorChanged || !hadInitialColor) {
		return buildColorFields(selectedColor)
	}
	return { backgroundColor: initialBackgroundColor, color: initialColor }
}

/** Fills missing fields with defaults for a new or partially seeded event. */
export const withNewEventDefaults = (
	selectedEvent: CalendarEvent | null | undefined,
	timezone: string
) => {
	const current = now(timezone)
	const {
		id = '',
		start = toOffsetIso(current),
		end = toOffsetIso(add(current, 1, 'hour')),
		allDay = false,
		title = '',
		description = '',
		location = '',
		...rest
	} = selectedEvent ?? {}
	return { ...rest, id, start, end, allDay, title, description, location }
}

/** Determines whether the form's date and time pickers enforce business hours. */
export const isFormConstrainedByBusinessHours = (
	isExistingEvent: boolean,
	eventConstraint: string | undefined,
	selectConstraint: string | undefined
): boolean => {
	if (isExistingEvent) {
		return eventConstraint === 'businessHours'
	}
	return (
		selectConstraint === 'businessHours' || eventConstraint === 'businessHours'
	)
}
