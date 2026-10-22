import type { EventDelta, EventsChange } from '@ilamy/calendar'

/**
 * An onEventsChange call as the harness publishes it and the specs read it:
 * the action, its scope, the ids of its rows (#309) and how far the start and the end moved.
 */
export interface PublishedChange {
	action: EventsChange['action']
	scope: string | null
	event: string
	added: string[]
	updated: string[]
	deleted: string[]
	delta: EventDelta | null
	endDelta: EventDelta | null
}

/**
 * One call the calendar made to the harness's `events` function, as the
 * harness publishes it: the range it asked for and how the call ended.
 * `aborted` means the calendar signalled the call was superseded.
 */
export interface PublishedFetch {
	id: number
	start: string
	end: string
	status: 'pending' | 'done' | 'failed' | 'aborted'
}

/** The ISO strings of a stored series rule, as the specs read it (`until` and `dtstart` are `Date`s in the store). */
export interface PublishedRule {
	freq: number
	interval: number | null
	count: number | null
	until: string | null
	dtstart: string
	byweekday: string[] | null
	bymonthday: number | number[] | null
	bymonth: number | number[] | null
}

/** A stored event row as the harness publishes it in `event-state`: what the specs assert a mutation stored. */
export interface PublishedRow {
	id: string
	uid: string | null
	title: string
	start: string
	end: string
	allDay: boolean
	resourceId: string | number | null
	resourceIds: Array<string | number> | null
	recurrenceId: string | null
	exdates: string[] | null
	rrule: PublishedRule | null
}
