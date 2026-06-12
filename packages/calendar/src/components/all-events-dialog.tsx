import type { CalendarEvent } from '@ilamy/types'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@ilamy/ui/components/dialog'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useImperativeHandle, useState } from 'react'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
export interface SelectedDayEvents {
	day: Dayjs
	events: CalendarEvent[]
}

interface AllEventDialogProps {
	ref: React.Ref<{
		open: () => void
		close: () => void
		setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
	}>
}

export const AllEventDialog: React.FC<AllEventDialogProps> = ({ ref }) => {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectedDayEvents, setSelectedDayEvents] =
		useState<SelectedDayEvents | null>(null)
	const { eventHeight } = useSmartCalendarContext()

	useImperativeHandle(ref, () => ({
		open: () => setDialogOpen(true),
		close: () => setDialogOpen(false),
		setSelectedDayEvents: (dayEvents: SelectedDayEvents) =>
			setSelectedDayEvents(dayEvents),
	}))

	return (
		<Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
			<DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{selectedDayEvents?.day.format('MMMM D, YYYY')}
					</DialogTitle>
				</DialogHeader>
				<div className="mt-4 space-y-3">
					{selectedDayEvents?.events.map((event) => {
						return (
							<DraggableEvent
								className="relative my-1"
								elementId={`all-events-dialog-event-${event.id}`}
								event={event}
								key={event.id}
								style={{ height: `${eventHeight}px` }}
							/>
						)
					})}
				</div>
			</DialogContent>
		</Dialog>
	)
}
