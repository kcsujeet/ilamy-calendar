import type { CalendarEvent } from '@ilamy/calendar'
import { RRule } from '@ilamy/calendar/plugins/recurrence'

const pad2 = (value: number): string => String(value).padStart(2, '0')

const toLocalOffsetIso = (date: Date): string => {
	const year = date.getFullYear()
	const month = pad2(date.getMonth() + 1)
	const day = pad2(date.getDate())
	const hour = pad2(date.getHours())
	const minute = pad2(date.getMinutes())
	const second = pad2(date.getSeconds())
	const offsetMinutes = -date.getTimezoneOffset()
	const sign = offsetMinutes >= 0 ? '+' : '-'
	const absOffset = Math.abs(offsetMinutes)
	const offsetHours = pad2(Math.floor(absOffset / 60))
	const offsetMins = pad2(absOffset % 60)
	return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHours}:${offsetMins}`
}

const today = new Date()
const baseYear = today.getFullYear()
const baseMonth = today.getMonth()

const makeDate = (day: number, hour = 0, minute = 0): Date =>
	new Date(baseYear, baseMonth, day, hour, minute, 0, 0)

const monthIso = (day: number, hour = 0, minute = 0): string =>
	toLocalOffsetIso(makeDate(day, hour, minute))

const weekTwoAnchor = makeDate(8)
const weekTwoWednesday = makeDate(8 + (3 - weekTwoAnchor.getDay()), 16, 0)
const weekTwoWednesdayEnd = makeDate(8 + (3 - weekTwoAnchor.getDay()), 17, 0)

const dummyEvents: CalendarEvent[] = [
	{
		id: '5.1',
		title: 'Weekly Review',
		description: 'Review team performance and goals',
		start: monthIso(12, 15),
		end: monthIso(12, 16),
		color: 'bg-teal-100 text-teal-800',
	},
	{
		id: '5.2',
		title: 'Client Feedback Session',
		description: 'Gather feedback on recent deliverables',
		start: monthIso(12, 10),
		end: monthIso(12, 11),
		color: 'bg-orange-100 text-orange-800',
	},
	{
		id: '5.3',
		title: 'Team Lunch',
		description: 'Monthly team bonding lunch',
		start: monthIso(12, 12),
		end: monthIso(12, 13),
		color: 'bg-pink-100 text-pink-800',
	},
	{
		id: '5.4',
		title: 'Sprint Planning',
		description: 'Plan next sprint tasks',
		start: monthIso(12, 10),
		end: monthIso(12, 12),
		color: 'bg-indigo-100 text-indigo-800',
	},
	{
		id: '5.5',
		title: 'Code Review',
		description: 'Review code changes before merge',
		start: monthIso(12, 11),
		end: monthIso(12, 12),
		color: 'bg-amber-100 text-amber-800',
	},
	{
		id: '6',
		title: 'Design Sprint',
		description: 'Product design workshop',
		start: monthIso(12, 9),
		end: monthIso(16, 17),
		color: 'bg-pink-100 text-pink-800',
	},
	{
		id: '8',
		title: 'Marketing Campaign',
		description: 'Q2 product launch campaign',
		start: monthIso(15, 0),
		end: monthIso(29, 23, 59),
		color: 'bg-amber-100 text-amber-800',
	},
	{
		id: '9',
		title: 'Product Development',
		description: 'New feature development cycle',
		start: monthIso(20, 0),
		end: monthIso(80, 23, 59),
		color: 'bg-emerald-100 text-emerald-800',
	},
	{
		id: '10',
		title: 'Annual Leave',
		description: 'Summer vacation',
		start: monthIso(25, 0),
		end: monthIso(39, 23, 59),
		color: 'bg-sky-100 text-sky-800',
	},
	{
		id: '11',
		title: 'Conference',
		description: 'Industry tech conference',
		start: monthIso(-9, 9),
		end: monthIso(-7, 17),
		color: 'bg-violet-100 text-violet-800',
	},
	{
		id: '12',
		title: 'Research Project',
		description: 'Market research and analysis',
		start: monthIso(-4, 0),
		end: monthIso(10, 23, 59),
		color: 'bg-rose-100 text-rose-800',
	},
	{
		id: '15',
		title: 'Conference',
		description: 'Annual industry conference',
		start: monthIso(7, 0),
		end: monthIso(10, 0),
		color: 'bg-purple-100 text-purple-800',
		allDay: true,
	},
	{
		id: '16',
		title: 'Birthday Celebration',
		description: 'Celebrate team member birthday',
		start: monthIso(18, 0),
		end: monthIso(19, 0),
		color: 'bg-yellow-100 text-yellow-800',
		allDay: true,
	},
	{
		id: '17',
		title: 'Anniversary',
		description: 'Work anniversary celebration',
		start: monthIso(22, 0),
		end: monthIso(23, 0),
		color: 'bg-blue-100 text-blue-800',
		allDay: true,
	},
	{
		id: '18',
		title: 'Hackathon',
		description: 'Five-day coding challenge',
		start: monthIso(21, 0),
		end: monthIso(26, 0),
		color: 'bg-green-100 text-green-800',
		allDay: true,
	},
	{
		id: '19',
		title: 'Workshop',
		description: 'Hands-on training workshop',
		start: monthIso(27, 0),
		end: monthIso(31, 0),
		color: 'bg-red-100 text-red-800',
		allDay: true,
	},
	{
		id: '20',
		title: 'Daily Standup',
		description: 'Daily team sync meeting',
		start: monthIso(1, 10),
		end: monthIso(1, 11),
		color: 'bg-cyan-100 text-cyan-800',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
			dtstart: makeDate(1, 10),
		},
		exdates: [],
	},
	{
		id: '21',
		title: 'PST Evening Sync (UTC Boundary)',
		description:
			'Recurring Wednesday at 4 PM PST. This event crosses the UTC day boundary (00:00 UTC) but stays on Wednesday thanks to Floating Time.',
		start: toLocalOffsetIso(weekTwoWednesday),
		end: toLocalOffsetIso(weekTwoWednesdayEnd),
		color: 'bg-indigo-200 text-indigo-900',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.WE],
			dtstart: weekTwoWednesday,
		},
		exdates: [],
	},
]

export default dummyEvents
