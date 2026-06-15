import type { IlamyCalendarProps } from '@ilamy/calendar'
import { dayjs, IlamyCalendar } from '@ilamy/calendar'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import { Card } from '@/components'
import dummyEvents from '@/lib/seed'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(timezone)
dayjs.extend(utc)

export function CalendarPreview() {
	// Filter the dummy events to only include short events (1-2 days duration)
	const previewEvents: IlamyCalendarProps['events'] = dummyEvents.filter(
		(event) => {
			// Calculate the duration in days
			const durationDays = event.end.diff(event.start, 'day')

			// Keep events that are 0, 1 or 2 days in duration
			return durationDays <= 2
		}
	)

	return (
		<Card className="shadow-xl border border-white/20 dark:border-white/10 mx-auto w-full overflow-clip transition-all bg-white/70 dark:bg-black/40 backdrop-blur-md hover:shadow-2xl py-0">
			{/* Decorative elements */}
			<div className="absolute top-2 left-2 flex gap-1.5">
				<div className="w-2.5 h-2.5 bg-red-500/80 rounded-full"></div>
				<div className="w-2.5 h-2.5 bg-yellow-500/80 rounded-full"></div>
				<div className="w-2.5 h-2.5 bg-green-500/80 rounded-full"></div>
			</div>

			{/* Use a container with overflow clip */}
			<div className="relative w-full h-[300px] md:h-[450px] overflow-clip pointer-events-none pt-6 **:pointer-events-none!">
				{/* Scale the calendar down while maintaining the aspect ratio */}
				<div className="absolute top-6 left-0 transform-gpu scale-[0.6] origin-top-left w-[166%] h-[166%]">
					<IlamyCalendar
						dayMaxEvents={3}
						events={previewEvents}
						firstDayOfWeek="sunday"
					/>
				</div>
			</div>
		</Card>
	)
}
