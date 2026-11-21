import type { IsoDateString } from '@ilamy/types'
import {
	add,
	isAfter,
	isBefore,
	isSameInstant,
	now,
	parseDate,
	startOf,
	subtract,
	toDate,
} from '@ilamy/utils/temporal'
import { useState } from 'react'
import { formatClockTime } from '@/features/event-form/utils/event-form.utils'
import {
	buildDateTime,
	buildEndDateTime,
	type FormSchedule,
	keepEndAfterStart,
	openedLengthMinutes,
} from '@/features/event-form/utils/event-form-schedule.utils'

const END_OF_DAY = '23:59'

interface EventScheduleInput {
	start: IsoDateString
	end: IsoDateString
	initialAllDay: boolean
	isExistingEvent: boolean
	timezone: string
}

/** Manages the form's dates, times, and all-day flag while keeping them consistent. */
export const useEventSchedule = ({
	start,
	end,
	initialAllDay,
	isExistingEvent,
	timezone,
}: EventScheduleInput) => {
	const startZoned = parseDate(start, timezone) ?? now(timezone)
	const endZoned = parseDate(end, timezone) ?? add(startZoned, 1, 'hour')

	// An all-day `end` is STORED exclusively, as the midnight after the last day
	// the event covers (#248), but the picker shows the user that last day.
	// `buildEndDateTime` converts back on save. An end that is not on a midnight
	// boundary predates this and is already inclusive, so it is shown untouched.
	const endsOnMidnight = isSameInstant(endZoned, startOf(endZoned, 'day'))
	let lastCoveredDay = endZoned
	if (initialAllDay && endsOnMidnight) {
		lastCoveredDay = startOf(subtract(endZoned, 1, 'day'), 'day')
	}

	const [startDate, setStartDate] = useState(() => toDate(startZoned))
	const [endDate, setEndDate] = useState(() => toDate(lastCoveredDay))
	const [isAllDay, setIsAllDay] = useState(initialAllDay)

	const [startTime, setStartTime] = useState(() => formatClockTime(startZoned))
	// An all-day event's end is a midnight, which reads as 23:59 of the last
	// day it covers, so unticking All day leaves a whole-day timed range.
	const [endTime, setEndTime] = useState(() => {
		if (initialAllDay) {
			return END_OF_DAY
		}
		return formatClockTime(endZoned)
	})

	// Whether the user touched any schedule field. An existing event saved with
	// its schedule untouched keeps the start and end it came with.
	const [isScheduleEdited, setIsScheduleEdited] = useState(false)

	const lengthMinutes = openedLengthMinutes(start, end, timezone)

	// RFC 5545 section 3.8.2.2: DTEND "MUST be later in time than" DTSTART.
	const applySchedule = (
		schedule: FormSchedule,
		movedEdge: 'start' | 'end'
	) => {
		let ordered = schedule
		if (!isAllDay) {
			ordered = keepEndAfterStart(schedule, movedEdge, lengthMinutes, timezone)
		}
		setStartDate(ordered.startDate)
		setStartTime(ordered.startTime)
		setEndDate(ordered.endDate)
		setEndTime(ordered.endTime)
		setIsScheduleEdited(true)
	}

	const current: FormSchedule = { startDate, startTime, endDate, endTime }

	const handleStartDateChange = (date: Date | undefined) => {
		if (!date) return
		const parsedNew = parseDate(date, timezone)
		const parsedEnd = parseDate(endDate, timezone)
		const isAfterEnd = Boolean(
			parsedNew && parsedEnd && isAfter(parsedNew, parsedEnd)
		)
		const endDay = isAfterEnd ? date : endDate
		applySchedule({ ...current, startDate: date, endDate: endDay }, 'start')
	}

	const handleEndDateChange = (date: Date | undefined) => {
		if (!date) return
		const parsedNew = parseDate(date, timezone)
		const parsedStart = parseDate(startDate, timezone)
		const isBeforeStart = Boolean(
			parsedNew && parsedStart && isBefore(parsedNew, parsedStart)
		)
		const startDay = isBeforeStart ? date : startDate
		applySchedule({ ...current, endDate: date, startDate: startDay }, 'end')
	}

	/**
	 * The End Date input means different things in the two modes: a boundary for a
	 * timed event, the last day COVERED for an all-day one. Switching to all-day
	 * steps a next-day midnight back to the previous day (#248).
	 */
	const handleAllDayChange = (checked: boolean) => {
		setIsAllDay(checked)
		setIsScheduleEdited(true)
		if (!(checked && endTime === '00:00')) {
			return
		}
		const zonedEnd = parseDate(endDate, timezone)
		const zonedStart = parseDate(startDate, timezone)
		if (!(zonedEnd && zonedStart && isAfter(zonedEnd, zonedStart, 'day'))) {
			return
		}
		setEndDate(toDate(startOf(subtract(zonedEnd, 1, 'day'), 'day')))
		setEndTime(END_OF_DAY)
	}

	const buildScheduleFields = () => {
		if (isExistingEvent && !isScheduleEdited) {
			return { start, end, allDay: initialAllDay }
		}
		return {
			start: buildDateTime(startDate, startTime, isAllDay, timezone),
			end: buildEndDateTime(endDate, endTime, isAllDay, timezone),
			allDay: isAllDay,
		}
	}

	const handleStartTimeChange = (time: string) =>
		applySchedule({ ...current, startTime: time }, 'start')

	const handleEndTimeChange = (time: string) =>
		applySchedule({ ...current, endTime: time }, 'end')

	return {
		startDate,
		endDate,
		isAllDay,
		buildScheduleFields,
		startTime,
		endTime,
		handleStartDateChange,
		handleEndDateChange,
		handleAllDayChange,
		handleStartTimeChange,
		handleEndTimeChange,
	}
}

export type EventSchedule = ReturnType<typeof useEventSchedule>
