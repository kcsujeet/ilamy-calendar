import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useCalendarEngine } from '@/features/calendar/hooks/use-calendar-engine'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { composePluginProviders } from '@/features/plugins/lib/compose-plugin-providers'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/lib/constants'
import { CalendarContext, type CalendarContextType } from './context'

export interface CalendarProviderProps
	extends Omit<
		IlamyCalendarProps,
		'events' | 'firstDayOfWeek' | 'initialDate' | 'hiddenDays'
	> {
	children: ReactNode
	events?: CalendarEvent[]
	firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
	initialDate?: Dayjs
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
		onDateChange,
		locale,
		timezone,
		disableCellClick,
		disableEventClick,
		disableDragAndDrop,
		dragSnapInterval,
		showDragTimeIndicator = true,
		renderDragTimeIndicator,
		dayMaxEvents,
		eventSpacing = GAP_BETWEEN_ELEMENTS,
		eventHeight = EVENT_BAR_HEIGHT,
		stickyViewHeader = true,
		viewHeaderClassName = '',
		headerComponent,
		headerClassName,
		businessHours,
		renderEventForm,
		onMoreEventsClick,
		translations,
		translator,
		timeFormat = '12-hour',
		classesOverride,
		renderCurrentTimeIndicator,
		renderHour,
		hideNonBusinessHours = false,
		hideExportButton = false,
		hiddenDays,
		slotDuration = 60,
		scrollTime,
		plugins,
		resources,
		renderResource,
		orientation,
		weekViewGranularity,
	} = props
	const resolvedDragSnapInterval = dragSnapInterval ?? slotDuration

	const engine = useCalendarEngine({
		events,
		firstDayOfWeek,
		initialView,
		initialDate,
		dayMaxEvents,
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
		plugins,
		onEventClick,
		onCellClick,
		disableEventClick,
		disableCellClick,
		resources,
		orientation,
		weekViewGranularity,
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
			dragSnapInterval: resolvedDragSnapInterval,
			showDragTimeIndicator,
			renderDragTimeIndicator,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			renderEventForm,
			onMoreEventsClick,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			renderHour,
			hideNonBusinessHours,
			hideExportButton,
			hiddenDays,
			slotDuration,
			scrollTime,
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
		resolvedDragSnapInterval,
		showDragTimeIndicator,
		renderDragTimeIndicator,
		eventSpacing,
		eventHeight,
		stickyViewHeader,
		viewHeaderClassName,
		headerComponent,
		headerClassName,
		renderEventForm,
		onMoreEventsClick,
		timeFormat,
		classesOverride,
		renderCurrentTimeIndicator,
		renderHour,
		hideNonBusinessHours,
		hideExportButton,
		hiddenDays,
		slotDuration,
		scrollTime,
	])
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
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
			{wrappedChildren}
		</CalendarContext.Provider>
	)
}
