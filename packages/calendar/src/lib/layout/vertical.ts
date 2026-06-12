import type { CalendarEvent } from '@/components/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import type { VerticalPositionedEvent } from './geometry'

export interface VerticalLayoutInput {
	days: Dayjs[]
	gridType?: 'day' | 'hour' | 'minute'
	events: CalendarEvent[]
}

interface GridMetrics {
	gridStart: Dayjs
	totalUnits: number
	gridType: 'day' | 'hour' | 'minute'
	isDiscrete: boolean
}

// --- Phase 1: cluster -------------------------------------------------------

/** Groups time-sorted events into clusters of transitively overlapping events. */
const clusterOverlappingEvents = (
	sortedEvents: CalendarEvent[]
): CalendarEvent[][] => {
	const clusters: CalendarEvent[][] = []
	let currentCluster: CalendarEvent[] = []
	let lastEventEnd: Dayjs | null = null
	for (const event of sortedEvents) {
		if (lastEventEnd && event.start.isSameOrAfter(lastEventEnd)) {
			if (currentCluster.length > 0) {
				clusters.push(currentCluster)
			}
			currentCluster = []
		}
		currentCluster.push(event)
		lastEventEnd = lastEventEnd ? dayjs.max(lastEventEnd, event.end) : event.end
	}
	if (currentCluster.length > 0) {
		clusters.push(currentCluster)
	}
	return clusters
}

// --- Phase 2: geometry ------------------------------------------------------

/** Top/height percentages for an event, clamped to the grid; null if outside. */
const computeTopHeight = (
	event: CalendarEvent,
	{ gridStart, totalUnits, gridType, isDiscrete }: GridMetrics
): { top: number; height: number } | null => {
	let startTime = event.start.diff(gridStart, gridType, true)
	let endTime = event.end.diff(gridStart, gridType, true)
	if (isDiscrete) {
		startTime = Math.floor(startTime)
		endTime = Math.ceil(endTime)
		if (endTime <= startTime) endTime = startTime + 1
	}
	if (startTime < 0) startTime = 0
	if (endTime > totalUnits) endTime = totalUnits
	const duration = Math.max(0, endTime - startTime)
	if (duration === 0) return null
	return {
		top: (startTime / totalUnits) * 100,
		height: (duration / totalUnits) * 100,
	}
}

// Max cluster offset by event count; clusters of 5 or more cap at 70%.
const maxOffsetPercentByCount: Record<number, number> = {
	2: 25,
	3: 50,
	4: 60,
}
const defaultMaxOffsetPercent = 70
const maxOffsetByCount = (n: number) =>
	maxOffsetPercentByCount[n] ?? defaultMaxOffsetPercent

// --- Phase 3: place ---------------------------------------------------------

/** Positions one cluster: a lone event spans full width; layered otherwise. */
const placeCluster = (
	cluster: CalendarEvent[],
	metrics: GridMetrics
): VerticalPositionedEvent[] => {
	const onlyEvent = cluster.length === 1 ? cluster.at(0) : undefined
	if (onlyEvent) {
		const pos = computeTopHeight(onlyEvent, metrics)
		if (!pos) return []
		return [{ kind: 'vertical', event: onlyEvent, left: 0, width: 100, ...pos }]
	}

	// Multiple events — layered positioning. Longest duration first, tie-break
	// by earliest start.
	const sortedCluster = [...cluster].sort((a, b) => {
		const durDiff =
			b.end.diff(b.start, 'minute') - a.end.diff(a.start, 'minute')
		return durDiff !== 0 ? durDiff : a.start.diff(b.start)
	})

	const n = sortedCluster.length
	const offsetPerEvent = n > 1 ? maxOffsetByCount(n) / (n - 1) : 0

	const placed: VerticalPositionedEvent[] = []
	for (let i = 0; i < n; i++) {
		const event = sortedCluster.at(i)
		if (!event) continue
		const pos = computeTopHeight(event, metrics)
		if (!pos) continue
		// First event (longest) takes full width; later events are offset.
		const left = i === 0 ? 0 : offsetPerEvent * i
		placed.push({
			kind: 'vertical',
			event,
			...pos,
			left,
			width: 100 - left,
			zIndex: i + 1,
		})
	}
	return placed
}

// --- Entry point ------------------------------------------------------------

export const layoutVertical = ({
	days,
	gridType = 'hour',
	events,
}: VerticalLayoutInput): VerticalPositionedEvent[] => {
	// Filter out all-day events and sort by start time
	const sortedEvents = events
		.filter((e) => !e.allDay)
		.toSorted((a, b) => a.start.diff(b.start))

	if (sortedEvents.length === 0) {
		return []
	}

	// Grid boundaries and metrics, anchored to the grid unit boundaries.
	const metrics: GridMetrics = {
		gridStart: days.at(0) || dayjs(),
		totalUnits: days.length,
		gridType,
		isDiscrete: gridType === 'day',
	}

	return clusterOverlappingEvents(sortedEvents).flatMap((cluster) =>
		placeCluster(cluster, metrics)
	)
}
