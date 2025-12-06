import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'

// Hours to display (all 24 hours of the day)
const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) => {
	return dayjs().hour(hour).minute(0)
})

interface DayTimeColProps {
	className?: string
}

export const DayTimeCol: React.FC<DayTimeColProps> = ({ className }) => {
	const { currentLocale, timeFormat } = useCalendarContext()

	return (
		<div
			data-testid="day-time-col"
			className={`col-span-2 h-full md:col-span-1 ${className}`}
		>
			{hours.map((time) => (
				<div
					key={time.format('HH:mm')}
					data-testid={`day-time-hour-${time.format('HH')}`}
					className="h-[60px] border-b text-right"
				>
					<span className="text-muted-foreground pr-2 text-right text-[10px] sm:text-xs">
						{Intl.DateTimeFormat(currentLocale, {
							hour: 'numeric',
							hour12: timeFormat === '12-hour',
						}).format(time.toDate())}
					</span>
				</div>
			))}
		</div>
	)
}
