import dayjs from 'dayjs'
import { memo } from 'react'

interface CurrentTimeIndicatorProps {
	day: dayjs.Dayjs
}

const NoMemoCurrentTimeIndicator = ({ day }: CurrentTimeIndicatorProps) => {
	const now = dayjs()
	const isToday = day.isSame(now, 'day')

	if (!isToday) {
		return null
	}

	return (
		<div
			className="absolute left-0 right-0 h-0.5 bg-red-500"
			data-testid="current-time-indicator"
			style={{
				top: `${((now.hour() * 60 + now.minute()) / (24 * 60)) * 100}%`,
			}}
		/>
	)
}

export const CurrentTimeIndicator = memo(NoMemoCurrentTimeIndicator)
