import type {
	BusinessHours,
	CalendarConstraint,
	CalendarEvent,
	DateRange,
	IlamyPlugin,
	IsoDateString,
	PluginView,
	PublicDateInput,
	Resource,
} from '@ilamy/types'
import { useRequiredContext } from '@ilamy/ui/hooks/use-required-context'
import type { ReactNode } from 'react'
import type { TranslatorFunction } from '@/config/translations/types'
import {
	CalendarContext,
	type CalendarContextType,
} from '@/features/calendar/stores/calendar-context/calendar-context'
import type {
	EventSegment,
	OpenEventFormInput,
	RenderCurrentTimeIndicatorProps,
} from '@/features/calendar/types'
import type { CalendarView, TimeFormat } from '@/types'

const EMPTY_RESOURCES: Resource[] = []

type SmartCalendarContextType = CalendarContextType

/**
 * Public calendar API surface exposed by `useIlamyCalendarContext()` and `ref.current`.
 * Every date field is a canonical ISO 8601 string with offset; navigation/query
 * inputs accept either an ISO string or a `Date`.
 */
export interface IlamyCalendarApi {
	readonly currentDate: IsoDateString
	readonly currentRange: DateRange
	readonly view: CalendarView
	readonly events: CalendarEvent[]
	readonly rawEvents: CalendarEvent[]
	readonly refetchEvents: () => void
	readonly scrollToTime: (time: string) => void
	readonly refetchResources: () => void
	readonly isEventFormOpen: boolean
	readonly selectedEvent: CalendarEvent | null
	readonly selectedDate: IsoDateString | null
	readonly firstDayOfWeek: number
	readonly resources: Resource[]
	readonly hasResourceAxis: boolean
	readonly orientation: 'horizontal' | 'vertical'
	readonly setCurrentDate: (date: PublicDateInput) => void
	readonly selectDate: (date: PublicDateInput) => void
	readonly setView: (view: CalendarView, date?: PublicDateInput) => void
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
	readonly onEventClick: (event: CalendarEvent) => void
	readonly renderEvent?: (
		event: CalendarEvent,
		segment: EventSegment
	) => ReactNode
	readonly renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	readonly getEventsForResource: (
		resourceId: string | number
	) => CalendarEvent[]
	readonly businessHours?: BusinessHours | BusinessHours[]
	readonly eventConstraint?: CalendarConstraint
	readonly selectConstraint?: CalendarConstraint
	readonly t: TranslatorFunction
	readonly timeFormat: TimeFormat
	readonly timezone?: string
	readonly currentLocale: string
	readonly getEventsForDateRange: (
		start: PublicDateInput,
		end: PublicDateInput
	) => CalendarEvent[]
	readonly applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	readonly applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
	readonly getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	readonly renderSlot: (slotName: string, context: unknown) => ReactNode[]
	readonly collect: (point: string, context: unknown) => unknown[]
	readonly getViews: () => PluginView[]
}

export function useSmartCalendarContext(): SmartCalendarContextType
export function useSmartCalendarContext<T>(
	selector: (context: SmartCalendarContextType) => T
): T
export function useSmartCalendarContext<T>(
	selector?: (context: SmartCalendarContextType) => T
): T | SmartCalendarContextType {
	const context = useRequiredContext(
		CalendarContext,
		'useSmartCalendarContext',
		'CalendarProvider'
	)

	return selector ? selector(context) : context
}

export function useIlamyCalendarContext(): IlamyCalendarApi {
	const context = useSmartCalendarContext()

	return {
		currentDate: context.currentDate,
		currentRange: context.currentRange,
		view: context.view,
		events: context.events,
		rawEvents: context.rawEvents,
		refetchEvents: context.refetchEvents,
		scrollToTime: context.scrollToTime,
		refetchResources: context.refetchResources,
		isEventFormOpen: context.isEventFormOpen,
		selectedEvent: context.selectedEvent,
		selectedDate: context.selectedDate,
		firstDayOfWeek: context.firstDayOfWeek,
		resources: context.resources ?? EMPTY_RESOURCES,
		hasResourceAxis: context.hasResourceAxis,
		orientation: context.orientation,
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
		renderEvent: context.renderEvent,
		renderCurrentTimeIndicator: context.renderCurrentTimeIndicator,
		getEventsForResource: context.getEventsForResource,
		businessHours: context.businessHours,
		eventConstraint: context.eventConstraint,
		selectConstraint: context.selectConstraint,
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
