import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { EventFormDialog } from '@/components/event-form/event-form-dialog'
import { Header } from '@/components/header'
import { ResourceDayView } from '@/features/resource-calendar/components/day-view'
import { ResourceMonthView } from '@/features/resource-calendar/components/month-view'
import { ResourceWeekView } from '@/features/resource-calendar/components/week-view'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'

export const ResourceCalendarBody: React.FC = () => {
	const { view } = useResourceCalendarContext()

	const viewMap = {
		month: <ResourceMonthView key="month" />,
		week: <ResourceWeekView key="week" />,
		day: <ResourceDayView key="day" />,
	}

	return (
		<div
			className="flex flex-col w-full h-full"
			data-testid="ilamy-resource-calendar"
		>
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
						<div className="border h-full w-full" data-testid="calendar-body">
							{viewMap[view]}
						</div>
					</motion.div>
				</AnimatePresence>
			</CalendarDndContext>

			{/* Event Form Dialog */}
			<EventFormDialog />
		</div>
	)
}
