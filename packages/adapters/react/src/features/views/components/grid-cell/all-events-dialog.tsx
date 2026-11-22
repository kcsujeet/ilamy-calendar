import type { CalendarEvent } from '@ilamy/types'
import { formatDate, type ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { useImperativeHandle, useState } from 'react'
import { DraggableEvent } from '@/features/views/components/draggable-event/draggable-event'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/stores/calendar-theme-context'

export interface SelectedDayEvents {
	day: ZonedDate
	events: CalendarEvent[]
}

export interface AllEventDialogHandle {
	open: () => void
	close: () => void
	setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
}

interface AllEventDialogProps {
	ref: React.Ref<AllEventDialogHandle>
}

export const AllEventDialog: React.FC<AllEventDialogProps> = ({ ref }) => {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectedDayEvents, setSelectedDayEvents] =
		useState<SelectedDayEvents | null>(null)
	const { eventHeight, currentLocale } = useSmartCalendarContext()
	const { Dialog } = useCalendarComponents()

	useImperativeHandle(ref, () => ({
		open: () => setDialogOpen(true),
		close: () => setDialogOpen(false),
		setSelectedDayEvents: (dayEvents: SelectedDayEvents) =>
			setSelectedDayEvents(dayEvents),
	}))

	let title: string | undefined
	if (selectedDayEvents) {
		title = formatDate(
			selectedDayEvents.day,
			{ month: 'long', day: 'numeric', year: 'numeric' },
			currentLocale
		)
	}

	return (
		<Dialog
			className="max-h-[80vh] max-w-md overflow-y-auto"
			onOpenChange={setDialogOpen}
			open={dialogOpen}
			title={title}
		>
			<div className="mt-4 space-y-3">
				{selectedDayEvents?.events.map((event) => (
					<DraggableEvent
						className="relative my-1"
						elementId={`all-events-dialog-event-${event.id}`}
						event={event}
						key={event.id}
						style={{ height: `${eventHeight}px` }}
					/>
				))}
			</div>
		</Dialog>
	)
}
