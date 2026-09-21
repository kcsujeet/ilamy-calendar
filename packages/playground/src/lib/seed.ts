import { dayjs } from '@ilamy/calendar'
import { RRule } from '@ilamy/calendar/plugins/recurrence'

// Use a fixed month reference point for consistent display
const baseDate = dayjs().startOf('month').date(1)

export const dummyEvents = [
	// Colour matrix. `backgroundColor` and `color` each accept a Tailwind class
	// OR a CSS value, and either may be omitted, so there are nine combinations
	// an event can reach the renderer with. All nine are seeded here: anything
	// that repaints an event (the drag mirror, a custom renderer) has to handle
	// every one, and a reader that checks only `backgroundColor` silently paints
	// the `color`-only cases the fallback blue. The titles read as real events on
	// purpose — this seeds the public demo, and a grid captioned with the names
	// of the props under test is not a calendar anyone can evaluate. Which form
	// each one exercises is in its `description`.
	{
		id: '5.1',
		title: 'Quarterly Planning',
		description: 'Falls back to bg-blue-500 + text-white',
		start: baseDate.date(12).hour(15),
		end: baseDate.date(12).hour(16),
	},
	{
		id: '5.2',
		title: 'Design Review',
		description: 'Fill and text both ride in `color` as Tailwind classes',
		start: baseDate.date(12).hour(10),
		end: baseDate.date(12).hour(11),
		color: 'bg-teal-100 text-teal-800',
	},
	{
		id: '5.3',
		title: 'Client Check-in',
		description: 'Text colour only; the fill falls back',
		start: baseDate.date(12).hour(12),
		end: baseDate.date(12).hour(13),
		color: '#7c3aed',
	},
	{
		id: '5.4',
		title: 'Sprint Retrospective',
		description: 'Fill as a Tailwind class, no text colour',
		start: baseDate.date(13).hour(10),
		end: baseDate.date(13).hour(12),
		backgroundColor: 'bg-rose-500',
	},
	{
		id: '5.5',
		title: 'Budget Review',
		description: 'Fill as a CSS value, no text colour',
		start: baseDate.date(13).hour(13),
		end: baseDate.date(13).hour(14),
		backgroundColor: '#f59e0b',
	},
	{
		id: '5.6',
		title: 'All Hands',
		description: 'Fill and text as Tailwind classes',
		start: baseDate.date(14).hour(9),
		end: baseDate.date(14).hour(10),
		backgroundColor: 'bg-violet-500',
		color: 'text-violet-50',
	},
	{
		id: '5.7',
		title: 'Onboarding Session',
		description: 'Fill and text as CSS values',
		start: baseDate.date(14).hour(11),
		end: baseDate.date(14).hour(12),
		backgroundColor: '#0ea5e9',
		color: '#08203a',
	},
	{
		id: '5.8',
		title: 'Security Audit',
		description: 'Mixed forms in one event',
		start: baseDate.date(15).hour(9),
		end: baseDate.date(15).hour(10),
		backgroundColor: 'bg-emerald-500',
		color: '#022c22',
	},
	{
		id: '5.9',
		title: 'Roadmap Sync',
		description: 'Mixed forms the other way round',
		start: baseDate.date(15).hour(11),
		end: baseDate.date(15).hour(12),
		backgroundColor: '#1e293b',
		color: 'text-amber-300',
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
	{
		id: '21',
		title: 'PST Evening Sync (UTC Boundary)',
		description:
			'Recurring Wednesday at 4 PM PST. This event crosses the UTC day boundary (00:00 UTC) but stays on Wednesday thanks to Floating Time.',
		start: baseDate.add(1, 'week').day(3).hour(16).minute(0),
		end: baseDate.add(1, 'week').day(3).hour(17).minute(0),
		color: 'bg-indigo-200 text-indigo-900',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.WE],
			dtstart: baseDate.add(1, 'week').day(3).hour(16).minute(0).toDate(),
		},
		exdates: [],
	},
	{
		id: '22',
		title: 'Morning Yoga Class',
		start: dayjs().hour(10),
		end: dayjs().hour(12),
		color: 'bg-cyan-100 text-cyan-800',
	},
]
