import type { CalendarEvent } from '@/components/types'
import type {
	CalendarEventWithDateType,
	DateEventType,
} from '@/features/calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'

const formatDateForCallback = (
	date: Dayjs,
	dateEventType: DateEventType
): Dayjs | Date | string => {
	switch (dateEventType) {
		case 'Dayjs':
			return date
		case 'Date':
			return date.toDate()
		case 'string':
			return date.toISOString()
	}
}

/**
 * Maps an internal calendar event to the shape expected by onEvent* callbacks,
 * converting `start` and `end` according to `dateEventType`.
 */
export const formatEventForCallback = <T extends DateEventType = 'Dayjs'>(
	event: CalendarEvent,
	dateEventType: T
): CalendarEventWithDateType<T> => {
	const start = formatDateForCallback(event.start, dateEventType)
	const end = formatDateForCallback(event.end, dateEventType)

	return {
		...event,
		start,
		end,
	} as CalendarEventWithDateType<T>
}
