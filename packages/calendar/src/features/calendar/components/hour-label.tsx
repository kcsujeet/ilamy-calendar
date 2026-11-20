import { toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'
import { useDateTimeFormatters } from '@/features/calendar/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface HourLabelProps {
	date: ZonedDate
}

export const HourLabel: React.FC<HourLabelProps> = ({ date }) => {
	const renderHour = useSmartCalendarContext((ctx) => ctx.renderHour)
	const { formatSlotHeader } = useDateTimeFormatters()

	if (renderHour) {
		return <>{renderHour(toOffsetIso(date))}</>
	}

	return <>{formatSlotHeader(date)}</>
}
