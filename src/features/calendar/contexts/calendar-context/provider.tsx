import type React from 'react'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useRef } from 'react'
import {
	AllEventDialog,
	type AllEventsDialogHandle,
} from '@/components/all-events-dialog'
import type { EventFormProps } from '@/components/event-form/event-form'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import type {
	CalendarClassesOverride,
	CellClickInfo,
	DateRange,
	RenderCurrentTimeIndicatorProps,
} from '@/features/calendar/types'
import { useCalendarEngine } from '@/hooks/use-calendar-engine'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { GAP_BETWEEN_ELEMENTS } from '@/lib/constants'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'
import { CalendarContext } from './context'

export interface CalendarProviderProps {
	children: ReactNode
	events?: CalendarEvent[]
	firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
	initialView?: CalendarView
	initialDate?: Dayjs
	renderEvent?: (event: CalendarEvent) => ReactNode
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellClickInfo) => void
	onViewChange?: (view: CalendarView) => void
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onDateChange?: (date: Dayjs, range: DateRange) => void
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
	hiddenDays?: Set<number>
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
	hiddenDays,
}) => {
	// Use the calendar engine — destructure to get stable references for useMemo deps
	const {
		currentDate,
		view,
		events: processedEvents,
		rawEvents,
		currentLocale,
		isEventFormOpen,
		selectedEvent,
		selectedDate,
		firstDayOfWeek: engineFirstDayOfWeek,
		setCurrentDate,
		selectDate,
		setView,
		nextPeriod,
		prevPeriod,
		today,
		addEvent,
		updateEvent,
		updateRecurringEvent,
		deleteEvent,
		deleteRecurringEvent,
		openEventForm,
		closeEventForm,
		setSelectedEvent,
		setIsEventFormOpen,
		getEventsForDateRange,
		findParentRecurringEvent,
		t,
	} = useCalendarEngine({
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

	// All-events dialog — ref stays internal to provider, callbacks are stable
	const allEventsDialogRef = useRef<AllEventsDialogHandle>(null)
	const openAllEventsDialog = useCallback(
		(day: Dayjs, events: CalendarEvent[]) => {
			allEventsDialogRef.current?.open(day, events)
		},
		[]
	)
	const closeAllEventsDialog = useCallback(() => {
		allEventsDialogRef.current?.close()
	}, [])

	const editEvent = useCallback(
		(event: CalendarEvent) => {
			setSelectedEvent(event)
			setIsEventFormOpen(true)
		},
		[setSelectedEvent, setIsEventFormOpen]
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
				openEventForm(info)
			}
		},
		[onCellClick, disableCellClick, openEventForm]
	)

	// Create the context value
	const contextValue = useMemo(
		() => ({
			currentDate,
			view,
			events: processedEvents,
			rawEvents,
			currentLocale,
			isEventFormOpen,
			selectedEvent,
			selectedDate,
			firstDayOfWeek: engineFirstDayOfWeek,
			setCurrentDate,
			selectDate,
			setView,
			nextPeriod,
			prevPeriod,
			today,
			addEvent,
			updateEvent,
			updateRecurringEvent,
			deleteEvent,
			deleteRecurringEvent,
			openEventForm,
			closeEventForm,
			getEventsForDateRange,
			findParentRecurringEvent,
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
			t,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			hideNonBusinessHours,
			hiddenDays,
			openAllEventsDialog,
			closeAllEventsDialog,
		}),
		[
			openAllEventsDialog,
			closeAllEventsDialog,
			currentDate,
			view,
			processedEvents,
			rawEvents,
			currentLocale,
			isEventFormOpen,
			selectedEvent,
			selectedDate,
			engineFirstDayOfWeek,
			setCurrentDate,
			selectDate,
			setView,
			nextPeriod,
			prevPeriod,
			today,
			addEvent,
			updateEvent,
			updateRecurringEvent,
			deleteEvent,
			deleteRecurringEvent,
			openEventForm,
			closeEventForm,
			getEventsForDateRange,
			findParentRecurringEvent,
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
			t,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			hideNonBusinessHours,
			hiddenDays,
		]
	)

	return (
		<CalendarContext.Provider value={contextValue}>
			{children}
			<AllEventDialog ref={allEventsDialogRef} />
		</CalendarContext.Provider>
	)
}
