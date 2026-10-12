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
