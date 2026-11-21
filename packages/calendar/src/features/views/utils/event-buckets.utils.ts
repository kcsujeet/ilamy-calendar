import { endOf, startOf, type ZonedDate } from '@ilamy/utils/temporal'

/** Span of one column (a day or an hour), cached per `ZonedDate` instance. */
export interface ColumnBounds {
	start: ZonedDate
	end: ZonedDate
	startMs: number
	endMs: number
}

export type ColumnUnit = 'day' | 'hour'

const boundsByUnit: Record<ColumnUnit, WeakMap<ZonedDate, ColumnBounds>> = {
	day: new WeakMap(),
	hour: new WeakMap(),
}

/** Computes and caches `[startOf(unit), endOf(unit)]` for a grid column. */
export const getColumnBounds = (
	day: ZonedDate,
	unit: ColumnUnit
): ColumnBounds => {
	const cache = boundsByUnit[unit]
	const cached = cache.get(day)
	if (cached) {
		return cached
	}
	const start = startOf(day, unit)
	const end = endOf(day, unit)
	const bounds: ColumnBounds = {
		start,
		end,
		startMs: start.epochMilliseconds,
		endMs: end.epochMilliseconds,
	}
	cache.set(day, bounds)
	return bounds
}
