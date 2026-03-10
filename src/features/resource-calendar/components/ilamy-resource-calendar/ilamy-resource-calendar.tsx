import type React from 'react'
import type { CalendarEvent, WeekDays } from '@/components/types'
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

const toHiddenDaysSet = (hiddenDays?: WeekDays[]): Set<number> | undefined => {
	if (!hiddenDays || hiddenDays.length === 0) return undefined
	return new Set(hiddenDays.map((day) => WEEK_DAYS_NUMBER_MAP[day]))
}

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
	hiddenDays,
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
			hiddenDays={toHiddenDaysSet(hiddenDays)}
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
