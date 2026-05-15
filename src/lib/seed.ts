import { RRule } from 'rrule'
import dayjs from '@/lib/configs/dayjs-config'

// Use a fixed month reference point for consistent display
const baseDate = dayjs().startOf('month').date(1)

// Last Friday of the anchor month — must match MONTHLY + FR.nth(-1)
let lastFridayOfMonth = baseDate.endOf('month').startOf('day')
while (lastFridayOfMonth.day() !== 5) {
	lastFridayOfMonth = lastFridayOfMonth.subtract(1, 'day')
}
const monthlyOnTheStart = lastFridayOfMonth.hour(16).minute(0)
const monthlyOnDayStart = baseDate.date(15).hour(14).minute(0)
const yearlyStart = baseDate
	.month(baseDate.month())
	.date(baseDate.date())
	.hour(11)
	.minute(0)

// Next Wednesday on or after baseDate for weekly UTC-boundary demo
let nextWednesday = baseDate.startOf('day')
while (nextWednesday.day() !== 3) {
	nextWednesday = nextWednesday.add(1, 'day')
}
const weeklySyncStart = nextWednesday.hour(16).minute(0)

const dummyEvents = [
	// First week events
	{
		id: '5.1',
		title: 'Weekly Review',
		description: 'Review team performance and goals',
		start: baseDate.date(12).hour(15),
		end: baseDate.date(12).hour(16),
		color: 'bg-teal-100 text-teal-800',
	},
	// Second week events
	{
		id: '5.2',
		title: 'Client Feedback Session',
		description: 'Gather feedback on recent deliverables',
		start: baseDate.date(12).hour(10),
		end: baseDate.date(12).hour(11),
		color: 'bg-orange-100 text-orange-800',
	},
	{
		id: '5.3',
		title: 'Team Lunch',
		description: 'Monthly team bonding lunch',
		start: baseDate.date(12).hour(12),
		end: baseDate.date(12).hour(13),
		color: 'bg-pink-100 text-pink-800',
	},
	{
		id: '5.4',
		title: 'Sprint Planning',
		description: 'Plan next sprint tasks',
		start: baseDate.date(12).hour(10),
		end: baseDate.date(12).hour(12),
		color: 'bg-indigo-100 text-indigo-800',
	},
	{
		id: '5.5',
		title: 'Code Review',
		description: 'Review code changes before merge',
		start: baseDate.date(12).hour(11),
		end: baseDate.date(12).hour(12),
		color: 'bg-amber-100 text-amber-800',
	},

	// Multi-day events (within same month)
	{
		id: '6',
		title: 'Design Sprint',
		description: 'Product design workshop',
		start: baseDate.date(12).hour(9),
		end: baseDate.date(16).hour(17),
		color: 'bg-pink-100 text-pink-800',
	},

	// Multi-week event
	{
		id: '8',
		title: 'Marketing Campaign',
		description: 'Q2 product launch campaign',
		start: baseDate.date(15).hour(0),
		end: baseDate.date(29).hour(23).minute(59),
		color: 'bg-amber-100 text-amber-800',
	},

	// Multi-month events
	{
		id: '9',
		title: 'Product Development',
		description: 'New feature development cycle',
		start: baseDate.date(20).hour(0),
		end: baseDate.date(20).add(60, 'day').hour(23).minute(59),
		color: 'bg-emerald-100 text-emerald-800',
	},
	{
		id: '10',
		title: 'Annual Leave',
		description: 'Summer vacation',
		start: baseDate.date(25).hour(0),
		end: baseDate.date(25).add(14, 'day').hour(23).minute(59),
		color: 'bg-sky-100 text-sky-800',
	},

	// Event in previous month
	{
		id: '11',
		title: 'Conference',
		description: 'Industry tech conference',
		start: baseDate.subtract(10, 'day').hour(9),
		end: baseDate.subtract(8, 'day').hour(17),
		color: 'bg-violet-100 text-violet-800',
	},

	// Event spanning from previous month to current
	{
		id: '12',
		title: 'Research Project',
		description: 'Market research and analysis',
		start: baseDate.subtract(5, 'day').hour(0),
		end: baseDate.date(10).hour(23).minute(59),
		color: 'bg-rose-100 text-rose-800',
	},

	// All-day events
	{
		id: '15',
		title: 'Conference',
		description: 'Annual industry conference',
		start: baseDate.add(6, 'day').startOf('day'),
		end: baseDate.add(8, 'day').endOf('day'),
		color: 'bg-purple-100 text-purple-800',
		allDay: true,
	},

	// All-day events
	{
		id: '16',
		title: 'Birthday Celebration',
		description: 'Celebrate team member birthday',
		start: baseDate.date(18).startOf('day'),
		end: baseDate.date(18).endOf('day'),
		color: 'bg-yellow-100 text-yellow-800',
		allDay: true,
	},
	{
		id: '17',
		title: 'Anniversary',
		description: 'Work anniversary celebration',
		start: baseDate.date(22).startOf('day'),
		end: baseDate.date(22).endOf('day'),
		color: 'bg-blue-100 text-blue-800',
		allDay: true,
	},

	// All-day events spanning multiple days
	{
		id: '18',
		title: 'Hackathon',
		description: '48-hour coding challenge',
		start: baseDate.date(21).startOf('day'),
		end: baseDate.date(25).endOf('day'),
		color: 'bg-green-100 text-green-800',
		allDay: true,
	},
	{
		id: '19',
		title: 'Workshop',
		description: 'Hands-on training workshop',
		start: baseDate.date(27).startOf('day'),
		end: baseDate.date(30).endOf('day'),
		color: 'bg-red-100 text-red-800',
		allDay: true,
	},

	{
		id: '20',
		title: 'Daily Check-in',
		description: 'Daily team sync meeting',
		start: baseDate.hour(9),
		end: baseDate.hour(9).minute(30),
		color: 'bg-cyan-100 text-cyan-800',
		rrule: {
			freq: RRule.DAILY,
			interval: 1,
			dtstart: baseDate.hour(9).toDate(),
		},
		exdates: [],
	},
	{
		id: '21',
		title: 'PST Evening Sync (UTC Boundary)',
		description:
			'Recurring Wednesday at 4 PM PST. This event crosses the UTC day boundary (00:00 UTC) but stays on Wednesday thanks to Floating Time.',
		start: weeklySyncStart,
		end: weeklySyncStart.add(1, 'hour'),
		color: 'bg-indigo-200 text-indigo-900',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.WE],
			dtstart: weeklySyncStart.toDate(),
		},
		exdates: [],
	},
	{
		id: '22',
		title: 'Monthly Sync (UTC Boundary)',
		description:
			'Recurring monthly on the last Friday of the month at 4 PM PST. This event crosses the UTC day boundary (00:00 UTC) but stays on Friday thanks to Floating Time.',
		start: monthlyOnTheStart,
		end: monthlyOnTheStart.add(1, 'hour'),
		color: 'bg-indigo-200 text-indigo-900',
		rrule: {
			freq: RRule.MONTHLY,
			byweekday: [RRule.FR.nth(-1)],
			dtstart: monthlyOnTheStart.toDate(),
			count: 12,
		},
		exdates: [],
	},
	{
		id: '23',
		title: 'Monthly Review (on day 15)',
		description: 'Recurring on the 15th of each month',
		start: monthlyOnDayStart,
		end: monthlyOnDayStart.add(1, 'hour'),
		color: 'bg-violet-200 text-violet-900',
		rrule: {
			freq: RRule.MONTHLY,
			bymonthday: [15],
			interval: 1,
			dtstart: monthlyOnDayStart.toDate(),
			count: 12,
		},
		exdates: [],
	},
	{
		id: '24',
		title: 'Annual Planning',
		description: 'Yearly planning session on the 1st of the month',
		start: yearlyStart,
		end: yearlyStart.add(2, 'hour'),
		color: 'bg-emerald-200 text-emerald-900',
		rrule: {
			freq: RRule.YEARLY,
			bymonth: [baseDate.month() + 1],
			bymonthday: [baseDate.date()],
			interval: 1,
			dtstart: yearlyStart.toDate(),
			count: 5,
		},
		exdates: [],
	},
]

export default dummyEvents
