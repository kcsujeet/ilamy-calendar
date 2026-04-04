import { useImperativeHandle, useState } from 'react'
import { EventContent } from '@/components/event-content'
import type { CalendarEvent } from '@/components/types'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
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
	const { onEventClick, renderEvent, disableEventClick } =
		useSmartCalendarContext()
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
				<div className="mt-4 space-y-2">
					{selectedDayEvents?.events.map((event) => (
						<EventContent
							className="h-[30px] hover:opacity-80"
							event={event}
							key={event.id}
							onClick={disableEventClick ? undefined : onEventClick}
							renderEvent={renderEvent}
						/>
					))}
				</div>
			</DialogContent>
		</Dialog>
	)
}
