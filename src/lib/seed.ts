import { RRule } from 'rrule'
import dayjs from '@/lib/configs/dayjs-config'

// Use a fixed month reference point for consistent display
const baseDate = dayjs().startOf('month').date(1)

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
		title: 'Daily Standup',
		description: 'Daily team sync meeting',
		start: baseDate.hour(10),
		end: baseDate.hour(11),
		color: 'bg-cyan-100 text-cyan-800',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
			dtstart: baseDate.hour(10).toDate(), // Required dtstart field
		},
		exdates: [],
	},
]

export default [dummyEvents]
