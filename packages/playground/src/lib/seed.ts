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

// Wednesday of the week starting 7 days after the 1st of the month.
const weekTwoAnchor = makeDate(8)
const weekTwoWednesday = makeDate(8 + (3 - weekTwoAnchor.getDay()), 16, 0)
const weekTwoWednesdayEnd = makeDate(8 + (3 - weekTwoAnchor.getDay()), 17, 0)

export const dummyEvents: CalendarEvent[] = [
	// Colour matrix. `backgroundColor` and `color` each accept a Tailwind class
	// OR a CSS value, and either may be omitted, so there are nine combinations
	// an event can reach the renderer with. All nine are seeded here.
	{
		id: '5.1',
		title: 'Quarterly Planning',
		description: 'Falls back to bg-blue-500 + text-white',
		start: monthIso(12, 15),
		end: monthIso(12, 16),
	},
	{
		id: '5.2',
		title: 'Design Review',
		description: 'Fill and text both ride in `color` as Tailwind classes',
		start: monthIso(12, 10),
		end: monthIso(12, 11),
		color: 'bg-teal-100 text-teal-800',
	},
	{
		id: '5.3',
		title: 'Client Check-in',
		description: 'Text colour only; the fill falls back',
		start: monthIso(12, 12),
		end: monthIso(12, 13),
		color: '#7c3aed',
	},
	{
		id: '5.4',
		title: 'Sprint Retrospective',
		description: 'Fill as a Tailwind class, no text colour',
		start: monthIso(13, 10),
		end: monthIso(13, 12),
		backgroundColor: 'bg-rose-500',
	},
	{
		id: '5.5',
		title: 'Budget Review',
		description: 'Fill as a CSS value, no text colour',
		start: monthIso(13, 13),
		end: monthIso(13, 14),
		backgroundColor: '#f59e0b',
	},
	{
		id: '5.6',
		title: 'All Hands',
		description: 'Fill and text as Tailwind classes',
		start: monthIso(14, 9),
		end: monthIso(14, 10),
		backgroundColor: 'bg-violet-500',
		color: 'text-violet-50',
	},
	{
		id: '5.7',
		title: 'Onboarding Session',
		description: 'Fill and text as CSS values',
		start: monthIso(14, 11),
		end: monthIso(14, 12),
		backgroundColor: '#0ea5e9',
		color: '#08203a',
	},
	{
		id: '5.8',
		title: 'Security Audit',
		description: 'Mixed forms in one event',
		start: monthIso(15, 9),
		end: monthIso(15, 10),
		backgroundColor: 'bg-emerald-500',
		color: '#022c22',
	},
	{
		id: '5.9',
		title: 'Roadmap Sync',
		description: 'Mixed forms the other way round',
		start: monthIso(15, 11),
		end: monthIso(15, 12),
		backgroundColor: '#1e293b',
		color: 'text-amber-300',
	},

	// Multi-day events (within same month)
	{
		id: '6',
		title: 'Design Sprint',
		description: 'Product design workshop',
		start: monthIso(12, 9),
		end: monthIso(16, 17),
		color: 'bg-pink-100 text-pink-800',
	},

	// Multi-week event
	{
		id: '8',
		title: 'Marketing Campaign',
		description: 'Q2 product launch campaign',
		start: monthIso(15, 0),
		end: monthIso(29, 23, 59),
		color: 'bg-amber-100 text-amber-800',
	},

	// Multi-month events
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

	// Event in previous month
	{
		id: '11',
		title: 'Conference',
		description: 'Industry tech conference',
		start: monthIso(-9, 9),
		end: monthIso(-7, 17),
		color: 'bg-violet-100 text-violet-800',
	},

	// Event spanning from previous month to current
	{
		id: '12',
		title: 'Research Project',
		description: 'Market research and analysis',
		start: monthIso(-4, 0),
		end: monthIso(10, 23, 59),
		color: 'bg-rose-100 text-rose-800',
	},

	// All-day events (RFC 5545 exclusive end midnight)
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

	// All-day events spanning multiple days
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
	{
		id: '22',
		title: 'Morning Yoga Class',
		start: monthIso(today.getDate(), 10),
		end: monthIso(today.getDate(), 12),
		color: 'bg-cyan-100 text-cyan-800',
	},
]
