import type {
	CalendarEvent,
	CellInfo,
	IlamyPlugin,
	Resource,
} from '@ilamy/calendar'
import { type AgendaWindow, agendaPlugin } from '@ilamy/calendar/plugins/agenda'
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'
import { dummyEvents } from '../lib/seed'

// Recurrence, agenda, and drag-to-create are opt-in plugins. The seed data has
// recurring events, so recurrence expands them; agenda adds the upcoming-events
// list view scoped to `agendaWindow`; drag-to-create lets you drag across empty
// week/day cells to open the event form preselected with that range. Built
// per-window so the demo can change the window live; memoize the result in the
// caller to keep the array reference stable.
export const createDemoPlugins = (
	agendaWindow: AgendaWindow
): IlamyPlugin[] => [
	recurrencePlugin(),
	agendaPlugin({ window: agendaWindow }),
	dragToCreatePlugin(),
]

// Event handlers kept module-level to avoid recreation across renders.
export const handleEventClick = (event: CalendarEvent) => {
	alert(`Event clicked: ${event.title}`)
}

export const handleDateClick = (info: CellInfo) => {
	alert(JSON.stringify(info))
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

// Convert regular events to resource events. Takes the current events so the
// resource view re-derives when the playground's event state changes.
export const createResourceEvents = (
	events: CalendarEvent[] = dummyEvents
): CalendarEvent[] => {
	const resourceIds = demoResources.map((r) => r.id)

	return events.map((event, index) => {
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
