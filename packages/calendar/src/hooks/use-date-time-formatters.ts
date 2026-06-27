import type { Dayjs } from '@ilamy/utils/dayjs'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

export function useDateTimeFormatters() {
	const { currentLocale, timezone } = useSmartCalendarContext((ctx) => ({
		currentLocale: ctx.currentLocale,
		timezone: ctx.timezone,
	}))

	const formatDateRange = (start: Dayjs, end: Dayjs) => {
		const formatter = new Intl.DateTimeFormat(currentLocale, {
			timeZone: timezone,
			month: 'short',
			day: 'numeric',
		})
		// `formatRange` shows whichever fields distinguish the two dates, so a
		// week spanning two years renders the year on BOTH ends ("Dec 30, 2026 –
		// Jan 5, 2027"), which wraps the header. A cross-year week always spans two
		// different months, so dropping the year stays unambiguous ("Dec 30 – Jan
		// 5"). Same-year ranges keep `formatRange`'s concise collapsing.
		if (start.year() === end.year()) {
			return formatter.formatRange(start.toDate(), end.toDate())
		}
		return `${formatter.format(start.toDate())} – ${formatter.format(end.toDate())}`
	}

	return { formatDateRange }
}
