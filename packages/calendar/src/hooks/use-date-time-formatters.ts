import type { Dayjs } from '@ilamy/utils/dayjs'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

export function useDateTimeFormatters() {
	const { currentLocale, timezone } = useSmartCalendarContext((ctx) => ({
		currentLocale: ctx.currentLocale,
		timezone: ctx.timezone,
	}))

	const formatDateRange = (start: Dayjs, end: Dayjs) =>
		new Intl.DateTimeFormat(currentLocale, {
			timeZone: timezone,
			month: 'short',
			day: 'numeric',
		}).formatRange(start.toDate(), end.toDate())

	return { formatDateRange }
}
