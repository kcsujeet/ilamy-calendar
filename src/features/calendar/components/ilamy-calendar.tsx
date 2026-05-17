import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { EventFormDialog } from '@/components/event-form/event-form-dialog'
import { Header } from '@/components/header'
import type { CalendarEvent } from '@/components/types'
import { DayView } from '@/features/calendar/components/day-view/day-view'
import { MonthView } from '@/features/calendar/components/month-view/month-view'
import { WeekView } from '@/features/calendar/components/week-view/week-view'
import { YearView } from '@/features/calendar/components/year-view/year-view'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
// oxlint-disable-next-line no-duplicates
import '@/lib/configs/dayjs-config'
import type {
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import {
	DAY_MAX_EVENTS_DEFAULT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/lib/constants'
import { normalizeEvents, safeDate, toHiddenDaysSet } from '@/lib/utils'

const CalendarContent: React.FC = () => {
	const { view, dayMaxEvents } = useSmartCalendarContext()

	const viewMap = {
		month: <MonthView dayMaxEvents={dayMaxEvents} key="month" />,
		week: <WeekView key="week" />,
		day: <DayView key="day" />,
		year: <YearView key="year" />,
	}

	return (
		<div className="flex flex-col w-full h-full" data-testid="ilamy-calendar">
			<Header className="p-1 shrink-0" />
			{/* Calendar Body with AnimatePresence for view transitions */}
			<CalendarDndContext>
				<AnimatedSection
					className="w-full min-h-0 flex-1"
					direction="horizontal"
					transitionKey={view}
				>
					<div className="border h-full w-full" data-testid="calendar-body">
						{viewMap[view]}
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
	dateEventType = 'Dayjs',
	dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	eventHeight = EVENT_BAR_HEIGHT,
	stickyViewHeader = true,
	viewHeaderClassName = '',
	timeFormat = '12-hour',
	hideNonBusinessHours = false,
	hiddenDays,
	...props
}) => {
	return (
		<CalendarProvider
			dateEventType={dateEventType}
			dayMaxEvents={dayMaxEvents}
			eventHeight={eventHeight}
			eventSpacing={eventSpacing}
			events={normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(events)}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
			hiddenDays={toHiddenDaysSet(hiddenDays)}
			hideNonBusinessHours={hideNonBusinessHours}
			initialDate={safeDate(initialDate)}
			initialView={initialView}
			stickyViewHeader={stickyViewHeader}
			timeFormat={timeFormat}
			viewHeaderClassName={viewHeaderClassName}
			{...props}
		>
			<CalendarContent />
		</CalendarProvider>
	)
}
