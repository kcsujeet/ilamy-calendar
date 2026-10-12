import type { Dayjs } from '@ilamy/utils/dayjs'
import { useDateTimeFormatters } from '@/features/calendar/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface HourLabelProps {
	date: Dayjs
}

export const HourLabel: React.FC<HourLabelProps> = ({ date }) => {
	const renderHour = useSmartCalendarContext((ctx) => ctx.renderHour)
	const { formatSlotHeader } = useDateTimeFormatters()

	if (renderHour) {
		return <>{renderHour(date)}</>
	}

	return <>{formatSlotHeader(date)}</>
}
