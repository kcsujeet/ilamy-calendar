import type { Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo, useMemo } from 'react'
import { CurrentTimeMarker } from '@/features/calendar/components/current-time-marker'
import { useDragPreviewEvent } from '@/features/calendar/hooks/use-drag-preview-event'
import { useProcessedDayEvents } from '@/features/calendar/hooks/use-processed-day-events'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useDragPreview } from '@/features/calendar/stores/drag-preview-context'
import { GridAxisContext } from '@/features/calendar/stores/grid-axis-context'
import { keys } from '@/features/calendar/utils/keys'
import { layoutVertical } from '@/features/calendar/utils/layout/vertical'
import { VerticalDragPreview } from './vertical-drag-preview'
import { getVerticalEventKey, VerticalEventBar } from './vertical-event-bar'

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
	const resources = useSmartCalendarContext((c) => c.resources)
	const dragPreview = useDragPreview()
	const todayEvents = useProcessedDayEvents({ days, gridType, resourceId })
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	// Stacked resource rows share one continuous now-line; only the first resource
	// (or a non-resource grid) draws the dot at its start, so it isn't repeated.
	const hasNoResourceAxis = resourceId === undefined
	const isFirstResource =
		hasNoResourceAxis || resources?.at(0)?.id === resourceId
	// Only show the "now" line in hour-resolution grids. In day-resolution
	// vertical views (resource month, resource week daily) a sub-day percentage
	// line is meaningless, so suppress it — mirrors the horizontal events layer.
	const showNowLine = gridType === 'hour' && Boolean(rangeStart && rangeEnd)

	// An all-day candidate needs no rejection here: `layoutVertical` decides
	// whether this grid draws all-day events, exactly as it does for real ones.
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
					const elementId = getVerticalEventKey(
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
