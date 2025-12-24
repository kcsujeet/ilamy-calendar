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
import {
	DAY_MAX_EVENTS_DEFAULT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/lib/constants'
import { normalizeEvents, safeDate } from '@/lib/utils'

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
		month: <MonthView dayMaxEvents={dayMaxEvents} key="month" />,
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
						animate={{ opacity: 1, x: 0 }}
						className="w-full h-[calc(100%-3.5rem)]"
						exit={{ opacity: 0, x: -20 }}
						initial={{ opacity: 0, x: 20 }}
						key={view}
						transition={{ duration: 0.1, ease: 'easeInOut' }}
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
	...props
}) => {
	return (
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			eventSpacing={eventSpacing}
			events={normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(events)}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
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
