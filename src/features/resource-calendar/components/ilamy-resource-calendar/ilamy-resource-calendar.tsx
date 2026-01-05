import type React from 'react'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type {
	IlamyResourceCalendarPropEvent,
	IlamyResourceCalendarProps,
} from '@/features/resource-calendar/types'
import {
	DAY_MAX_EVENTS_DEFAULT,
	GAP_BETWEEN_ELEMENTS,
	WEEK_DAYS_NUMBER_MAP,
} from '@/lib/constants'
import { normalizeEvents, safeDate } from '@/lib/utils'
import { ResourceCalendarBody } from './resource-calendar-body'

export const IlamyResourceCalendar: React.FC<IlamyResourceCalendarProps> = ({
	events = [],
	resources = [],
	firstDayOfWeek = 'sunday',
	initialView = 'month',
	initialDate,
	disableDragAndDrop = false,
	dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
	timeFormat = '12-hour',
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	hiddenHeaderButtons,
	...props
}) => {
	return (
		<ResourceCalendarProvider
			dayMaxEvents={dayMaxEvents}
			disableDragAndDrop={disableDragAndDrop}
			eventSpacing={eventSpacing}
			events={normalizeEvents<IlamyResourceCalendarPropEvent, CalendarEvent>(
				events
			)}
			firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
			hiddenHeaderButtons={hiddenHeaderButtons}
			initialDate={safeDate(initialDate)}
			initialView={initialView}
			resources={resources}
			timeFormat={timeFormat}
			{...props}
		>
			<ResourceCalendarBody />
		</ResourceCalendarProvider>
	)
}
