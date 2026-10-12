import type { Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo, useMemo } from 'react'
import { GridNowLine } from '@/features/calendar/components/grid-now-line'
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
	const hiddenDays = useSmartCalendarContext((c) => c.hiddenDays)
	const dragPreview = useDragPreview()
	const todayEvents = useProcessedDayEvents({ days, gridType, resourceId })
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	// Day-resolution grids hide whole day columns; hour grids never do.
	const isHourGrid = gridType === 'hour'
	const hiddenDaysOfDayGrid = isHourGrid ? undefined : hiddenDays
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
				<GridNowLine
					axis="vertical"
					days={days}
					gridType={gridType}
					resource={resource}
					resourceId={resourceId}
				/>
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
							hiddenDays={hiddenDaysOfDayGrid}
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
