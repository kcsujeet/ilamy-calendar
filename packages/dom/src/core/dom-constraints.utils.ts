import {
	type BusinessHours,
	type CalendarEvent,
	type CellInfo,
	type EventDropInfo,
	isRangeWithinBusinessHours,
	parseDate,
	type Resource,
	resolveDurationEditable,
	resolveStartEditable,
} from '@ilamy/core'
import type { DomCalendarOptions } from '../dom-calendar.types'

export const resolveEffectiveBusinessHours = (
	options: DomCalendarOptions,
	resource?: Resource
): BusinessHours | BusinessHours[] | undefined =>
	resource?.businessHours ?? options.businessHours

export const canCommitEventPlacement = (
	event: CalendarEvent,
	dropInfo: EventDropInfo,
	options: DomCalendarOptions,
	timezone: string,
	resource?: Resource
): boolean => {
	const start = parseDate(dropInfo.start, timezone)
	const end = parseDate(dropInfo.end, timezone)
	if (!start || !end) return false

	if (
		options.isCellDisabled?.({
			start: dropInfo.start,
			end: dropInfo.end,
			resource,
			allDay: dropInfo.allDay,
		})
	) {
		return false
	}

	if (options.eventConstraint === 'businessHours') {
		const businessHours = resolveEffectiveBusinessHours(options, resource)
		const allowed = isRangeWithinBusinessHours({
			start,
			end,
			allDay: dropInfo.allDay,
			businessHours,
		})
		if (!allowed) {
			return false
		}
	}

	return !options.eventAllow || options.eventAllow(dropInfo, event)
}

export const canCommitSelection = (
	cell: CellInfo,
	options: DomCalendarOptions,
	timezone: string
): boolean => {
	if (options.disableCellClick) return false
	if (options.isCellDisabled?.(cell)) return false
	if (options.selectConstraint !== 'businessHours') return true
	const start = parseDate(cell.start, timezone)
	const end = parseDate(cell.end, timezone)
	if (!start || !end) return false
	const businessHours = resolveEffectiveBusinessHours(options, cell.resource)
	return isRangeWithinBusinessHours({
		start,
		end,
		allDay: Boolean(cell.allDay),
		businessHours,
	})
}

export const canDragEvent = (
	event: CalendarEvent,
	options: DomCalendarOptions
): boolean =>
	resolveStartEditable(event, {
		editable: options.editable,
		eventStartEditable: options.eventStartEditable,
		eventDurationEditable: options.eventDurationEditable,
	})

export const canResizeEvent = (
	event: CalendarEvent,
	options: DomCalendarOptions
): boolean =>
	resolveDurationEditable(event, {
		editable: options.editable,
		eventStartEditable: options.eventStartEditable,
		eventDurationEditable: options.eventDurationEditable,
	})
