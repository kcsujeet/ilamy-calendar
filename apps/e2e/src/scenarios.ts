import {
	type CalendarEvent,
	dayjs,
	type Resource,
	type SlotDuration,
} from '@ilamy/calendar'
import { RRule } from '@ilamy/calendar-recurrence'

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

	'edit-permissions': {
		description:
			'One event that opts out of editing (`editable: false`) beside one that does not, and an all-day event that opts out of resizing (`durationEditable: false`) beside one that does not, so a per-event flag is seen to beat a permissive calendar.',
		views: ['month'],
		events: [
			event(
				'locked-1',
				'Locked event',
				'2025-03-04T11:00:00.000Z',
				'2025-03-04T12:00:00.000Z',
				{ editable: false }
			),
			event(
				'free-1',
				'Free event',
				'2025-03-05T11:00:00.000Z',
				'2025-03-05T12:00:00.000Z'
			),
			// All-day, because a single-day timed event is a dot in the month grid and
			// has no resize handle whatever its flags say.
			event(
				'fixed-length-1',
				'Fixed length',
				'2025-03-17T00:00:00.000Z',
				'2025-03-18T00:00:00.000Z',
				{ allDay: true, durationEditable: false }
			),
			event(
				'stretchy-1',
				'Stretchy',
				'2025-03-18T00:00:00.000Z',
				'2025-03-19T00:00:00.000Z',
				{ allDay: true }
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

	'across-hidden-days': {
		description:
			'Events around a hidden weekend or weekday: one that runs over it, one that starts on a hidden day (Saturday) and one lying wholly on it, so the grids prove they clamp, cut and skip the way a gap in the columns requires.',
		views: ['week', 'month'],
		events: [
			event(
				'trip-1',
				'Weekend trip',
				'2025-03-14T00:00:00.000Z',
				'2025-03-18T00:00:00.000Z',
				{ allDay: true }
			),
			event(
				'mid-1',
				'Mid-week trip',
				'2025-03-12T00:00:00.000Z',
				'2025-03-15T00:00:00.000Z',
				{ allDay: true }
			),
			event(
				'standup-1',
				'Standup',
				'2025-03-13T10:00:00.000Z',
				'2025-03-13T11:00:00.000Z'
			),
			event(
				'market-1',
				'Saturday market',
				'2025-03-15T10:00:00.000Z',
				'2025-03-15T12:00:00.000Z'
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

	'clock-change-shift': {
		description:
			'A Friday night shift written in New York offsets, 20:00 EST to 08:00 EST (12 wall-clock hours), for moving it over the spring clock change (Sunday 9 March 2025). Use `timezone=America/New_York`.',
		views: ['week'],
		events: [
			event(
				'night-shift',
				'Friday night shift',
				'2025-03-07T20:00:00.000-05:00',
				'2025-03-08T08:00:00.000-05:00'
			),
		],
	},

	'all-day-in-clock-change-week': {
		description:
			'All-day events written as New York midnights (-04:00, the week after the clocks went forward on 9 March), so with `timezone=America/New_York` the month row holds Sunday 9 to Saturday 15 March, a week whose columns carry a stale UTC offset. Each bar must sit in exactly its own day.',
		views: ['month'],
		events: [
			event(
				'wed-all-day',
				'Wednesday all-day',
				'2025-03-12T00:00:00.000-04:00',
				'2025-03-13T00:00:00.000-04:00',
				{ allDay: true }
			),
			event(
				'sat-all-day',
				'Saturday all-day',
				'2025-03-15T00:00:00.000-04:00',
				'2025-03-16T00:00:00.000-04:00',
				{ allDay: true }
			),
		],
	},

	recurring: {
		description:
			'Two recurring series (open with plugins=recurrence): a Monday/Wednesday class that began in June 2015, so each expansion walks years of rule, and a daily stand-up. Pins the occurrences the recurrence plugin draws, including after navigating away and back.',
		views: ['day', 'week', 'month'],
		config: { scrollTime: '08:00' },
		events: [
			event(
				'class',
				'Long-running class',
				'2015-06-01T11:00:00.000Z',
				'2015-06-01T11:45:00.000Z',
				{
					rrule: {
						freq: RRule.WEEKLY,
						byweekday: [RRule.MO, RRule.WE],
						dtstart: at('2015-06-01T11:00:00.000Z').toDate(),
					},
				}
			),
			event(
				'standup',
				'Daily stand-up',
				'2025-03-01T09:00:00.000Z',
				'2025-03-01T09:15:00.000Z',
				{
					rrule: {
						freq: RRule.DAILY,
						dtstart: at('2025-03-01T09:00:00.000Z').toDate(),
					},
				}
			),
		],
	},

	'ical-export': {
		description:
			'The iCal export: a timed event with a title and description long enough to need line folding (some of it multi-octet UTF-8), and an all-day weekly series (open with plugins=recurrence) cut by "this and following" (UNTIL, as the delete stores it), with one EXDATE and one moved occurrence. Every DATE-valued property must stay DATE-valued.',
		views: ['month'],
		events: [
			event(
				'folding-1',
				'Quarterly planning review',
				'2025-03-13T10:00:00.000Z',
				'2025-03-13T11:00:00.000Z',
				{
					uid: 'folding-1',
					description: `${'Agenda é€ '.repeat(20)}end`,
				}
			),
			event(
				'holiday-series',
				'Holiday',
				'2025-03-10T00:00:00.000Z',
				'2025-03-11T00:00:00.000Z',
				{
					uid: 'holiday-series',
					allDay: true,
					exdates: ['2025-03-17T00:00:00.000Z'],
					rrule: {
						freq: RRule.WEEKLY,
						dtstart: at('2025-03-10T00:00:00.000Z').toDate(),
						until: at('2025-03-30T23:59:59.999Z').toDate(),
					},
				}
			),
			event(
				'holiday-moved',
				'Holiday (moved)',
				'2025-03-25T00:00:00.000Z',
				'2025-03-26T00:00:00.000Z',
				{
					uid: 'holiday-series',
					allDay: true,
					recurrenceId: '2025-03-24T00:00:00.000Z',
				}
			),
		],
	},

	'recurring-dst': {
		description:
			'#307: a daily 09:00 series in America/New_York (open with plugins=recurrence and tz=America/New_York) that starts before the 9 March 2025 change to daylight time, beside a one-off at 09:00 EDT. Every occurrence keeps its 09:00 wall-clock time across the change, as RFC 5545 requires of a DTSTART with a TZID, so every occurrence shares the row of a one-off at 09:00 EDT.',
		views: ['week'],
		config: { scrollTime: '08:00' },
		events: [
			event(
				'dst-series',
				'Morning check-in',
				// 09:00 EST
				'2025-03-06T14:00:00.000Z',
				'2025-03-06T14:30:00.000Z',
				{
					rrule: {
						freq: RRule.DAILY,
						dtstart: at('2025-03-06T14:00:00.000Z').toDate(),
					},
				}
			),
			event(
				'dst-reference',
				'One-off at nine',
				// 09:00 EDT
				'2025-03-12T13:00:00.000Z',
				'2025-03-12T13:30:00.000Z'
			),
		],
	},

	'dst-days': {
		description:
			'#311: a 09:00-10:00 booking in America/New_York (open with tz=America/New_York) on both 2025 clock-change days and an ordinary day. Rows and columns are labelled by clock hour, so each sits at hour 9, as FullCalendar places it; by elapsed time the 23-hour day put it at 8 and the 25-hour day at 10.',
		views: ['day'],
		config: { scrollTime: '00:00' },
		resources: TEAM,
		events: [
			// 09:00 EDT, the spring change day
			event(
				'spring',
				'Spring change',
				'2025-03-09T13:00:00.000Z',
				'2025-03-09T14:00:00.000Z',
				{ resourceId: 'r1' }
			),
			// 09:00 EDT, an ordinary day
			event(
				'ordinary',
				'Ordinary day',
				'2025-03-12T13:00:00.000Z',
				'2025-03-12T14:00:00.000Z',
				{ resourceId: 'r1' }
			),
			// 09:00 EST, the autumn change day
			event(
				'autumn',
				'Autumn change',
				'2025-11-02T14:00:00.000Z',
				'2025-11-02T15:00:00.000Z',
				{ resourceId: 'r1' }
			),
		],
	},

	'recurring-moved': {
		description:
			'#315: a daily stand-up for the week of 10 March 2025 (open with plugins=recurrence) whose Friday occurrence was moved to 11:00. Deleting Wednesday "and following" must take the moved Friday with the rest of the series.',
		views: ['week'],
		config: { scrollTime: '08:00' },
		events: [
			event(
				'moved-series',
				'Stand-up',
				'2025-03-10T09:00:00.000Z',
				'2025-03-10T09:30:00.000Z',
				{
					uid: 'moved-series',
					rrule: {
						freq: RRule.DAILY,
						count: 7,
						dtstart: at('2025-03-10T09:00:00.000Z').toDate(),
					},
				}
			),
			event(
				'moved-friday',
				'Rescheduled check-in',
				'2025-03-14T11:00:00.000Z',
				'2025-03-14T11:30:00.000Z',
				{ uid: 'moved-series', recurrenceId: '2025-03-14T09:00:00.000Z' }
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

	'numeric-resource-ids': {
		description:
			'Resource ids are `string | number`, so 0 is a real id. A truthy check read it as "no resource": the row for resource 0 drew every resource\'s events and a second now-line dot.',
		views: ['day', 'week', 'month'],
		config: { scrollTime: '08:00' },
		// Room Zero second: a resource that is not first must not draw the
		// now-line's dot, and a truthy check made 0 look like "no resource".
		resources: [
			{ id: 1, title: 'Room One' },
			{ id: 0, title: 'Room Zero' },
		],
		events: [
			event(
				'zero-1',
				'Room Zero booking',
				'2025-03-12T09:00:00.000Z',
				'2025-03-12T10:00:00.000Z',
				{ resourceId: 0 }
			),
			event(
				'one-1',
				'Room One booking',
				'2025-03-12T09:00:00.000Z',
				'2025-03-12T10:00:00.000Z',
				{ resourceId: 1 }
			),
		],
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
			// Off the hour on purpose: a timeline that drew whole hours showed this
			// 10:27-12:27 event as three hours long (reported before v3.1.0).
			event(
				'long-res-3',
				'Yoga class',
				'2025-03-12T10:27:00.000Z',
				'2025-03-12T12:27:00.000Z',
				{ resourceId: 'r3' }
			),
			// Five minutes: drawn at its exact length it would be a sliver.
			event(
				'long-res-4',
				'Quick check',
				'2025-03-12T14:00:00.000Z',
				'2025-03-12T14:05:00.000Z',
				{ resourceId: 'r3' }
			),
		],
	},

	'resource-hours': {
		description:
			'Two resources with different working hours: Room A is open 09:00-17:00, Room B all day. A resize stays on its own resource, so what is closed is judged on that resource at the hovered time, not on the lane the pointer happens to be over.',
		views: ['day', 'week'],
		config: { scrollTime: '08:00' },
		resources: [
			{
				id: 'r1',
				title: 'Room A',
				businessHours: { startTime: 9, endTime: 17 },
			},
			{ id: 'r2', title: 'Room B' },
		],
		events: [
			event(
				'hours-1',
				'Room A hold',
				'2025-03-12T10:00:00.000Z',
				'2025-03-12T11:00:00.000Z',
				{ resourceId: 'r1' }
			),
			event(
				'hours-2',
				'Room B hold',
				'2025-03-12T10:00:00.000Z',
				'2025-03-12T11:00:00.000Z',
				{ resourceId: 'r2' }
			),
		],
	},
	'visible-hours': {
		description:
			'3.3.4: events that start before, end after, or sit wholly outside a visible-hours window of 08:00-18:00, plus one inside it.',
		views: ['day', 'week'],
		events: [
			event(
				'vh-early',
				'Starts early',
				'2025-03-12T07:00:00.000Z',
				'2025-03-12T09:00:00.000Z'
			),
			event(
				'vh-before',
				'Too early',
				'2025-03-12T05:00:00.000Z',
				'2025-03-12T06:00:00.000Z'
			),
			event(
				'vh-midday',
				'Midday',
				'2025-03-12T12:00:00.000Z',
				'2025-03-12T13:00:00.000Z'
			),
			event(
				'vh-late',
				'Ends late',
				'2025-03-12T17:00:00.000Z',
				'2025-03-12T19:00:00.000Z'
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

	'async-events': {
		description:
			'One event per month from March to June, and one on the last day of March that the April grid shows too (30 March), so an `events` function can be seen to load, supersede, fail and retry.',
		views: ['month'],
		events: [
			event(
				'async-1',
				'March lunch',
				'2025-03-12T12:00:00.000Z',
				'2025-03-12T13:00:00.000Z'
			),
			event(
				'async-turn',
				'Month turn',
				'2025-03-31T10:00:00.000Z',
				'2025-03-31T11:00:00.000Z'
			),
			event(
				'async-2',
				'April review',
				'2025-04-15T10:00:00.000Z',
				'2025-04-15T11:00:00.000Z'
			),
			event(
				'async-3',
				'May kickoff',
				'2025-05-20T10:00:00.000Z',
				'2025-05-20T11:00:00.000Z'
			),
			event(
				'async-4',
				'June demo',
				'2025-06-25T10:00:00.000Z',
				'2025-06-25T11:00:00.000Z'
			),
		],
	},
} as const satisfies Record<string, Scenario>

export type ScenarioName = keyof typeof scenarios

export const isScenarioName = (value: string): value is ScenarioName =>
	Object.hasOwn(scenarios, value)
