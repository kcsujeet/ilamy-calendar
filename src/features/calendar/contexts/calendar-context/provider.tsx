import type React from 'react'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import type { EventFormProps } from '@/components/event-form/event-form'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import type {
	CalendarClassesOverride,
	CellClickInfo,
	RenderCurrentTimeIndicatorProps,
} from '@/features/calendar/types'
import { useCalendarEngine } from '@/hooks/use-calendar-engine'
import type dayjs from '@/lib/configs/dayjs-config'
import { GAP_BETWEEN_ELEMENTS } from '@/lib/constants'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'
import { CalendarContext } from './context'

export interface CalendarProviderProps {
	children: ReactNode
	events?: CalendarEvent[]
	firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
	initialView?: CalendarView
	initialDate?: dayjs.Dayjs
	renderEvent?: (event: CalendarEvent) => ReactNode
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellClickInfo) => void
	onViewChange?: (view: CalendarView) => void
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onDateChange?: (date: dayjs.Dayjs) => void
	locale?: string
	timezone?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	disableDragAndDrop?: boolean
	dayMaxEvents: number
	eventSpacing?: number
	stickyViewHeader?: boolean
	viewHeaderClassName?: string
	headerComponent?: ReactNode // Optional custom header component
	headerClassName?: string // Optional custom header class
	businessHours?: BusinessHours | BusinessHours[]
	renderEventForm?: (props: EventFormProps) => ReactNode
	// Translation options - provide either translations object OR translator function
	translations?: Translations
	translator?: TranslatorFunction
	timeFormat?: TimeFormat
	classesOverride?: CalendarClassesOverride
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	hideNonBusinessHours?: boolean
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
	children,
	events = [],
	firstDayOfWeek = 0,
	initialView = 'month',
	initialDate,
	renderEvent,
	onEventClick,
	onCellClick,
	onViewChange,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	onDateChange,
	locale,
	timezone,
	disableCellClick,
	disableEventClick,
	disableDragAndDrop,
	dayMaxEvents,
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	stickyViewHeader = true,
	viewHeaderClassName = '',
	headerComponent,
	headerClassName,
	businessHours,
	renderEventForm,
	translations,
	translator,
	timeFormat = '12-hour',
	classesOverride,
	renderCurrentTimeIndicator,
	hideNonBusinessHours = false,
}) => {
	// Use the calendar engine
	const calendarEngine = useCalendarEngine({
		events,
		firstDayOfWeek,
		initialView,
		initialDate,
		businessHours,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onDateChange,
		onViewChange,
		locale,
		timezone,
		translations,
		translator,
	})

	const editEvent = useCallback(
		(event: CalendarEvent) => {
			calendarEngine.setSelectedEvent(event)
			calendarEngine.setIsEventFormOpen(true)
		},
		[calendarEngine]
	)

	// Custom handlers that call external callbacks
	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			if (disableEventClick) {
				return
			}
			if (onEventClick) {
				onEventClick(event)
			} else {
				editEvent(event)
			}
		},
		[disableEventClick, onEventClick, editEvent]
	)

	const handleDateClick = useCallback(
		(info: CellClickInfo) => {
			if (disableCellClick) {
				return
			}

			if (onCellClick) {
				onCellClick(info)
			} else {
				calendarEngine.openEventForm(info)
			}
		},
		[onCellClick, disableCellClick, calendarEngine]
	)

	// Create the context value
	const contextValue = useMemo(
		() => ({
			currentDate: calendarEngine.currentDate,
			view: calendarEngine.view,
			events: calendarEngine.events,
			rawEvents: calendarEngine.rawEvents,
			currentLocale: calendarEngine.currentLocale,
			isEventFormOpen: calendarEngine.isEventFormOpen,
			selectedEvent: calendarEngine.selectedEvent,
			selectedDate: calendarEngine.selectedDate,
			firstDayOfWeek: calendarEngine.firstDayOfWeek,
			setCurrentDate: calendarEngine.setCurrentDate,
			selectDate: calendarEngine.selectDate,
			setView: calendarEngine.setView,
			nextPeriod: calendarEngine.nextPeriod,
			prevPeriod: calendarEngine.prevPeriod,
			today: calendarEngine.today,
			addEvent: calendarEngine.addEvent,
			updateEvent: calendarEngine.updateEvent,
			updateRecurringEvent: calendarEngine.updateRecurringEvent,
			deleteEvent: calendarEngine.deleteEvent,
			deleteRecurringEvent: calendarEngine.deleteRecurringEvent,
			openEventForm: calendarEngine.openEventForm,
			closeEventForm: calendarEngine.closeEventForm,
			getEventsForDateRange: calendarEngine.getEventsForDateRange,
			findParentRecurringEvent: calendarEngine.findParentRecurringEvent,
			renderEvent,
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			renderEventForm,
			t: calendarEngine.t,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			hideNonBusinessHours,
		}),
		[
			calendarEngine,
			renderEvent,
			handleEventClick,
			handleDateClick,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			renderEventForm,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			hideNonBusinessHours,
		]
	)

	return (
		<CalendarContext.Provider value={contextValue}>
			{children}
		</CalendarContext.Provider>
	)
}
