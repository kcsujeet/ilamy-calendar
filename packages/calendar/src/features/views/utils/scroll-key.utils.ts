import { dayKey, toUtcIso, type ZonedDate } from '@ilamy/utils/temporal'

type DateValue = string | ZonedDate

interface ColumnHours {
	day?: DateValue
	days?: DateValue[]
}

const getColumnHours = (column: ColumnHours): DateValue[] => {
	if (column.days) {
		return column.days
	}
	return column.day ? [column.day] : []
}

const toInstantKey = (value: DateValue): string =>
	typeof value === 'string' ? value : toUtcIso(value)

const toDaySegment = (value: DateValue): string =>
	typeof value === 'string' ? value.slice(0, 10) : dayKey(value)

/** Key governing when a grid reapplies initial `scrollTime`/`scrollToNow`. */
export const getScrollKey = (
	view: string,
	currentDate: DateValue,
	columns: ColumnHours[]
): string => {
	const hourInstants = columns.flatMap(getColumnHours).map(toInstantKey)
	const distinctHours = [...new Set(hourInstants)].join(',')
	return `${view}-${toDaySegment(currentDate)}-${distinctHours}`
}
