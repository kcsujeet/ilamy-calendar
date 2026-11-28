import { IlamyCalendar, type IlamyCalendarProps } from '@ilamy/calendar/react'

const todayAt = (hour: number, minute = 0, dayOffset = 0): Date => {
	const now = new Date()
	return new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + dayOffset,
		hour,
		minute,
		0,
		0
	)
}

const sampleEvents: IlamyCalendarProps['events'] = [
	{
		id: '1',
		title: 'Team Meeting',
		start: todayAt(10, 0),
		end: todayAt(11, 0),
		color: '#3b82f6',
	},
	{
		id: '2',
		title: 'Lunch Break',
		start: todayAt(12, 0),
		end: todayAt(13, 0),
		color: '#10b981',
	},
	{
		id: '3',
		title: 'Project Review',
		start: todayAt(14, 0, 1),
		end: todayAt(15, 30, 1),
		color: '#8b5cf6',
	},
]

export default function Calendar() {
	return (
		<div className="w-full">
			<IlamyCalendar
				dayMaxEvents={3}
				editable
				events={sampleEvents}
				firstDayOfWeek="sunday"
			/>
		</div>
	)
}
