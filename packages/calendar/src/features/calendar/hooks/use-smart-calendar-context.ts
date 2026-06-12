import type React from 'react'
import { useContext } from 'react'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import {
	CalendarContext,
	type CalendarContextType,
} from '@/features/calendar/contexts/calendar-context/context'
import type { OpenEventFormInput } from '@/features/calendar/types'
import type { IlamyPlugin, PluginView } from '@/features/plugins/lib/types'
import { ResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { ResourceCalendarContextType } from '@/features/resource-calendar/contexts/resource-calendar-context/context'
import type { Resource } from '@/features/resource-calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import type { TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'

/**
 * Resource-calendar additions, optional on the smart context: a regular
 * calendar provides none of them, and the type now says so instead of the old
 * unsafe cast pretending they are always present.
 */
type ResourceContextFields = Pick<
	ResourceCalendarContextType,
	| 'resources'
	| 'getEventsForResource'
	| 'getEventsForResources'
	| 'getResourceById'
	| 'isEventCrossResource'
	| 'getEventResourceIds'
	| 'renderResource'
	| 'orientation'
	| 'weekViewGranularity'
>

/**
 * Full internal context type used by library components.
 */
export type SmartCalendarContextType = CalendarContextType &
	Partial<ResourceContextFields>

/**
 * The public calendar API surface exposed by useIlamyCalendarContext() — for consumers and plugin
 * components. The full internal context is intentionally not exported.
 */
export interface IlamyCalendarApi {
	readonly currentDate: Dayjs
	readonly view: CalendarView
	readonly events: CalendarEvent[]
	readonly rawEvents: CalendarEvent[]
	readonly isEventFormOpen: boolean
	readonly selectedEvent: CalendarEvent | null
	readonly selectedDate: Dayjs | null
	readonly firstDayOfWeek: number
	readonly resources: Resource[]
	readonly setCurrentDate: (date: Dayjs) => void
	readonly selectDate: (date: Dayjs) => void
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
	readonly openEventForm: (eventData?: OpenEventFormInput) => void
	readonly closeEventForm: () => void
	/**
	 * Only present on resource calendars (`IlamyResourceCalendar`); `undefined`
	 * on a regular calendar. Call as `getEventsForResource?.(id) ?? []`.
	 */
	readonly getEventsForResource?: (
		resourceId: string | number
	) => CalendarEvent[]
	readonly businessHours?: BusinessHours | BusinessHours[]
	readonly t: TranslatorFunction
	readonly timeFormat: TimeFormat
	readonly timezone?: string
	readonly currentLocale: string
	readonly getEventsForDateRange: (start: Dayjs, end: Dayjs) => CalendarEvent[]
	readonly applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	readonly applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
	readonly getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	readonly renderSlot: (slotName: string, context: unknown) => React.ReactNode[]
	readonly collect: (point: string, context: unknown) => unknown[]
	readonly getViews: () => PluginView[]
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

	// ResourceCalendarContextType extends CalendarContextType, so both context
	// values are assignable to the smart type without a cast; in regular
	// calendars the resource-specific fields are honestly undefined.
	const context = resourceContext ?? regularContext

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
export function useIlamyCalendarContext(): IlamyCalendarApi {
	const context = useSmartCalendarContext()

	return {
		currentDate: context.currentDate,
		view: context.view,
		events: context.events,
		rawEvents: context.rawEvents,
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
		t: context.t,
		timeFormat: context.timeFormat,
		timezone: context.timezone,
		currentLocale: context.currentLocale ?? '',
		getEventsForDateRange: context.getEventsForDateRange,
		applyScopedEdit: context.applyScopedEdit,
		applyScopedDelete: context.applyScopedDelete,
		getEventManager: context.getEventManager,
		renderSlot: context.renderSlot,
		collect: context.collect,
		getViews: context.getViews,
	}
}
