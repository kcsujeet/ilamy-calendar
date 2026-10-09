import type { Dayjs } from '@ilamy/utils/dayjs'

/** A grid column: its hours grouped in `days`, or the single `day` it holds. */
interface ColumnHours {
	day?: Dayjs
	days?: Dayjs[]
}

const getColumnHours = (column: ColumnHours): Dayjs[] => {
	if (column.days) {
		return column.days
	}
	return column.day ? [column.day] : []
}

/**
 * What a grid's initial scroll is applied once per: the view, the date and the
 * distinct hours on screen. Changing the hours reapplies it, as FullCalendar's
 * time grid rescrolls when its slot range changes (timegrid/src/TimeCols.tsx:136,
 * v6.1.21); adding a resource with the same hours does not.
 */
export const getScrollKey = (
	view: string,
	currentDate: Dayjs,
	columns: ColumnHours[]
): string => {
	const hourInstants = columns
		.flatMap(getColumnHours)
		.map((hour) => hour.toISOString())
	const distinctHours = [...new Set(hourInstants)].join(',')
	return `${view}-${currentDate.format('YYYY-MM-DD')}-${distinctHours}`
}
