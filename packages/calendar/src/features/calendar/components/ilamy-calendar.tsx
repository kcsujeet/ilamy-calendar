import type React from 'react'
import {
	type Ref,
	useImperativeHandle,
	useInsertionEffect,
	useMemo,
	useRef,
} from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
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
// oxlint-disable-next-line no-duplicates
import '@ilamy/utils/dayjs'
import {
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/config/constants'
import type { IlamyCalendarProps } from '@/features/calendar/types'

const CalendarContent: React.FC<{ calendarRef?: Ref<IlamyCalendarApi> }> = ({
	calendarRef,
}) => {
	useCalendarRefHandle(calendarRef)
	const { view, getViews } = useSmartCalendarContext((c) => ({
		view: c.view,
		getViews: c.getViews,
	}))

	const spec = getViews().find((v) => v.name === view)
	const activeView = spec ? <ViewRenderer key={view} view={spec} /> : null

	return (
		<div className="flex flex-col w-full h-full" data-testid="ilamy-calendar">
			<Header className="p-1 shrink-0 mb-1" />
			{/* Calendar Body with AnimatePresence for view transitions */}
			<CalendarDndContext>
				<AnimatedSection
					className="w-full min-h-0 flex-1"
					direction="horizontal"
					transitionKey={view}
				>
					{/* `data-calendar-viewport` is a stable hook for plugins (e.g.
					    drag-to-create clips its selection overlay to this box). Keep it
					    even if the test id changes. */}
					<div
						className="border h-full w-full"
						data-calendar-viewport="true"
						data-testid="calendar-body"
					>
						{activeView}
					</div>
				</AnimatedSection>
			</CalendarDndContext>
			<EventFormDialog />
		</div>
	)
}

/**
 * The handle `ref.current` points at: ONE object for the calendar's life, whose
 * methods and values read the latest API. A fresh object per render would make
 * React call a callback ref with null and then the new handle after every
 * commit, so a callback ref that sets state would loop forever.
 */
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

/**
 * Publishes the calendar's API on the consumer's `ref`. `ref` is a regular prop
 * in React 19, so no `forwardRef`; `useImperativeHandle(ref, createHandle, [])`
 * publishes the handle once (https://react.dev/reference/react/useImperativeHandle).
 */
const useCalendarRefHandle = (calendarRef?: Ref<IlamyCalendarApi>) => {
	const api = useIlamyCalendarContext()
	const latestApiRef = useRef(api)
	// Written in an insertion effect, as `useLatestHandler` does: a render React
	// discards never reaches it, and it runs before any layout effect, so a
	// consumer's callback ref or layout effect reads the committed API.
	useInsertionEffect(() => {
		latestApiRef.current = api
	})
	// Created once: React re-runs the factory whenever the ref's identity
	// changes (an inline callback ref is new every render), and must get the
	// same object back each time.
	const handle = useMemo(() => createApiHandle(() => latestApiRef.current), [])
	useImperativeHandle(calendarRef, () => handle, [handle])
}

// A prop forwarder with no branching (cyclomatic 1): its cognitive score comes
// from the prop defaults, and each concern already lives in its own hook.
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
	ref,
	...props
}) => {
	const resourcesFetcher =
		typeof resources === 'function' ? resources : undefined
	const resourcesArray = typeof resources === 'function' ? undefined : resources
	// A function may still resolve to none; the warning is for a calendar that has no axis at all.
	const hasResources =
		Boolean(resourcesFetcher) || Boolean(resourcesArray?.length)
	const { normalizedEvents, eventsFetcher } = useEventsSource(events)
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
			// Raw, not parsed: the engine needs to see whether the value names an
			// instant or a clock reading, which `safeDate` flattens away.
			initialDate={initialDate}
			initialView={initialView}
			orientation={orientation}
			resources={resourcesArray}
			resourcesFetcher={resourcesFetcher}
			slotMaxTime={slotMaxTime}
			slotMinTime={slotMinTime}
			stickyViewHeader={stickyViewHeader}
			viewHeaderClassName={viewHeaderClassName}
			{...props}
		>
			<CalendarContent calendarRef={ref} />
		</CalendarProvider>
	)
}
