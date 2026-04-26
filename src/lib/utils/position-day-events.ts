import type { CalendarEvent } from '@/components/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'

export interface PositionedEvent extends CalendarEvent {
	left: number // Left position in percentage
	width: number // Width in percentage
	top: number // Top position in percentage
	height: number // Height in percentage
	zIndex?: number // Z-index for layering overlapping events
}

interface GetPositionedDayEventsParams {
	days: Dayjs[]
	gridType?: 'day' | 'hour' | 'minute'
	events: CalendarEvent[]
}

export const getPositionedDayEvents = ({
	days,
	gridType = 'hour',
	events,
}: GetPositionedDayEventsParams): PositionedEvent[] => {
	// Filter out all-day events and sort by start time
	const sortedEvents = events
		.filter((e) => !e.allDay)
		.toSorted((a, b) => a.start.diff(b.start))

	if (sortedEvents.length === 0) {
		return []
	}

	// Determine grid boundaries and metrics
	// Use explicit startOf to ensure we are anchored to the grid unit boundaries
	// This prevents offsets if the grid days are not normalized
	const gridStart = days.at(0) || dayjs()
	const totalUnits = days.length
	const isDiscrete = gridType === 'day'

	// Step 1: Group events into clusters of overlapping events
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

	// Compute top/height percentages for an event, clamped to grid; null if outside.
	const computeTopHeight = (
		event: CalendarEvent
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

	// Max cluster offset by event count (2 events → 25%, etc.)
	const maxOffsetByCount = (n: number) =>
		n === 2 ? 25 : n === 3 ? 50 : n === 4 ? 60 : 70

	// Step 2: For each cluster, compute positions
	const processedEvents: PositionedEvent[] = []
	for (const cluster of clusters) {
		if (cluster.length === 1) {
			const event = cluster[0]
			const pos = computeTopHeight(event)
			if (!pos) continue
			processedEvents.push({ ...event, left: 0, width: 100, ...pos })
			continue
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

		for (let i = 0; i < n; i++) {
			const event = sortedCluster[i]
			const pos = computeTopHeight(event)
			if (!pos) continue
			// First event (longest) takes full width; later events are offset.
			const left = i === 0 ? 0 : offsetPerEvent * i
			processedEvents.push({
				...event,
				...pos,
				left,
				width: 100 - left,
				zIndex: i + 1,
			})
		}
	}

	return processedEvents
}
