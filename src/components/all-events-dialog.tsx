import { useImperativeHandle, useState } from 'react'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import type { CalendarEvent } from '@/components/types'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { Dayjs } from '@/lib/configs/dayjs-config'

export interface SelectedDayEvents {
	day: Dayjs
	events: CalendarEvent[]
}

export interface AllEventsDialogHandle {
	open: (day: Dayjs, events: CalendarEvent[]) => void
	close: () => void
}

interface AllEventDialogProps {
	ref: React.Ref<AllEventsDialogHandle>
}

export const AllEventDialog: React.FC<AllEventDialogProps> = ({ ref }) => {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectedDayEvents, setSelectedDayEvents] =
		useState<SelectedDayEvents | null>(null)

	useImperativeHandle(ref, () => ({
		open: (day: Dayjs, events: CalendarEvent[]) => {
			setSelectedDayEvents({ day, events })
			setDialogOpen(true)
		},
		close: () => {
			setDialogOpen(false)
			setSelectedDayEvents(null)
		},
	}))

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) {
					setDialogOpen(false)
					setSelectedDayEvents(null)
				}
			}}
			open={dialogOpen}
		>
			<DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{selectedDayEvents?.day.format('MMMM D, YYYY')}
					</DialogTitle>
				</DialogHeader>
				<div className="mt-4 space-y-3">
					{selectedDayEvents?.events.map((event) => (
						<DraggableEvent
							className="relative my-1 h-[30px]"
							elementId={`all-events-dialog-event-${event.id}`}
							event={event}
							key={event.id}
						/>
					))}
				</div>
			</DialogContent>
		</Dialog>
	)
}
