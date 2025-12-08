import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { EventForm } from '@/components/event-form/event-form'
import { Header } from '@/components/header'
import type { CalendarEvent } from '@/components/types'
import DayView from '@/features/calendar/components/day-view/day-view'
import { MonthView } from '@/features/calendar/components/month-view/month-view'
import WeekView from '@/features/calendar/components/week-view/week-view'
import YearView from '@/features/calendar/components/year-view/year-view'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
// oxlint-disable-next-line no-duplicates
import '@/lib/configs/dayjs-config'
import type {
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import { normalizeEvents, safeDate } from '@/lib'
import {
	DAY_MAX_EVENTS_DEFAULT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/lib/constants'

const CalendarContent: React.FC = () => {
	const {
		view,
		isEventFormOpen,
		closeEventForm,
		selectedEvent,
		addEvent,
		updateEvent,
		deleteEvent,
		dayMaxEvents,
		renderEventForm,
	} = useCalendarContext()

	const viewMap = {
		month: <MonthView key="month" dayMaxEvents={dayMaxEvents} />,
		week: <WeekView key="week" />,
		day: <DayView key="day" />,
		year: <YearView key="year" />,
	}

	const handleOnUpdate = (event: CalendarEvent) => {
		updateEvent(event.id, event)
	}

	const handleOnDelete = (event: CalendarEvent) => {
		deleteEvent(event.id)
	}

	const eventFormProps = {
		open: isEventFormOpen,
		onClose: closeEventForm,
		selectedEvent,
		onAdd: addEvent,
		onUpdate: handleOnUpdate,
		onDelete: handleOnDelete,
	}

	return (
		<div className="flex flex-col w-full h-full">
			<Header className="p-1" />

			{/* Calendar Body with AnimatePresence for view transitions */}
			<CalendarDndContext>
				<AnimatePresence mode="wait">
					<motion.div
						key={view}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.1, ease: 'easeInOut' }}
						className="w-full h-[calc(100%-3.5rem)]"
					>
						{viewMap[view]}
					</motion.div>
				</AnimatePresence>
			</CalendarDndContext>

			{/* Event Form Dialog */}
			{renderEventForm
				? renderEventForm(eventFormProps)
				: isEventFormOpen && <EventForm {...eventFormProps} />}
		</div>
	)
}

export const IlamyCalendar: React.FC<IlamyCalendarProps> = ({
	events,
	firstDayOfWeek = 'sunday',
	initialView = 'month',
	initialDate,
	dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	stickyViewHeader = true,
	viewHeaderClassName = '',
	timeFormat = '12-hour',
	showCurrentTimeLabel = false,
	...props
}) => {
	return (
		<CalendarProvider
			events={normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(events)}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
			initialView={initialView}
			initialDate={safeDate(initialDate)}
			dayMaxEvents={dayMaxEvents}
			eventSpacing={eventSpacing}
			stickyViewHeader={stickyViewHeader}
			viewHeaderClassName={viewHeaderClassName}
			timeFormat={timeFormat}
			showCurrentTimeLabel={showCurrentTimeLabel}
			{...props}
		>
			<CalendarContent />
		</CalendarProvider>
	)
}
