import {
	isSameOrAfter,
	maxDate,
	now,
	parseDate,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type { CalendarEvent } from '../core-calendar.types'
import {
	createDayColumnSpanner,
	type ZonedBounds,
} from './core-layout-columns.utils'
import type {
	ColumnSpan,
	VerticalPositionedEvent,
} from './core-layout-geometry.utils'

export interface VerticalLayoutInput {
	days: ZonedDate[]
	gridType?: 'day' | 'hour' | 'minute'
	events: CalendarEvent[]
}

interface ParsedEvent {
	event: CalendarEvent
	bounds: ZonedBounds
}

type DayColumnSpanner = (bounds: ZonedBounds) => ColumnSpan | null

interface GridMetrics {
	days: ZonedDate[]
	gridStart: ZonedDate
	totalUnits: number
	gridType: 'day' | 'hour' | 'minute'
	spanDayColumns: DayColumnSpanner | null
}

const clusterOverlappingEvents = (
	sortedEvents: ParsedEvent[]
): ParsedEvent[][] => {
	const clusters: ParsedEvent[][] = []
	let currentCluster: ParsedEvent[] = []
	let lastEventEnd: ZonedDate | null = null
	for (const item of sortedEvents) {
		if (lastEventEnd && isSameOrAfter(item.bounds.start, lastEventEnd)) {
			if (currentCluster.length > 0) {
				clusters.push(currentCluster)
			}
			currentCluster = []
		}
		currentCluster.push(item)
		if (lastEventEnd) {
			lastEventEnd = maxDate(lastEventEnd, item.bounds.end)
		} else {
			lastEventEnd = item.bounds.end
		}
	}
	if (currentCluster.length > 0) {
		clusters.push(currentCluster)
	}
	return clusters
}

const clusterOverlappingDayRows = (
	sortedEvents: ParsedEvent[],
	spanDayColumns: DayColumnSpanner
): ParsedEvent[][] => {
	const clusters: ParsedEvent[][] = []
	let currentCluster: ParsedEvent[] = []
	let lastEndCol = -1
	for (const item of sortedEvents) {
		const span = spanDayColumns(item.bounds)
		if (!span) continue
		if (span.startCol > lastEndCol && currentCluster.length > 0) {
			clusters.push(currentCluster)
			currentCluster = []
		}
		currentCluster.push(item)
		lastEndCol = Math.max(lastEndCol, span.endCol)
	}
	if (currentCluster.length > 0) {
		clusters.push(currentCluster)
	}
	return clusters
}

interface TopHeight {
	top: number
	height: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}

const computeDayRowsTopHeight = (
	bounds: ZonedBounds,
	dayCount: number,
	spanDayColumns: DayColumnSpanner
): TopHeight | null => {
	const span = spanDayColumns(bounds)
	if (!span) return null
	const rowCount = span.endCol - span.startCol + 1
	return {
		top: (span.startCol / dayCount) * 100,
		height: (rowCount / dayCount) * 100,
		isTruncatedStart: span.isTruncatedStart,
		isTruncatedEnd: span.isTruncatedEnd,
	}
}

const computeTopHeight = (
	bounds: ZonedBounds,
	{ days, gridStart, totalUnits, gridType, spanDayColumns }: GridMetrics
): TopHeight | null => {
	if (spanDayColumns) {
		return computeDayRowsTopHeight(bounds, days.length, spanDayColumns)
	}
	let startTime = wallClockDiff(bounds.start, gridStart, gridType)
	let endTime = wallClockDiff(bounds.end, gridStart, gridType)
	const isTruncatedStart = startTime < 0
	const isTruncatedEnd = endTime > totalUnits
	if (isTruncatedStart) startTime = 0
	if (isTruncatedEnd) endTime = totalUnits
	const duration = Math.max(0, endTime - startTime)
	if (duration === 0) return null
	return {
		top: (startTime / totalUnits) * 100,
		height: (duration / totalUnits) * 100,
		isTruncatedStart,
		isTruncatedEnd,
	}
}

const MAX_OFFSET_PERCENT_BY_COUNT: Record<number, number> = {
	2: 25,
	3: 50,
	4: 60,
}
const DEFAULT_MAX_OFFSET_PERCENT = 70
const getMaxOffsetPercent = (count: number): number =>
	MAX_OFFSET_PERCENT_BY_COUNT[count] ?? DEFAULT_MAX_OFFSET_PERCENT

const placeCluster = (
	cluster: ParsedEvent[],
	metrics: GridMetrics
): VerticalPositionedEvent[] => {
	const onlyItem = cluster.length === 1 ? cluster.at(0) : undefined
	if (onlyItem) {
		const pos = computeTopHeight(onlyItem.bounds, metrics)
		if (!pos) return []
		return [
			{ kind: 'vertical', event: onlyItem.event, left: 0, width: 100, ...pos },
		]
	}

	const sortedCluster = cluster.toSorted((a, b) => {
		const aDuration =
			a.bounds.end.epochMilliseconds - a.bounds.start.epochMilliseconds
		const bDuration =
			b.bounds.end.epochMilliseconds - b.bounds.start.epochMilliseconds
		const durDiff = bDuration - aDuration
		if (durDiff !== 0) {
			return durDiff
		}
		return a.bounds.start.epochMilliseconds - b.bounds.start.epochMilliseconds
	})

	const count = sortedCluster.length
	const offsetPerEvent =
		count > 1 ? getMaxOffsetPercent(count) / (count - 1) : 0
	const placed: VerticalPositionedEvent[] = []

	for (let index = 0; index < count; index++) {
		const item = sortedCluster.at(index)
		if (!item) continue
		const pos = computeTopHeight(item.bounds, metrics)
		if (!pos) continue
		const left = index === 0 ? 0 : offsetPerEvent * index
		placed.push({
			kind: 'vertical',
			event: item.event,
			...pos,
			left,
			width: 100 - left,
			zIndex: index + 1,
		})
	}
	return placed
}

/** Positions events inside a vertical day or hour grid column. */
export const layoutVertical = ({
	days,
	gridType = 'hour',
	events,
}: VerticalLayoutInput): VerticalPositionedEvent[] => {
	const isDayGrid = gridType === 'day'
	const zone = days.at(0)?.timeZoneId
	const drawnEvents = isDayGrid ? events : events.filter((e) => !e.allDay)

	const parsedEvents: ParsedEvent[] = []
	for (const event of drawnEvents) {
		const start = parseDate(event.start, zone)
		const end = parseDate(event.end, zone)
		if (!start || !end) continue
		parsedEvents.push({ event, bounds: { start, end } })
	}

	const sortedEvents = parsedEvents.toSorted(
		(a, b) =>
			a.bounds.start.epochMilliseconds - b.bounds.start.epochMilliseconds
	)

	if (sortedEvents.length === 0) {
		return []
	}

	const metrics: GridMetrics = {
		days,
		gridStart: days.at(0) ?? now(zone),
		totalUnits: days.length,
		gridType,
		spanDayColumns: isDayGrid ? createDayColumnSpanner(days) : null,
	}

	let clusters: ParsedEvent[][]
	if (metrics.spanDayColumns) {
		clusters = clusterOverlappingDayRows(sortedEvents, metrics.spanDayColumns)
	} else {
		clusters = clusterOverlappingEvents(sortedEvents)
	}
	return clusters.flatMap((cluster) => placeCluster(cluster, metrics))
}
