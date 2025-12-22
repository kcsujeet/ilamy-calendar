import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { EventForm } from '@/components/event-form/event-form'
import { Header } from '@/components/header'
import type { CalendarEvent } from '@/components/types'
import { ResourceDayView } from '@/features/resource-calendar/components/day-view'
import { ResourceMonthView } from '@/features/resource-calendar/components/month-view'
import { ResourceWeekView } from '@/features/resource-calendar/components/week-view'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'

export const ResourceCalendarBody: React.FC = () => {
	const {
		view,
		isEventFormOpen,
		closeEventForm,
		selectedEvent,
		addEvent,
		updateEvent,
		deleteEvent,
		renderEventForm,
	} = useResourceCalendarContext()

	const viewMap = {
		month: <ResourceMonthView key="month" />,
		week: <ResourceWeekView key="week" />,
		day: <ResourceDayView key="day" />,
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
						className="w-full h-[calc(100%-3.5rem)] @container/calendar-body"
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
