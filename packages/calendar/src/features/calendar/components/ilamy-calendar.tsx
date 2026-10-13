import type { CalendarEvent } from '@ilamy/types'
import type React from 'react'
import { useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { CalendarDndContext } from '@/features/calendar/components/drag-and-drop/calendar-dnd-context'
import { EventFormDialog } from '@/features/calendar/components/event-form/event-form-dialog'
import { Header } from '@/features/calendar/components/header/base-header'
import { ViewRenderer } from '@/features/calendar/components/views/view-renderer'
import {
	useInvalidSlotPropsWarning,
	useOrientationWarning,
} from '@/features/calendar/hooks/use-calendar-prop-warnings'
import { useHiddenDaysToDraw } from '@/features/calendar/hooks/use-hidden-days-to-draw'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
// oxlint-disable-next-line no-duplicates
import '@ilamy/utils/dayjs'
import {
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/config/constants'
import type {
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import { normalizeEvents } from '@/features/calendar/utils/normalize'

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
	hideNonBusinessHours = false,
	slotMinTime,
	slotMaxTime,
	hiddenDays,
	weekends,
	resources,
	orientation,
	...props
}) => {
	const hasResources = Boolean(resources?.length)
	// Stable reference while `events` is unchanged. Without this, a fresh array on
	// every render makes CalendarProvider re-sync (use-event-store) and discard
	// in-memory edits (recurring overrides/EXDATEs, drags) on any re-render (#197).
	const normalizedEvents = useMemo(
		() => normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(events),
		[events]
	)
	const hiddenDaysToDraw = useHiddenDaysToDraw(hiddenDays, weekends)
	useOrientationWarning(orientation, hasResources)
	useInvalidSlotPropsWarning(slotMinTime, slotMaxTime)

	return (
		<CalendarProvider
			eventHeight={eventHeight}
			eventSpacing={eventSpacing}
			events={normalizedEvents}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
			hiddenDays={hiddenDaysToDraw}
			hideNonBusinessHours={hideNonBusinessHours}
			// Raw, not parsed: the engine needs to see whether the value names an
			// instant or a clock reading, which `safeDate` flattens away.
			initialDate={initialDate}
			initialView={initialView}
			orientation={orientation}
			resources={resources}
			slotMaxTime={slotMaxTime}
			slotMinTime={slotMinTime}
			stickyViewHeader={stickyViewHeader}
			viewHeaderClassName={viewHeaderClassName}
			{...props}
		>
			<CalendarContent />
		</CalendarProvider>
	)
}
