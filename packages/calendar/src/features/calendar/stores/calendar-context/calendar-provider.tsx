import type { CalendarEvent, Resource } from '@ilamy/types'
import type { FC, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/config/constants'
import type { RangeFetcher } from '@/features/calendar/hooks/calendar-data/use-range-fetcher'
import { useCalendarEngine } from '@/features/calendar/hooks/use-calendar-engine'
import { CalendarThemeProvider } from '@/features/calendar/stores/calendar-theme-context'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { useLatestHandler } from '@/hooks/use-latest-handler'
import { composePluginProviders } from '@/lib/plugins/compose-plugin-providers'
import { CalendarCellProvider } from '../calendar-cell-context/calendar-cell-provider'
import {
	CalendarContext,
	type CalendarContextType,
	type ScrollRequest,
} from './calendar-context'

export type CalendarProviderProps = Omit<
	IlamyCalendarProps,
	'events' | 'firstDayOfWeek' | 'hiddenDays' | 'resources'
> & {
	children: ReactNode
	events?: CalendarEvent[]
	eventsFetcher?: RangeFetcher<CalendarEvent>
	resources?: Resource[]
	resourcesFetcher?: RangeFetcher<Resource>
	firstDayOfWeek?: number
	hiddenDays?: Set<number>
}

const EMPTY_EVENTS: CalendarEvent[] = []

const useCalendarContextValue = (
	props: Omit<CalendarProviderProps, 'children'>
): CalendarContextType => {
	const {
		events = EMPTY_EVENTS,
		eventsFetcher,
		lazyFetching,
		loading,
		onEventsError,
		resourcesFetcher,
		refetchResourcesOnNavigate,
		resourcesSet,
		onResourcesError,
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
		editable = false,
		eventStartEditable,
		eventDurationEditable,
		eventResizableFromStart,
		eventConstraint,
		selectConstraint,
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
		hiddenDays,
		slotDuration = 60,
		snapDuration,
		scrollTime,
		scrollToNow,
		allDaySlot = true,
		nowIndicator = false,
		weekNumbers,
		weekNumberCalculation = 'local',
		plugins,
		resources,
		renderResource,
		orientation,
		weekViewGranularity,
	} = props

	const timeFormat = explicitTimeFormat ?? '12-hour'
	const onMoreEventsClick = useLatestHandler(props.onMoreEventsClick)
	const eventAllow = useLatestHandler(props.eventAllow)

	const [scrollRequest, setScrollRequest] = useState<ScrollRequest>()
	const scrollToTime = useCallback((time: string) => {
		setScrollRequest({ time })
	}, [])

	const engine = useCalendarEngine({
		events,
		eventsFetcher,
		lazyFetching,
		loading,
		onEventsError,
		resourcesFetcher,
		refetchResourcesOnNavigate,
		resourcesSet,
		onResourcesError,
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
			editable,
			eventStartEditable,
			eventDurationEditable,
			eventResizableFromStart,
			eventConstraint,
			selectConstraint,
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
			hiddenDays,
			slotDuration,
			snapDuration,
			scrollTime,
			scrollToNow,
			scrollRequest,
			scrollToTime,
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
		editable,
		eventStartEditable,
		eventDurationEditable,
		eventResizableFromStart,
		eventConstraint,
		selectConstraint,
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
		hiddenDays,
		slotDuration,
		snapDuration,
		scrollTime,
		scrollToNow,
		scrollRequest,
		scrollToTime,
		allDaySlot,
		nowIndicator,
		weekNumbers,
		weekNumberCalculation,
	])
}

export const CalendarProvider: FC<CalendarProviderProps> = ({
	children,
	unstyled,
	slotProps,
	components,
	...props
}) => {
	const contextValue = useCalendarContextValue(props)

	const wrappedChildren = composePluginProviders(
		contextValue.getProviders(),
		children
	)

	return (
		<CalendarThemeProvider
			components={components}
			slotProps={slotProps}
			unstyled={unstyled}
		>
			<CalendarContext.Provider value={contextValue}>
				<CalendarCellProvider>{wrappedChildren}</CalendarCellProvider>
			</CalendarContext.Provider>
		</CalendarThemeProvider>
	)
}
