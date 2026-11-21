import { layoutVertical } from '@ilamy/core'
import type { Resource } from '@ilamy/types'
import { add, type ZonedDate } from '@ilamy/utils/temporal'
import { memo, useMemo } from 'react'
import { GridNowLine } from '@/features/views/components/grid-now-line'
import { useHiddenDaysOfGrid } from '@/features/views/hooks/use-hidden-days-of-grid'
import { useProcessedDayEvents } from '@/features/views/hooks/use-processed-day-events'
import { useDragPreviewEvent } from '@/hooks/use-drag-preview-event'
import { useDragPreview } from '@/stores/drag-preview-context'
import { GridAxisContext } from '@/stores/grid-axis-context'
import { keys } from '@/utils/keys.utils'
import { VerticalDragPreview } from './vertical-drag-preview'
import { getVerticalEventKey, VerticalEventBar } from './vertical-event-bar'

interface VerticalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: ZonedDate[]
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
	const dragPreview = useDragPreview()
	const todayEvents = useProcessedDayEvents({ days, gridType, resourceId })
	const rangeStart = days.at(0)
	const lastSlot = days.at(-1)
	const rangeEnd = lastSlot ? add(lastSlot, 1, gridType) : undefined
	const hiddenDaysOfDayGrid = useHiddenDaysOfGrid(gridType)
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
