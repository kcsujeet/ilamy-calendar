import type { Resource } from '@ilamy/types'
import type React from 'react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import type { EventFormProps } from '@/features/calendar/components/event-form/event-form'
import { useCalendarEngine } from '@/features/calendar/hooks/use-calendar-engine'
import type {
	CalendarClassesOverride,
	CellInfo,
	DateRange,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from '@/features/calendar/types'
import { composePluginProviders } from '@/features/plugins/lib/compose-plugin-providers'
import type { IlamyPlugin } from '@/features/plugins/lib/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/lib/constants'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'
import { CalendarContext, type CalendarContextType } from './context'

export interface CalendarProviderProps {
	children: ReactNode
	events?: CalendarEvent[]
	firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
	initialView?: CalendarView
	initialDate?: Dayjs
	renderEvent?: (event: CalendarEvent) => ReactNode
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
	isCellDisabled?: (info: CellInfo) => boolean
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
	eventHeight?: number
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
	renderHour?: (date: Dayjs) => ReactNode
	hideNonBusinessHours?: boolean
	hideExportButton?: boolean
	hiddenDays?: Set<number>
	slotDuration?: SlotDuration
	scrollTime?: string
	plugins?: IlamyPlugin[]
	/** The resource axis. Absent/empty → a regular calendar (no filtering, no resource columns). */
	resources?: Resource[]
	/** Custom render for resource header cells. */
	renderResource?: (resource: Resource) => React.ReactNode
	/** Resource arrangement preference. Only applies when `resources` is set. @default 'horizontal' */
	orientation?: 'horizontal' | 'vertical'
	/** Week-view granularity for resource weeks. @default 'hourly' */
	weekViewGranularity?: 'hourly' | 'daily'
}

/**
 * Builds the shared context value: engine slices (including the resource
 * axis) + presentation props. The single assembly point for the ONE provider.
 */
export const useCalendarContextValue = (
	props: Omit<CalendarProviderProps, 'children'>
): CalendarContextType => {
	const {
		events = [],
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate,
		renderEvent,
		onEventClick,
		onCellClick,
		isCellDisabled,
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
		eventHeight = EVENT_BAR_HEIGHT,
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

	const engine = useCalendarEngine({
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
		// context shape (they re-enter as onEventClick / onCellClick).
		const { handleEventClick, handleDateClick, ...calendarEngine } = engine
		return {
			...calendarEngine,
			renderEvent,
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,
			isCellDisabled,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			renderEventForm,
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
		locale,
		timezone,
		disableCellClick,
		disableEventClick,
		disableDragAndDrop,
		dayMaxEvents,
		eventSpacing,
		eventHeight,
		stickyViewHeader,
		viewHeaderClassName,
		headerComponent,
		headerClassName,
		businessHours,
		renderEventForm,
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
