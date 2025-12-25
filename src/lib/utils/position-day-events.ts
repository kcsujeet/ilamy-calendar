import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'

export interface PositionedEvent extends CalendarEvent {
	left: number // Left position in percentage
	width: number // Width in percentage
	top: number // Top position in percentage
	height: number // Height in percentage
	zIndex?: number // Z-index for layering overlapping events
}

interface GetPositionedDayEventsParams {
	days: dayjs.Dayjs[]
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
	const gridStart = days.at(0)?.startOf('day') || dayjs()
	const totalUnits = days.length
	const isDiscrete = gridType === 'day'

	// Step 1: Group events into clusters of overlapping events
	const clusters: CalendarEvent[][] = []
	let currentCluster: CalendarEvent[] = []
	let lastEventEnd: dayjs.Dayjs | null = null
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

	// Step 2: For each cluster, use a more intelligent column assignment
	const processedEvents: PositionedEvent[] = []
	for (const cluster of clusters) {
		if (cluster.length === 1) {
			// Single event takes full width
			const event = cluster[0]

			let startTime = event.start.diff(gridStart, gridType, true)
			let endTime = event.end.diff(gridStart, gridType, true)

			if (isDiscrete) {
				startTime = Math.floor(startTime)
				endTime = Math.ceil(endTime)
				// Ensure at least 1 unit duration for discrete events
				if (endTime <= startTime) {
					endTime = startTime + 1
				}
			}

			// Clamp to grid boundaries
			if (startTime < 0) startTime = 0
			if (endTime > totalUnits) endTime = totalUnits

			const totalDuration = Math.max(0, endTime - startTime)

			// Skip events that are completely outside the grid
			if (totalDuration === 0) continue

			const top = (startTime / totalUnits) * 100
			const height = (totalDuration / totalUnits) * 100

			processedEvents.push({ ...event, left: 0, width: 100, top, height })
			continue
		}

		// Multiple events - use layered positioning approach
		// Sort by duration (longest first), then by start time
		const sortedCluster = [...cluster].sort((a, b) => {
			const aDuration = a.end.diff(a.start, 'minute')
			const bDuration = b.end.diff(b.start, 'minute')

			// Longer events first
			if (aDuration !== bDuration) {
				return bDuration - aDuration
			}

			// If same duration, earlier start time first
			return a.start.diff(b.start)
		})

		// Process events with layered positioning
		const totalEvents = sortedCluster.length

		// Calculate dynamic offset based on number of overlapping events
		// Fewer events = larger individual offsets, more events = smaller offsets
		let maxOffset: number
		if (totalEvents === 2) {
			maxOffset = 25 // 25% offset for 2 events
		} else if (totalEvents === 3) {
			maxOffset = 50 // 50% total for 3 events (25% each)
		} else if (totalEvents === 4) {
			maxOffset = 60 // 60% total for 4 events (20% each)
		} else {
			maxOffset = 70 // 70% total for 5+ events
		}

		const offsetPerEvent = totalEvents > 1 ? maxOffset / (totalEvents - 1) : 0

		for (let i = 0; i < sortedCluster.length; i++) {
			const event = sortedCluster[i]

			let startTime = event.start.diff(gridStart, gridType, true)
			let endTime = event.end.diff(gridStart, gridType, true)

			if (isDiscrete) {
				startTime = Math.floor(startTime)
				endTime = Math.ceil(endTime)
				if (endTime <= startTime) {
					endTime = startTime + 1
				}
			}

			// Clamp to grid boundaries
			if (startTime < 0) startTime = 0
			if (endTime > totalUnits) endTime = totalUnits

			const totalDuration = Math.max(0, endTime - startTime)

			if (totalDuration === 0) continue

			const top = (startTime / totalUnits) * 100
			const height = (totalDuration / totalUnits) * 100

			// Calculate positioning based on layer and total events
			let left: number
			let width: number
			let zIndex: number

			if (i === 0) {
				// First event (longest) takes full width at bottom
				left = 0
				width = 100
				zIndex = 1
			} else {
				// Subsequent events are offset dynamically based on total event count
				left = offsetPerEvent * i
				width = 100 - left // Remaining width
				zIndex = i + 1 // Higher z-index for events on top
			}

			processedEvents.push({
				...event,
				left,
				width,
				top,
				height,
				zIndex,
			})
		}
	}

	return processedEvents
}
