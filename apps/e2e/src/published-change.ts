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
