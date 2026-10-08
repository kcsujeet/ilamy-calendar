import type { Dayjs } from '@ilamy/utils/dayjs'

/** A grid column: its hours grouped in `days`, or the single `day` it holds. */
interface ColumnHours {
	day?: Dayjs
	days?: Dayjs[]
}

const hoursOf = (column: ColumnHours): Dayjs[] => {
	if (column.days) {
		return column.days
	}
	return column.day ? [column.day] : []
}

/**
 * What a grid's initial scroll is applied once per: the view, the date, and
 * the hours on screen, so widening the hours reapplies it (#320). FullCalendar
 * does the same: its time grid rescrolls whenever its date profile changes
 * (`timegrid/src/TimeCols.tsx:136`), and the date profile carries the slot
 * range (`core/src/DateProfileGenerator.ts:164,167`, v6.1.21). Each hour counts
 * once, however many resource rows or columns repeat it, so adding a resource
 * with the same hours leaves a reader where they scrolled.
 */
export const getScrollKey = (
	view: string,
	currentDate: Dayjs,
	columns: ColumnHours[]
): string => {
	const hourInstants = columns
		.flatMap(hoursOf)
		.map((hour) => hour.toISOString())
	const distinctHours = [...new Set(hourInstants)].join(',')
	return `${view}-${currentDate.format('YYYY-MM-DD')}-${distinctHours}`
}
