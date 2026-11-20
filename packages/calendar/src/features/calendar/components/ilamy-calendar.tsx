import { WEEK_DAYS_NUMBER_MAP } from '@ilamy/core'
import type React from 'react'
import {
	type Ref,
	useImperativeHandle,
	useInsertionEffect,
	useMemo,
	useRef,
} from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/config/constants'
import { CalendarDndContext } from '@/features/calendar/components/drag-and-drop/calendar-dnd-context'
import { EventFormDialog } from '@/features/calendar/components/event-form/event-form-dialog'
import { Header } from '@/features/calendar/components/header/base-header'
import { ViewRenderer } from '@/features/calendar/components/views/view-renderer'
import {
	useInvalidSlotPropsWarning,
	useOrientationWarning,
} from '@/features/calendar/hooks/use-calendar-prop-warnings'
import { useEventsSource } from '@/features/calendar/hooks/use-events-source'
import { useHiddenDaysToDraw } from '@/features/calendar/hooks/use-hidden-days-to-draw'
import {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
	useSmartCalendarContext,
} from '@/features/calendar/hooks/use-smart-calendar-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { useSlotProps } from '@/features/calendar/stores/calendar-theme-context'
import type { IlamyCalendarProps } from '@/features/calendar/types'

const CalendarContent: React.FC<{ calendarRef?: Ref<IlamyCalendarApi> }> = ({
	calendarRef,
}) => {
	useCalendarRefHandle(calendarRef)
	const { view, getViews } = useSmartCalendarContext((c) => ({
		view: c.view,
		getViews: c.getViews,
	}))
	const rootSlot = useSlotProps('root', {
		structuralClassName: 'flex flex-col w-full h-full',
	})
	const gridSlot = useSlotProps('grid', {
		structuralClassName: 'h-full w-full',
		defaultClassName: 'border',
	})

	const spec = getViews().find((v) => v.name === view)
	const activeView = spec ? <ViewRenderer key={view} view={spec} /> : null

	return (
		<div
			className={rootSlot.className}
			data-testid="ilamy-calendar"
			style={rootSlot.style}
		>
			<Header className="p-1 shrink-0 mb-1" />
			<CalendarDndContext>
				<AnimatedSection
					className="w-full min-h-0 flex-1"
					direction="horizontal"
					transitionKey={view}
				>
					<div
						className={gridSlot.className}
						data-calendar-viewport="true"
						data-testid="calendar-body"
						style={gridSlot.style}
					>
						{activeView}
					</div>
				</AnimatedSection>
			</CalendarDndContext>
			<EventFormDialog />
		</div>
	)
}

const createApiHandle = (readLatestApi: () => IlamyCalendarApi) => {
	const handle: Record<string, unknown> = {}
	for (const [name, value] of Object.entries(readLatestApi())) {
		const isMethod = typeof value === 'function'
		const callLatestMethod = (...args: unknown[]) =>
			Reflect.apply(Reflect.get(readLatestApi(), name), undefined, args)
		Object.defineProperty(handle, name, {
			enumerable: true,
			get: isMethod
				? () => callLatestMethod
				: () => Reflect.get(readLatestApi(), name),
		})
	}
	return handle as unknown as IlamyCalendarApi
}

const useCalendarRefHandle = (calendarRef?: Ref<IlamyCalendarApi>) => {
	const api = useIlamyCalendarContext()
	const latestApiRef = useRef(api)
	useInsertionEffect(() => {
		latestApiRef.current = api
	})
	const handle = useMemo(() => createApiHandle(() => latestApiRef.current), [])
	useImperativeHandle(calendarRef, () => handle, [handle])
}

// fallow-ignore-next-line complexity
export const IlamyCalendar: React.FC<IlamyCalendarProps> = ({
	events,
	firstDayOfWeek = 'sunday',
	initialView = 'month',
	initialDate,
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	eventHeight = EVENT_BAR_HEIGHT,
	stickyViewHeader = true,
	viewHeaderClassName = '',
	hideNonBusinessHours = false,
	slotMinTime,
	slotMaxTime,
	hiddenDays,
	weekends,
	resources,
	orientation,
	timezone,
	ref,
	...props
}) => {
	const resourcesFetcher =
		typeof resources === 'function' ? resources : undefined
	const resourcesArray = typeof resources === 'function' ? undefined : resources
	const hasResources =
		Boolean(resourcesFetcher) || Boolean(resourcesArray?.length)
	const { normalizedEvents, eventsFetcher } = useEventsSource(events, timezone)
	const hiddenDaysToDraw = useHiddenDaysToDraw(hiddenDays, weekends)
	useOrientationWarning(orientation, hasResources)
	useInvalidSlotPropsWarning(slotMinTime, slotMaxTime)

	return (
		<CalendarProvider
			eventHeight={eventHeight}
			eventSpacing={eventSpacing}
			events={normalizedEvents}
			eventsFetcher={eventsFetcher}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
			hiddenDays={hiddenDaysToDraw}
			hideNonBusinessHours={hideNonBusinessHours}
			initialDate={initialDate}
			initialView={initialView}
			orientation={orientation}
			resources={resourcesArray}
			resourcesFetcher={resourcesFetcher}
			slotMaxTime={slotMaxTime}
			slotMinTime={slotMinTime}
			stickyViewHeader={stickyViewHeader}
			timezone={timezone}
			viewHeaderClassName={viewHeaderClassName}
			{...props}
		>
			<CalendarContent calendarRef={ref} />
		</CalendarProvider>
	)
}
