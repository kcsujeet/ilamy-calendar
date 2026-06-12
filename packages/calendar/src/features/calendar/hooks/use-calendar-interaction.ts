import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useCallback, useMemo, useState } from 'react'
import type { CellInfo, OpenEventFormInput } from '@/features/calendar/types'
import type { TranslatorFunction } from '@/lib/translations/types'

/**
 * A new-event draft intentionally has no `id` yet — the form assigns one on
 * save. The context's `selectedEvent` slot carries drafts as CalendarEvent,
 * so this builder owns the single, documented widening.
 */
const buildEventDraft = (draft: Omit<CalendarEvent, 'id'>): CalendarEvent =>
	draft as CalendarEvent

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
		(eventData: OpenEventFormInput = {}) => {
			const { start, end, resourceId, resource, allDay } = eventData
			if (start) {
				setSelectedDate(start)
			}
			const draftStart = start ?? currentDate
			setSelectedEvent(
				buildEventDraft({
					title: t('newEvent'),
					start: draftStart,
					end: end ?? draftStart.add(1, 'hour'),
					resourceId: resourceId ?? resource?.id,
					description: '',
					allDay: allDay ?? false,
				})
			)
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

	return useMemo(
		() => ({
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
		}),
		[
			isEventFormOpen,
			selectedEvent,
			selectedDate,
			openEventForm,
			closeEventForm,
			handleEventClick,
			handleDateClick,
		]
	)
}
