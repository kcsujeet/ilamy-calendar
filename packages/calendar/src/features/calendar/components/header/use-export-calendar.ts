import dayjs from '@ilamy/utils/dayjs'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { downloadICalendar } from '@/lib/utils/export-ical'

// Single source for the header's iCal export, used by both the desktop Export
// button and the compact overflow menu.
export function useExportCalendar(): () => void {
	const { rawEvents, collect } = useSmartCalendarContext((ctx) => ({
		rawEvents: ctx.rawEvents,
		collect: ctx.collect,
	}))
	return () => {
		const filename = `ilamy-calendar-${dayjs().format('YYYY-MM-DD')}.ics`
		downloadICalendar(rawEvents, collect, filename, 'ilamy Calendar')
	}
}
