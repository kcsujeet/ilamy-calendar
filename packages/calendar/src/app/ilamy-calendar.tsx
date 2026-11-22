import { WEEK_DAYS_NUMBER_MAP } from '@ilamy/core'
import { formatDate, parseDate, resolveZone } from '@ilamy/utils/temporal'
import type React from 'react'
import {
	type Ref,
	useEffect,
	useImperativeHandle,
	useInsertionEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/config/constants'
import { CalendarDndContext } from '@/features/drag-and-drop/components/calendar-dnd-context'
import { EventFormDialog } from '@/features/event-form/components/event-form-dialog'
import { Header } from '@/features/header/components/base-header'
import { ViewRenderer } from '@/features/views/components/view-renderer'
import {
	useInvalidSlotPropsWarning,
	useOrientationWarning,
} from '@/hooks/use-calendar-prop-warnings'
import { useEventsSource } from '@/hooks/use-events-source'
import { useHiddenDaysToDraw } from '@/hooks/use-hidden-days-to-draw'
import {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
	useSmartCalendarContext,
} from '@/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/stores/calendar-theme-context'
import type { IlamyCalendarProps } from '@/types/calendar.types'
import { CalendarProvider } from './calendar-provider'

const LIVE_DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
	year: { year: 'numeric' },
	month: { month: 'long', year: 'numeric' },
}
const DEFAULT_LIVE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
	month: 'long',
	day: 'numeric',
	year: 'numeric',
}

const useCalendarLiveAnnouncement = (
	currentDate: string,
	view: string,
	locale: string,
	timezone: string | undefined,
	viewLabel: string
): string => {
	const [announcement, setAnnouncement] = useState('')
	const hasMountedRef = useRef(false)

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true
			return
		}
		const zone = resolveZone(timezone)
		const parsed = parseDate(currentDate, zone)
		if (!parsed) return
		const format = LIVE_DATE_FORMATS[view] ?? DEFAULT_LIVE_DATE_FORMAT
		const dateText = formatDate(parsed, format, locale)
		setAnnouncement(`${viewLabel}, ${dateText}`)
	}, [currentDate, view, locale, timezone, viewLabel])

	return announcement
}

const CalendarContent: React.FC<{ calendarRef?: Ref<IlamyCalendarApi> }> = ({
	calendarRef,
}) => {
	useCalendarRefHandle(calendarRef)
	const { view, currentDate, currentLocale, timezone, getViews, t } =
		useSmartCalendarContext((c) => ({
			view: c.view,
			currentDate: c.currentDate,
			currentLocale: c.currentLocale,
			timezone: c.timezone,
			getViews: c.getViews,
			t: c.t,
		}))
	const rootSlot = useSlotProps('root', {
		structuralClassName: 'flex flex-col w-full h-full',
	})
	const gridSlot = useSlotProps('grid', {
		structuralClassName: 'h-full w-full overflow-hidden',
		defaultClassName: 'border',
	})

	const spec = getViews().find((v) => v.name === view)
	const activeView = spec ? <ViewRenderer key={view} view={spec} /> : null
	const viewLabel = t(spec?.label ?? view)
	const announcement = useCalendarLiveAnnouncement(
		currentDate,
		view,
		currentLocale,
		timezone,
		viewLabel
	)

	return (
		<div
			className={rootSlot.className}
			data-testid="ilamy-calendar"
			style={rootSlot.style}
		>
			<div
				aria-atomic="true"
				aria-live="polite"
				className="sr-only"
				data-testid="calendar-live-region"
			>
				{announcement}
			</div>
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
