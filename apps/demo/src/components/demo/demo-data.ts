import type { CalendarEvent, CellInfo, Resource } from '@ilamy/calendar'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'
import { dummyEvents } from '@/lib/seed'

// Recurrence is opt-in — the seed data has recurring events, so the demo
// registers the recurrence plugin to expand them. Kept module-level so the
// array reference is stable across renders.
export const demoPlugins = [recurrencePlugin()]

// Event handlers kept module-level to avoid recreation across renders.
export const handleEventClick = (event: CalendarEvent) => {
	alert(`Event clicked: ${event.title}`)
}

export const handleDateClick = (info: CellInfo) => {
	alert(JSON.stringify(info))
}

export const handleEventAdd = (event: CalendarEvent) => {
	alert(`Event added: ${event.title}`)
}

export const handleEventUpdate = (event: CalendarEvent) => {
	alert(`Event updated: ${event.title}`)
}

export const handleEventDelete = (event: CalendarEvent) => {
	alert(`Event deleted: ${event.title}`)
}

// Demo resources
export const demoResources: Resource[] = [
	{
		id: 'room-a',
		title: 'Conference Room A',
		color: '#1e40af',
		backgroundColor: '#dbeafe',
		position: 1,
	},
	{
		id: 'room-b',
		title: 'Conference Room B',
		color: '#059669',
		backgroundColor: '#d1fae5',
		position: 2,
	},
	{
		id: 'room-c',
		title: 'Meeting Room C',
		color: '#7c2d12',
		backgroundColor: '#fed7aa',
		position: 3,
	},
	{
		id: 'equipment-1',
		title: 'Projector #1',
		color: '#7c3aed',
		backgroundColor: '#ede9fe',
		position: 4,
	},
	{
		id: 'equipment-2',
		title: 'Laptop Cart',
		color: '#b45309',
		backgroundColor: '#fef3c7',
		position: 5,
	},
	{
		id: 'vehicle-1',
		title: 'Company Van',
		color: '#d97706',
		backgroundColor: '#ffedd5',
		position: 6,
	},
]

// Convert regular events to resource events
export const createResourceEvents = (): CalendarEvent[] => {
	const resourceIds = demoResources.map((r) => r.id)

	return dummyEvents.map((event, index) => {
		const resourceEvent: CalendarEvent = { ...event }

		// Assign events to resources
		if (index % 4 === 0) {
			// Cross-resource event
			resourceEvent.resourceIds = resourceIds.slice(0, 2)
		} else {
			// Single resource event
			resourceEvent.resourceId = resourceIds.at(index % resourceIds.length)
		}

		return resourceEvent
	})
}

// Resource event handlers
export const handleResourceEventClick = (event: CalendarEvent) => {
	let resources = event.resourceId
	if (event.resourceIds) {
		resources = event.resourceIds.join(', ')
	}
	alert(`Resource Event clicked: ${event.title} (Resources: ${resources})`)
}
