import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'

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
