import type { WeekDays } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { WEEK_DAYS_NUMBER_MAP } from '@/config/constants'

/**
 * The days of the week (0 = Sunday, 1 = Monday, ...) a calendar does not draw:
 * the listed `hiddenDays`, plus Sunday and Saturday when `weekends` is false,
 * as in FullCalendar (`DateProfileGenerator.ts:397-399`, v7.1.1). `undefined`
 * when nothing is hidden. The consumer's array is read, never changed.
 */
export const toHiddenDaysSet = (
	hiddenDays: WeekDays[] = [],
	weekends = true
): Set<number> | undefined => {
	const hidden = new Set(hiddenDays.map((day) => WEEK_DAYS_NUMBER_MAP[day]))
	if (!weekends) {
		hidden.add(WEEK_DAYS_NUMBER_MAP.sunday)
		hidden.add(WEEK_DAYS_NUMBER_MAP.saturday)
	}
	return hidden.size === 0 ? undefined : hidden
}

/**
 * Normalizes calendar events from public-facing format to internal format.
 * Converts flexible date types (dayjs, Date, string) to strict dayjs objects.
 *
 * An already-Dayjs date is re-anchored rather than passed through: the consumer
 * parsed it in its own module, in the machine's zone, so passing it through
 * would render a correct instant against the wrong clock once a `timezone` prop
 * is in play. The configured constructor keeps the instant and moves only the
 * zone it displays in.
 *
 * @param events - Array of calendar events with flexible date types
 * @returns Normalized array of calendar events with dayjs dates
 *
 * @example
 * const events = normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(propEvents)
 */
export function normalizeEvents<
	TInput extends {
		start: Dayjs | Date | string
		end: Dayjs | Date | string
	},
	TOutput,
>(events: TInput[] | undefined): TOutput[] {
	if (!events?.length) {
		return []
	}

	return events.map((event) => {
		return {
			...event,
			start: dayjs(event.start),
			end: dayjs(event.end),
		} as TOutput
	})
}
