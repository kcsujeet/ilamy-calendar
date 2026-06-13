import type {
	BusinessHours,
	CalendarEvent,
	IlamyPlugin,
	PluginView,
	Resource,
} from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useContext } from 'react'
import {
	CalendarContext,
	type CalendarContextType,
} from '@/features/calendar/contexts/calendar-context/context'
import type { OpenEventFormInput } from '@/features/calendar/types'
import type { TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'

// Module constant, not a per-call `|| []`: keeps the public API's `resources`
// identity stable on calendars without a resource axis.
const EMPTY_RESOURCES: Resource[] = []

/**
 * Full internal context type used by library components. Since the unified
 * provider carries the resource axis, this is simply the calendar context:
 * resource utilities are always defined; `resources` is honestly optional.
 */
type SmartCalendarContextType = CalendarContextType

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
	 * Handle a click on an existing event: runs the consumer's `onEventClick`
	 * callback if provided, otherwise opens the event for editing. Lets plugin
	 * views (e.g. agenda) handle event clicks identically to the built-in views.
	 */
	readonly onEventClick: (event: CalendarEvent) => void
	/**
	 * Events whose resource membership (`resourceIds`, falling back to
	 * `resourceId`) contains the given resource. On a calendar without
	 * resources this simply filters by the events' own resource fields.
	 */
	readonly getEventsForResource: (
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
	const context = useContext(CalendarContext)

	if (!context) {
		throw new Error(
			'useSmartCalendarContext must be used within a CalendarProvider'
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
		resources: context.resources ?? EMPTY_RESOURCES,
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
		onEventClick: context.onEventClick,
		getEventsForResource: context.getEventsForResource,
		businessHours: context.businessHours,
		t: context.t,
		timeFormat: context.timeFormat,
		timezone: context.timezone,
		currentLocale: context.currentLocale,
		getEventsForDateRange: context.getEventsForDateRange,
		applyScopedEdit: context.applyScopedEdit,
		applyScopedDelete: context.applyScopedDelete,
		getEventManager: context.getEventManager,
		renderSlot: context.renderSlot,
		collect: context.collect,
		getViews: context.getViews,
	}
}
