import type {
	CalendarEvent,
	CellInfo,
	IlamyPlugin,
	IsoDateString,
	Resource,
} from '@ilamy/calendar'
import { type AgendaWindow, agendaPlugin } from '@ilamy/calendar/plugins/agenda'
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'
import { icalPlugin } from '@ilamy/calendar/plugins/ical'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'
import { yearPlugin } from '@ilamy/calendar/plugins/year'
import { dummyEvents } from '../lib/seed'

export interface DemoPluginOptions {
	agendaWindow: AgendaWindow
	showExportButton: boolean
	enableRecurrencePlugin: boolean
	enableAgendaPlugin: boolean
	enableDragToCreatePlugin: boolean
	enableYearPlugin: boolean
	enableIcalPlugin: boolean
}

// Recurrence, agenda, drag-to-create, year view, and iCal export are opt-in
// plugins in v4.0. Built from the active settings; memoize the result in the
// caller to keep the array reference stable.
export const createDemoPlugins = ({
	agendaWindow,
	showExportButton,
	enableRecurrencePlugin,
	enableAgendaPlugin,
	enableDragToCreatePlugin,
	enableYearPlugin,
	enableIcalPlugin,
}: DemoPluginOptions): IlamyPlugin[] => {
	const plugins: IlamyPlugin[] = []
	if (enableRecurrencePlugin) {
		plugins.push(recurrencePlugin())
	}
	if (enableAgendaPlugin) {
		plugins.push(agendaPlugin({ window: agendaWindow }))
	}
	if (enableDragToCreatePlugin) {
		plugins.push(dragToCreatePlugin())
	}
	if (enableYearPlugin) {
		plugins.push(yearPlugin())
	}
	if (enableIcalPlugin) {
		plugins.push(icalPlugin({ showToolbarButton: showExportButton }))
	}
	return plugins
}

// Event handlers kept module-level to avoid recreation across renders.
export const handleEventClick = (event: CalendarEvent) => {
	alert(`Event clicked: ${event.title}`)
}

export const handleDateClick = (info: CellInfo) => {
	alert(JSON.stringify(info))
}

export const handleMoreEventsClick = (
	day: IsoDateString,
	events: CalendarEvent[]
) => {
	const formattedDay = new Intl.DateTimeFormat(undefined, {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(day))
	alert(`${events.length} events on ${formattedDay}`)
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
