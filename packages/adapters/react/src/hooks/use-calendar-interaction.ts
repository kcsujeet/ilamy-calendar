import type {
	CalendarEvent,
	IsoDateString,
	TranslatorFunction,
} from '@ilamy/types'
import {
	add,
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
	withTime,
} from '@ilamy/utils/temporal'
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react'
import type { CellInfo, OpenEventFormInput } from '@/types/calendar.types'

const buildEventDraft = (draft: Omit<CalendarEvent, 'id'>): CalendarEvent =>
	draft as CalendarEvent

interface CalendarInteractionParams {
	currentDate: IsoDateString
	timezone?: string
	t: TranslatorFunction
	disableEventClick?: boolean
	disableCellClick?: boolean
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
}

export interface CalendarInteractionSlice {
	isEventFormOpen: boolean
	selectedEvent: CalendarEvent | null
	selectedDate: IsoDateString | null
	setIsEventFormOpen: Dispatch<SetStateAction<boolean>>
	setSelectedEvent: Dispatch<SetStateAction<CalendarEvent | null>>
	setSelectedDate: Dispatch<SetStateAction<IsoDateString | null>>
	openEventForm: (eventData?: OpenEventFormInput) => void
	closeEventForm: () => void
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
}

export const useCalendarInteraction = ({
	currentDate,
	timezone,
	t,
	disableEventClick,
	disableCellClick,
	onEventClick,
	onCellClick,
}: CalendarInteractionParams): CalendarInteractionSlice => {
	const [isEventFormOpen, setIsEventFormOpen] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
	const [selectedDate, setSelectedDate] = useState<IsoDateString | null>(null)

	const openEventForm = useCallback(
		(eventData: OpenEventFormInput = {}) => {
			const { start, end, resourceId, resource, allDay } = eventData
			if (start) {
				setSelectedDate(start)
			}
			const zone = resolveZone(timezone)
			const baseStart = parseDate(start ?? currentDate, zone) ?? now(zone)
			const draftStart = withTime(baseStart, { second: 0, millisecond: 0 })
			const draftEnd = parseDate(end, zone) ?? add(draftStart, 1, 'hour')

			setSelectedEvent(
				buildEventDraft({
					title: t('newEvent'),
					start: toOffsetIso(draftStart),
					end: toOffsetIso(draftEnd),
					resourceId: resourceId ?? resource?.id,
					description: '',
					allDay: allDay ?? false,
				})
			)
			setIsEventFormOpen(true)
		},
		[currentDate, timezone, t]
	)

	const closeEventForm = useCallback(() => {
		setSelectedDate(null)
		setSelectedEvent(null)
		setIsEventFormOpen(false)
	}, [])

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
