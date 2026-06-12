import { useCallback, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { CellInfo, OpenEventFormInput } from '@/features/calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import type { TranslatorFunction } from '@/lib/translations/types'

export interface CalendarInteractionParams {
	currentDate: Dayjs
	t: TranslatorFunction
	disableEventClick?: boolean
	disableCellClick?: boolean
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
}

export interface CalendarInteractionSlice {
	isEventFormOpen: boolean
	selectedEvent: CalendarEvent | null
	selectedDate: Dayjs | null
	setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
	setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
	setSelectedDate: React.Dispatch<React.SetStateAction<Dayjs | null>>
	openEventForm: (eventData?: OpenEventFormInput) => void
	closeEventForm: () => void
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
}

/** Interaction slice: selection state and the event form lifecycle. */
export const useCalendarInteraction = ({
	currentDate,
	t,
	disableEventClick,
	disableCellClick,
	onEventClick,
	onCellClick,
}: CalendarInteractionParams): CalendarInteractionSlice => {
	const [isEventFormOpen, setIsEventFormOpen] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
	const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)

	const openEventForm = useCallback(
		(eventData?: OpenEventFormInput) => {
			if (eventData?.start) {
				setSelectedDate(eventData.start)
			}
			const start = eventData?.start ?? currentDate
			const resourceId = eventData?.resourceId ?? eventData?.resource?.id
			setSelectedEvent({
				title: t('newEvent'),
				start,
				end: eventData?.end ?? start.add(1, 'hour'),
				resourceId,
				description: '',
				allDay: eventData?.allDay ?? false,
			} as CalendarEvent)
			setIsEventFormOpen(true)
		},
		[currentDate, t]
	)

	const closeEventForm = useCallback(() => {
		setSelectedDate(null)
		setSelectedEvent(null)
		setIsEventFormOpen(false)
	}, [])

	// Internal: open the form pre-filled with an EXISTING event (clicked event).
	const editEvent = useCallback((event: CalendarEvent) => {
		setSelectedEvent(event)
		setIsEventFormOpen(true)
	}, [])

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			if (disableEventClick) {
				return
			}
			if (onEventClick) {
				onEventClick(event)
			} else {
				editEvent(event)
			}
		},
		[disableEventClick, onEventClick, editEvent]
	)

	const handleDateClick = useCallback(
		(info: CellInfo) => {
			if (disableCellClick) {
				return
			}

			if (onCellClick) {
				onCellClick(info)
			} else {
				openEventForm(info)
			}
		},
		[onCellClick, disableCellClick, openEventForm]
	)

	return {
		isEventFormOpen,
		selectedEvent,
		selectedDate,
		setIsEventFormOpen,
		setSelectedEvent,
		setSelectedDate,
		openEventForm,
		closeEventForm,
		handleEventClick,
		handleDateClick,
	}
}
