import type { Dayjs } from '@ilamy/utils/dayjs'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface HourLabelProps {
	date: Dayjs
}

export const HourLabel: React.FC<HourLabelProps> = ({ date }) => {
	const { renderHour, timeFormat } = useSmartCalendarContext()

	if (renderHour) {
		return <>{renderHour(date)}</>
	}

	return <>{date.format(timeFormat === '12-hour' ? 'h A' : 'H')}</>
}
