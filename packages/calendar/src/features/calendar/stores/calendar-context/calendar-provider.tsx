import type { CalendarEvent } from '@ilamy/types'
import {
	isSupportedSlotDuration,
	resolveSlotDuration,
} from '@ilamy/utils/helpers'
import type { FC, ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/config/constants'
import type { CalendarEventsFetcher } from '@/features/calendar/hooks/calendar-data/use-events-fetcher'
import { useCalendarEngine } from '@/features/calendar/hooks/use-calendar-engine'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { useLatestHandler } from '@/hooks/use-latest-handler'
import { composePluginProviders } from '@/lib/plugins/compose-plugin-providers'
import { CalendarCellProvider } from '../calendar-cell-context/calendar-cell-provider'
import { CalendarContext, type CalendarContextType } from './calendar-context'

/** Says once, per value, that a slot size cannot be drawn and an hour is used. */
const useWarnAboutSlotDuration = (requestedSlotDuration: number) => {
	useEffect(() => {
		if (isSupportedSlotDuration(requestedSlotDuration)) {
			return
		}
		console.warn(
			`[ilamy] slotDuration={${requestedSlotDuration}} is not a divisor of 60 minutes; using 60.`
		)
	}, [requestedSlotDuration])
}

/**
 * The public props, with the three the provider receives already resolved:
 * `events` as stored events, `firstDayOfWeek` as a day number and
 * `hiddenDays` as a set of day numbers.
 */
export type CalendarProviderProps = Omit<
	IlamyCalendarProps,
	'events' | 'firstDayOfWeek' | 'hiddenDays'
> & {
	children: ReactNode
	events?: CalendarEvent[]
	/** Loads the events for the visible range; used instead of `events` when set. */
	eventsFetcher?: CalendarEventsFetcher
	firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
	hiddenDays?: Set<number>
}

// Module constant, not a per-render `?? []`: keeps the engine's event store
// from re-syncing (and the context value from churning) when `events` is absent.
const EMPTY_EVENTS: CalendarEvent[] = []

/**
 * Builds the shared context value: engine slices (including the resource
 * axis) + presentation props. The single assembly point for the ONE provider.
 */
const useCalendarContextValue = (
	props: Omit<CalendarProviderProps, 'children'>
): CalendarContextType => {
	const {
		events = EMPTY_EVENTS,
		eventsFetcher,
		lazyFetching,
		loading,
		onEventsError,
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate,
		renderEvent,
		onEventClick,
		onCellClick,
		isCellDisabled,
		getCellClassName,
		onViewChange,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
		onDateChange,
		locale,
		timezone,
		disableCellClick,
		disableEventClick,
		disableDragAndDrop,
		editable,
		eventStartEditable,
		eventDurationEditable,
		eventResizableFromStart,
		dayMaxEvents,
		eventSpacing = GAP_BETWEEN_ELEMENTS,
		eventHeight = EVENT_BAR_HEIGHT,
		stickyViewHeader = true,
		viewHeaderClassName = '',
		headerComponent,
		headerClassName,
		businessHours,
		renderEventForm,
		translations,
		translator,
		timeFormat: explicitTimeFormat,
		slotHeaderFormat,
		eventTimeFormat,
		displayEventTime,
		displayEventEnd,
		dayHeaderFormat,
		titleFormat,
		classesOverride,
		renderCurrentTimeIndicator,
		renderHour,
		hideNonBusinessHours = false,
		slotMinTime,
		slotMaxTime,
		hideExportButton = false,
		hiddenDays,
		slotDuration: requestedSlotDuration = 60,
		snapDuration,
		scrollTime,
		scrollToNow,
		allDaySlot = true,
		nowIndicator = true,
		weekNumbers,
		weekNumberCalculation = 'local',
		plugins,
		resources,
		renderResource,
		orientation,
		weekViewGranularity,
	} = props

	const slotDuration = resolveSlotDuration(requestedSlotDuration)
	useWarnAboutSlotDuration(requestedSlotDuration)

	// What every label falls back to; only a consumer-passed value may override
	// a locale's own 12/24 hour choice (`explicitTimeFormat`).
	const timeFormat = explicitTimeFormat ?? '12-hour'

	// Called on a click, never while rendering: see useLatestHandler.
	const onMoreEventsClick = useLatestHandler(props.onMoreEventsClick)
	// Called while a drag hovers a placement, never while rendering.
	const eventAllow = useLatestHandler(props.eventAllow)

	const engine = useCalendarEngine({
		events,
		eventsFetcher,
		lazyFetching,
		loading,
		onEventsError,
		firstDayOfWeek,
		initialView,
		initialDate,
		dayMaxEvents,
		businessHours,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
		onDateChange,
		onViewChange,
		locale,
		timezone,
		translations,
		translator,
		plugins,
		onEventClick,
		onCellClick,
		disableEventClick,
		disableCellClick,
		resources,
		orientation,
		weekViewGranularity,
		hiddenDays,
	})

	return useMemo(() => {
		// The engine returns the context core plus the two click handlers; the
		// handlers are destructured OFF so the spread below keeps the exact v1
		// context shape (they re-enter as onEventClick / onCellClick). Fields the
		// engine already provides (businessHours, dayMaxEvents, …) ride the
		// spread — only presentation props are added here.
		const { handleEventClick, handleDateClick, ...calendarEngine } = engine
		return {
			...calendarEngine,
			renderEvent,
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,
			isCellDisabled,
			getCellClassName,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			editable,
			eventStartEditable,
			eventDurationEditable,
			eventResizableFromStart,
			eventAllow,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			renderEventForm,
			onMoreEventsClick,
			timeFormat,
			explicitTimeFormat,
			slotHeaderFormat,
			eventTimeFormat,
			displayEventTime,
			displayEventEnd,
			dayHeaderFormat,
			titleFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			renderHour,
			hideNonBusinessHours,
			slotMinTime,
			slotMaxTime,
			hideExportButton,
			hiddenDays,
			slotDuration,
			snapDuration,
			scrollTime,
			scrollToNow,
			allDaySlot,
			nowIndicator,
			weekNumbers,
			weekNumberCalculation,
			renderResource,
		}
	}, [
		engine,
		renderEvent,
		renderResource,
		isCellDisabled,
		getCellClassName,
		locale,
		timezone,
		disableCellClick,
		disableEventClick,
		disableDragAndDrop,
		editable,
		eventStartEditable,
		eventDurationEditable,
		eventResizableFromStart,
		eventAllow,
		eventSpacing,
		eventHeight,
		stickyViewHeader,
		viewHeaderClassName,
		headerComponent,
		headerClassName,
		renderEventForm,
		onMoreEventsClick,
		timeFormat,
		explicitTimeFormat,
		slotHeaderFormat,
		eventTimeFormat,
		displayEventTime,
		displayEventEnd,
		dayHeaderFormat,
		titleFormat,
		classesOverride,
		renderCurrentTimeIndicator,
		renderHour,
		hideNonBusinessHours,
		slotMinTime,
		slotMaxTime,
		hideExportButton,
		hiddenDays,
		slotDuration,
		snapDuration,
		scrollTime,
		scrollToNow,
		allDaySlot,
		nowIndicator,
		weekNumbers,
		weekNumberCalculation,
	])
}

export const CalendarProvider: FC<CalendarProviderProps> = ({
	children,
	...props
}) => {
	const contextValue = useCalendarContextValue(props)

	const wrappedChildren = composePluginProviders(
		contextValue.getProviders(),
		children
	)

	return (
		<CalendarContext.Provider value={contextValue}>
			<CalendarCellProvider>{wrappedChildren}</CalendarCellProvider>
		</CalendarContext.Provider>
	)
}
