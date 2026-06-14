import type { CalendarEvent, CellInfo, Resource } from '@ilamy/calendar'
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'
import { dummyEvents } from '@/lib/seed'

// Recurrence and agenda are opt-in plugins. The seed data has recurring events,
// so recurrence expands them; agenda adds the upcoming-events list view. Kept
// module-level so the array reference is stable across renders.
export const demoPlugins = [recurrencePlugin(), agendaPlugin()]

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
	},
	{
		id: 'room-b',
		title: 'Conference Room B',
		color: '#059669',
		backgroundColor: '#d1fae5',
	},
	{
		id: 'room-c',
		title: 'Meeting Room C',
		color: '#7c2d12',
		backgroundColor: '#fed7aa',
	},
	{
		id: 'equipment-1',
		title: 'Projector #1',
		color: '#7c3aed',
		backgroundColor: '#ede9fe',
	},
	{
		id: 'equipment-2',
		title: 'Laptop Cart',
		color: '#b45309',
		backgroundColor: '#fef3c7',
	},
	{
		id: 'vehicle-1',
		title: 'Company Van',
		color: '#d97706',
		backgroundColor: '#ffedd5',
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
