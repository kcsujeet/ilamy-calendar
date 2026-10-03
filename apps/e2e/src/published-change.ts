import type { EventsChange } from '@ilamy/calendar'

/**
 * An onEventsChange call as the harness publishes it and the specs read it:
 * the action, its scope and the ids of its rows (#309).
 */
export interface PublishedChange {
	action: EventsChange['action']
	scope: string | null
	event: string
	added: string[]
	updated: string[]
	deleted: string[]
}
