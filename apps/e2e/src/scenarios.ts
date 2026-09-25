import {
	type CalendarEvent,
	dayjs,
	type Resource,
	type SlotDuration,
} from '@ilamy/calendar'

/**
 * The instant the harness pretends it is. Must match `PINNED_NOW` in the test
 * support module: the tests pin the browser clock, and the fixtures are written
 * relative to the same moment.
 */
export const PINNED_NOW = '2025-03-12T09:00:00.000Z'

/** Views a fixture is worth rendering in. */
export type ViewName = 'day' | 'week' | 'month' | 'year' | 'agenda'

/** Calendar settings a fixture can pin, and a URL can override. */
export interface HarnessConfig {
	slotDuration: SlotDuration
	/** Where a time grid scrolls to. Without this, events sit below the fold. */
	scrollTime: string
	dayMaxEvents: number
	weekViewGranularity: 'hourly' | 'daily'
	hideNonBusinessHours: boolean
}

export interface Scenario {
	/** What this fixture pins, and why it earns a place in the suite. */
	readonly description: string
	/** The views this fixture says something in. `business-hours` says nothing in `year`. */
	readonly views: readonly ViewName[]
	readonly events: readonly CalendarEvent[]
	/** Present only on fixtures about the resource axis. */
	readonly resources?: readonly Resource[]
	/** Settings this fixture needs in order to say what it says. */
	readonly config?: Partial<HarnessConfig>
}

const at = (iso: string) => dayjs(iso)

