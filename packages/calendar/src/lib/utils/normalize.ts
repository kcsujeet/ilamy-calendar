import type { WeekDays } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'

/**
 * Converts an optional WeekDays[] list into a Set<number> of day indices
 * (0 = Sunday, 1 = Monday, ...), or undefined if the list is empty.
 */
export const toHiddenDaysSet = (
	hiddenDays?: WeekDays[]
): Set<number> | undefined => {
	if (!hiddenDays || hiddenDays.length === 0) return undefined
	return new Set(hiddenDays.map((day) => WEEK_DAYS_NUMBER_MAP[day]))
}

/**
 * Normalizes calendar events from public-facing format to internal format.
 * Converts flexible date types (dayjs, Date, string) to strict dayjs objects.
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
	if (!events || !events.length) {
		return []
	}

	return events.map((event) => {
		return {
			...event,
			start: dayjs.isDayjs(event.start) ? event.start : dayjs(event.start),
			end: dayjs.isDayjs(event.end) ? event.end : dayjs(event.end),
		} as TOutput
	})
}
