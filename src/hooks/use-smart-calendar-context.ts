import { useContext } from 'react'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import { CalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { ResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { ResourceCalendarContextType } from '@/features/resource-calendar/contexts/resource-calendar-context/context'
import type { Resource } from '@/features/resource-calendar/types'
import type dayjs from '@/lib/configs/dayjs-config'
import type { CalendarView } from '@/types'

/**
 * Full internal context type used by library components.
 */
export type SmartCalendarContextType = ResourceCalendarContextType

/**
 * Publicly exposed calendar context properties.
 */
export interface UseIlamyCalendarContextReturn {
	readonly currentDate: dayjs.Dayjs
	readonly view: CalendarView
	readonly events: CalendarEvent[]
	readonly isEventFormOpen: boolean
	readonly selectedEvent: CalendarEvent | null
	readonly selectedDate: dayjs.Dayjs | null
	readonly firstDayOfWeek: number
	readonly resources: Resource[]
	readonly setCurrentDate: (date: dayjs.Dayjs) => void
	readonly selectDate: (date: dayjs.Dayjs) => void
	readonly setView: (view: CalendarView) => void
	readonly nextPeriod: () => void
	readonly prevPeriod: () => void
	readonly today: () => void
	readonly addEvent: (event: CalendarEvent) => void
	readonly updateEvent: (
		eventId: string | number,
		event: Partial<CalendarEvent>
	) => void
	readonly deleteEvent: (eventId: string | number) => void
	readonly openEventForm: (eventData?: Partial<CalendarEvent>) => void
	readonly closeEventForm: () => void
	readonly getEventsForResource: (
		resourceId: string | number
	) => CalendarEvent[]
	readonly businessHours?: BusinessHours | BusinessHours[]
}

/**
 * Internal hook that returns the full context.
 * Used by internal views, headers, and grid components.
 */
export function useSmartCalendarContext(): SmartCalendarContextType
export function useSmartCalendarContext<T>(
	selector: (context: SmartCalendarContextType) => T
): T
export function useSmartCalendarContext<T>(
	selector?: (context: SmartCalendarContextType) => T
): T | SmartCalendarContextType {
	const resourceContext = useContext(ResourceCalendarContext)
	const regularContext = useContext(CalendarContext)

	// In regular calendars, resource-specific fields will be undefined.
	const context = (resourceContext ||
		regularContext) as SmartCalendarContextType

	if (!context) {
		throw new Error(
			'useSmartCalendarContext must be used within a CalendarProvider or ResourceCalendarProvider'
		)
	}

	return selector ? selector(context) : context
}

/**
 * Public hook exported for library users.
 * Returns a limited set of commonly used properties and methods.
 */
export function useIlamyCalendarContext(): UseIlamyCalendarContextReturn {
	const context = useSmartCalendarContext()

	return {
		currentDate: context.currentDate,
		view: context.view,
		events: context.events,
		isEventFormOpen: context.isEventFormOpen,
		selectedEvent: context.selectedEvent,
		selectedDate: context.selectedDate,
		firstDayOfWeek: context.firstDayOfWeek,
		resources: context.resources || [],
		setCurrentDate: context.setCurrentDate,
		selectDate: context.selectDate,
		setView: context.setView,
		nextPeriod: context.nextPeriod,
		prevPeriod: context.prevPeriod,
		today: context.today,
		addEvent: context.addEvent,
		updateEvent: context.updateEvent,
		deleteEvent: context.deleteEvent,
		openEventForm: context.openEventForm,
		closeEventForm: context.closeEventForm,
		getEventsForResource: context.getEventsForResource,
		businessHours: context.businessHours,
	}
}
