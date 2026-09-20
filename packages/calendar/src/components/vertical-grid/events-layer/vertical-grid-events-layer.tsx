import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo, useMemo } from 'react'
import { CurrentTimeMarker } from '@/components/current-time-marker'

import { DragPreviewCard } from '@/components/drag-and-drop/drag-preview-card'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useDragPreview } from '@/contexts/drag-preview-context'
import { GridAxisContext } from '@/contexts/grid-axis-context'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useProcessedDayEvents } from '@/features/calendar/hooks/useProcessedDayEvents'
import { useDragPreviewEvent } from '@/hooks/use-drag-preview-event'
import type { VerticalPositionedEvent } from '@/lib/layout/geometry'
import { layoutVertical } from '@/lib/layout/vertical'
import { timeOfDayPattern } from '@/lib/utils/date-utils'
import { dragSegmentFor } from '@/lib/utils/grab-offset'
import { keys } from '@/lib/utils/keys'
import { VerticalDragPreview } from './vertical-drag-preview'
import { VerticalEventBar, verticalEventKey } from './vertical-event-bar'

interface VerticalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: Dayjs[] // The specific day this layer represents
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
}

const NoMemoVerticalGridEventsLayer: React.FC<VerticalGridEventsLayerProps> = ({
	days,
	gridType = 'hour',
	resourceId,
	resource,
	'data-testid': dataTestId,
}) => {
	const { resources, timeFormat } = useSmartCalendarContext((c) => ({
		resources: c.resources,
		timeFormat: c.timeFormat,
	}))
	const dragPreview = useDragPreview()
	const todayEvents = useProcessedDayEvents({ days, gridType, resourceId })
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	// Stacked resource rows share one continuous now-line; only the first resource
	// (or a non-resource grid) draws the dot at its start, so it isn't repeated.
	const isFirstResource = !resourceId || resources?.at(0)?.id === resourceId
	// Only show the "now" line in hour-resolution grids. In day-resolution
	// vertical views (resource month, resource week daily) a sub-day percentage
	// line is meaningless, so suppress it — mirrors the horizontal events layer.
	const showNowLine = gridType === 'hour' && Boolean(rangeStart && rangeEnd)

	// An all-day candidate needs no rejection here: `layoutVertical` drops
	// all-day events, exactly as it does for real ones.
	const previewEvent = useDragPreviewEvent({ days, gridType, resourceId })
	const previewPositioned = useMemo(() => {
		if (!previewEvent) {
			return null
		}
		const positioned = layoutVertical({
			days,
			gridType,
			events: [previewEvent],
		})
		return positioned.at(0) ?? null
	}, [previewEvent, days, gridType])

	return (
		<GridAxisContext.Provider value="vertical">
			<div
				className="relative w-full h-full pointer-events-none z-10 overflow-clip"
				data-testid={dataTestId}
			>
				{showNowLine && rangeStart && rangeEnd && (
					<CurrentTimeMarker
						rangeEnd={rangeEnd}
						rangeStart={rangeStart}
						resource={resource}
						withDot={isFirstResource}
					/>
				)}
				{todayEvents.map((positioned, index) => {
					const elementId = verticalEventKey(
						positioned.event.id,
						index,
						days,
						resourceId
					)
					return (
						<VerticalEventBar
							draggedEventId={dragPreview?.event.id}
							elementId={elementId}
							key={keys.listKey(elementId, 'wrapper')}
							positioned={positioned}
							range={{ start: rangeStart, end: rangeEnd }}
							resourceId={resourceId}
						/>
					)
				})}
				{previewPositioned && (
					<VerticalDragPreview previewPositioned={previewPositioned} />
				)}
			</div>
		</GridAxisContext.Provider>
	)
}

export const VerticalGridEventsLayer = memo(NoMemoVerticalGridEventsLayer)
