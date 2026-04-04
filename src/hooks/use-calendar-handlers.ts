import { useCallback, useRef } from 'react'
import {
	AllEventDialog,
	type AllEventsDialogHandle,
} from '@/components/all-events-dialog'
import type { CalendarEvent } from '@/components/types'
import type { CellClickInfo } from '@/features/calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'

interface UseCalendarHandlersProps {
	setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
	setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
	disableEventClick?: boolean
	onEventClick?: (event: CalendarEvent) => void
	disableCellClick?: boolean
	onCellClick?: (info: CellClickInfo) => void
	openEventForm: (eventData?: Partial<CalendarEvent>) => void
}

export function useCalendarHandlers({
	setSelectedEvent,
	setIsEventFormOpen,
	disableEventClick,
	onEventClick,
	disableCellClick,
	onCellClick,
	openEventForm,
}: UseCalendarHandlersProps) {
	const editEvent = useCallback(
		(event: CalendarEvent) => {
			setSelectedEvent(event)
			setIsEventFormOpen(true)
		},
		[setSelectedEvent, setIsEventFormOpen]
	)

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			if (disableEventClick) return
			if (onEventClick) {
				onEventClick(event)
			} else {
				editEvent(event)
			}
		},
		[disableEventClick, onEventClick, editEvent]
	)

	const handleDateClick = useCallback(
		(info: CellClickInfo) => {
			if (disableCellClick) return
			if (onCellClick) {
				onCellClick(info)
			} else {
				openEventForm(info)
			}
		},
		[onCellClick, disableCellClick, openEventForm]
	)

	return { editEvent, handleEventClick, handleDateClick }
}

export function useAllEventsDialog() {
	const allEventsDialogRef = useRef<AllEventsDialogHandle>(null)

	const openAllEventsDialog = useCallback(
		(day: Dayjs, events: CalendarEvent[]) => {
			allEventsDialogRef.current?.open(day, events)
		},
		[]
	)

	const closeAllEventsDialog = useCallback(() => {
		allEventsDialogRef.current?.close()
	}, [])

	return {
		allEventsDialogRef,
		openAllEventsDialog,
		closeAllEventsDialog,
		AllEventDialog,
	}
}