const event = (
	id: string,
	title: string,
	start: string,
	end: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({ id, title, start: at(start), end: at(end), ...extra })

const TEAM: readonly Resource[] = [
	{ id: 'r1', title: 'Room A' },
	{ id: 'r2', title: 'Room B' },
	{ id: 'r3', title: 'Room C' },
]

/**
 * Every fixture is a fixed event set at a pinned instant. A fixture describes
 * *what events exist*; the view in the URL decides *how they are drawn*. The two
 * are orthogonal, so the coverage matrix is generated from `views` rather than
 * written out by hand — which means a gap shows up as a hole in the table
 * instead of hiding in whichever specs somebody remembered to write.
 */
export const scenarios = {
	basic: {
		description:
			'Ordinary events inside one day. The control case: if this fails, the harness is wrong rather than the calendar.',
		views: ['day', 'week', 'month', 'year', 'agenda'],
		events: [
			event(
				'basic-1',
				'Morning stand-up',
				'2025-03-12T09:30:00.000Z',
				'2025-03-12T10:00:00.000Z'
			),
			event(
				'basic-2',
				'Design review',
				'2025-03-12T14:00:00.000Z',
				'2025-03-12T15:30:00.000Z'
			),
			event(
				'basic-3',
				'Earlier in the month',
				'2025-03-04T11:00:00.000Z',
				'2025-03-04T12:00:00.000Z'
			),
		],
	},

	colored: {
		description:
			'Events that carry their colour the two different ways the API allows: one in `color` as Tailwind classes (what the playground seed does), one in `backgroundColor` as a CSS value. Anything that repaints an event — the drag mirror above all — has to read both, or it paints everything the same fallback blue.',
		views: ['day', 'week', 'month'],
		config: { scrollTime: '08:00' },
		events: [
			event(
				'colored-1',
				'Tailwind classes',
				'2025-03-12T09:00:00.000Z',
				'2025-03-12T10:00:00.000Z',
				{ color: 'bg-teal-100 text-teal-800' }
			),
			event(
				'colored-2',
				'CSS colour',
				'2025-03-12T11:00:00.000Z',
				'2025-03-12T12:00:00.000Z',
				{ backgroundColor: '#f59e0b', color: '#ffffff' }
			),
		],
	},

	'short-events': {
		description:
			'15 and 30 minute events against a 15 minute slot. The shortest thing the grid can draw, where a rounding error is visible.',
		views: ['day', 'week'],
		config: { slotDuration: 15, scrollTime: '08:00' },
		events: [
			event(
				'short-1',
				'Quarter hour',
				'2025-03-12T09:00:00.000Z',
				'2025-03-12T09:15:00.000Z'
			),
			event(
				'short-2',
				'Half hour',
				'2025-03-12T09:30:00.000Z',
				'2025-03-12T10:00:00.000Z'
			),
			event(
				'short-3',
				'Off the slot boundary',
				'2025-03-12T10:50:00.000Z',
				'2025-03-12T11:05:00.000Z'
			),
		],
	},

	'overlapping-events': {
		description:
			'Four events sharing one hour, so the column-splitting layout has to divide the width.',
		views: ['day', 'week'],
		config: { scrollTime: '08:00' },
		events: [
			event(
				'overlap-1',
				'First',
				'2025-03-12T09:00:00.000Z',
				'2025-03-12T10:30:00.000Z'
			),
			event(
				'overlap-2',
				'Second',
				'2025-03-12T09:15:00.000Z',
				'2025-03-12T10:00:00.000Z'
			),
			event(
				'overlap-3',
				'Third',
				'2025-03-12T09:30:00.000Z',
				'2025-03-12T11:00:00.000Z'
			),
			event(
				'overlap-4',
				'Fourth',
				'2025-03-12T09:45:00.000Z',
				'2025-03-12T10:15:00.000Z'
			),
		],
	},

	'overnight-event': {
		description:
			'22:00 to 02:00, cut across two day columns. Each bar must report whether it holds the real start or end (#264).',
		views: ['day', 'week', 'agenda'],
		config: { scrollTime: '20:00' },
		events: [
			event(
				'overnight-1',
				'Night shift',
				'2025-03-12T22:00:00.000Z',
				'2025-03-13T02:00:00.000Z'
			),
		],
	},

	'spanning-event': {
		description:
			'Longer than one month row, so it is drawn as several bars with only the first holding the real start.',
		views: ['week', 'month', 'agenda'],
		events: [
			event(
				'spanning-1',
				'Conference fortnight',
				'2025-03-05T09:00:00.000Z',
				'2025-03-19T17:00:00.000Z'
			),
		],
	},

	'cross-month-week': {
		description:
			'The week of 31 March 2025, which runs into April. Cells on both sides must stay interactive (#259 / #260).',
		views: ['week', 'month'],
		events: [
			event(
				'cross-1',
				'Last day of March',
				'2025-03-31T10:00:00.000Z',
				'2025-03-31T11:00:00.000Z'
			),
			event(
				'cross-2',
				'First day of April',
				'2025-04-01T10:00:00.000Z',
				'2025-04-01T11:00:00.000Z'
			),
		],
	},

	'timed-multi-day': {
		description:
			'A multi-day event that does NOT start or end at midnight. A month row draws it across whole, equal day columns while its elapsed time runs 09:00 to 17:00, so the two diverge: reading the grab point as a fraction of TIME rather than of columns lands the drop a day out. Every other multi-day fixture here is midnight-aligned, where the two agree and the bug is invisible.',
		views: ['week', 'month'],
		events: [
			event(
				'timed-span-1',
				'Field survey',
				'2025-03-10T09:00:00.000Z',
				'2025-03-13T17:00:00.000Z'
			),
		],
	},

	'all-day-events': {
		description:
			'All-day and multi-day-all-day events, which live in the all-day row rather than the time grid.',
		views: ['day', 'week', 'month'],
		events: [
			event(
				'allday-1',
				'Public holiday',
				'2025-03-12T00:00:00.000Z',
				'2025-03-13T00:00:00.000Z',
				{ allDay: true }
			),
			event(
				'allday-2',
				'Off-site',
				'2025-03-13T00:00:00.000Z',
				'2025-03-15T00:00:00.000Z',
				{ allDay: true }
			),
		],
	},

	'many-events': {
		description:
			'More events in one day than `dayMaxEvents` allows, so the overflow indicator has to appear.',
		views: ['month'],
		config: { dayMaxEvents: 3 },
		events: Array.from({ length: 7 }, (_, index) =>
			event(
				`many-${index}`,
				`Event ${index + 1}`,
				`2025-03-12T${String(9 + index).padStart(2, '0')}:00:00.000Z`,
				`2025-03-12T${String(9 + index).padStart(2, '0')}:45:00.000Z`
			)
		),
	},

	'resource-day-overflow': {
		description:
			'#280: seven non-overlapping one-hour events in one resource. Every hour cell claimed the whole day\'s overflow, so all 24 showed "+3 more" — including empty hours.',
		views: ['day'],
		// `dayMaxEvents` is left at its default of 4, which is what the report
		// used. `scrollTime` puts the events on screen for anyone opening the URL.
		config: { scrollTime: '08:00' },
		resources: [{ id: 'room-a', title: 'Room A' }],
		events: [9, 11, 13, 15, 17, 19, 21].map((hour, index) =>
			event(
				`course-${index}`,
				`Course ${index + 1}`,
				`2025-03-12T${String(hour).padStart(2, '0')}:00:00.000Z`,
				`2025-03-12T${String(hour + 1).padStart(2, '0')}:00:00.000Z`,
				{ resourceId: 'room-a' }
			)
		),
	},

	'long-events': {
		description:
			'#290: an event far taller than the viewport, so scrolling down runs its start, and the title the default content draws there, off the top of the time grid.',
		views: ['day', 'week'],
		events: [
			event(
				'long-1',
				'Long shift',
				'2025-03-12T02:00:00.000Z',
				'2025-03-12T20:00:00.000Z'
			),
		],
	},

	'long-resource-events': {
		description:
			'#290: events longer than the resource grid is wide or tall. Scrolling runs their start under the sticky resource column or header, and a title that does not stick goes with it.',
		views: ['day', 'week', 'month'],
		resources: TEAM,
		events: [
			event(
				'long-res-1',
				'Site survey',
				'2025-03-03T00:00:00.000Z',
				'2025-03-13T00:00:00.000Z',
				{ allDay: true, resourceId: 'r1' }
			),
			event(
				'long-res-2',
				'Long shift',
				'2025-03-12T02:00:00.000Z',
				'2025-03-12T20:00:00.000Z',
				{ resourceId: 'r2' }
			),
		],
	},

	resources: {
		description:
			'Three resources with events on each, for the resource axis in both orientations.',
		views: ['day', 'week', 'month'],
		config: { scrollTime: '08:00' },
		resources: TEAM,
		events: [
			event(
				'res-1',
				'Room A booking',
				'2025-03-12T09:00:00.000Z',
				'2025-03-12T10:30:00.000Z',
				{ resourceId: 'r1' }
			),
			event(
				'res-2',
				'Room B booking',
				'2025-03-12T10:00:00.000Z',
				'2025-03-12T11:00:00.000Z',
				{ resourceId: 'r2' }
			),
			event(
				'res-3',
				'Room C booking',
				'2025-03-12T11:00:00.000Z',
				'2025-03-12T12:30:00.000Z',
				{ resourceId: 'r3' }
			),
			event(
				'res-4',
				'Room A, later',
				'2025-03-13T14:00:00.000Z',
				'2025-03-13T15:00:00.000Z',
				{ resourceId: 'r1' }
			),
		],
	},
} as const satisfies Record<string, Scenario>

export type ScenarioName = keyof typeof scenarios

export const isScenarioName = (value: string): value is ScenarioName =>
	Object.hasOwn(scenarios, value)
