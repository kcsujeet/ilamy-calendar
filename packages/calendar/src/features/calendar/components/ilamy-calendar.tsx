import type { CalendarEvent } from '@ilamy/types'
import type React from 'react'
import { useEffect, useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { EventFormDialog } from '@/features/calendar/components/event-form/event-form-dialog'
import { Header } from '@/features/calendar/components/header/base-header'
import { ViewRenderer } from '@/features/calendar/components/views/view-renderer'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
// oxlint-disable-next-line no-duplicates
import '@ilamy/utils/dayjs'
import { safeDate } from '@ilamy/utils/helpers'
import type {
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import {
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/lib/constants'
import { normalizeEvents, toHiddenDaysSet } from '@/lib/utils/normalize'

const CalendarContent: React.FC = () => {
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

export const IlamyCalendar: React.FC<IlamyCalendarProps> = ({
	events,
	firstDayOfWeek = 'sunday',
	initialView = 'month',
	initialDate,
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	eventHeight = EVENT_BAR_HEIGHT,
	stickyViewHeader = true,
	viewHeaderClassName = '',
	timeFormat = '12-hour',
	hideNonBusinessHours = false,
	hiddenDays,
	resources,
	orientation,
	...props
}) => {
	const hasResources = Boolean(resources?.length)
	// Stable reference while `events` is unchanged. Without this, a fresh array on
	// every render makes CalendarProvider re-sync (use-calendar-data) and discard
	// in-memory edits (recurring overrides/EXDATEs, drags) on any re-render (#197).
	const normalizedEvents = useMemo(
		() => normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(events),
		[events]
	)
	useEffect(() => {
		// Guarded `typeof process` check: the published bundle ships this line
		// as-is (no build-time env replacement), so bundler-less ESM consumers
		// must not crash on a bare `process` reference.
		const isDevBuild =
			typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
		if (isDevBuild && orientation && !hasResources) {
			// biome-ignore lint/suspicious/noConsole: deliberate DX guard (master plan, view contract)
			console.warn(
				'[@ilamy/calendar] `orientation` was provided without `resources` — it only applies when the calendar has resources, so it is ignored.'
			)
		}
	}, [orientation, hasResources])

	return (
		<CalendarProvider
			eventHeight={eventHeight}
			eventSpacing={eventSpacing}
			events={normalizedEvents}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
			hiddenDays={toHiddenDaysSet(hiddenDays)}
			hideNonBusinessHours={hideNonBusinessHours}
			initialDate={safeDate(initialDate)}
			initialView={initialView}
			orientation={orientation}
			resources={resources}
			stickyViewHeader={stickyViewHeader}
			timeFormat={timeFormat}
			viewHeaderClassName={viewHeaderClassName}
			{...props}
		>
			<CalendarContent />
		</CalendarProvider>
	)
}
