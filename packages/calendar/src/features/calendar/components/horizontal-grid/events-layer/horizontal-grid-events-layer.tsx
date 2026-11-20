import { type HorizontalPositionedEvent, layoutHorizontal } from '@ilamy/core'
import type { Resource } from '@ilamy/types'
import { add, startOf, type ZonedDate } from '@ilamy/utils/temporal'
import { memo, useMemo } from 'react'
import { DAY_NUMBER_HEIGHT } from '@/config/constants'
import { GridNowLine } from '@/features/calendar/components/grid-now-line'
import { useDragPreviewEvent } from '@/features/calendar/hooks/use-drag-preview-event'
import { useHiddenDaysOfGrid } from '@/features/calendar/hooks/use-hidden-days-of-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useDragPreview } from '@/features/calendar/stores/drag-preview-context'
import { GridAxisContext } from '@/features/calendar/stores/grid-axis-context'
import { keys } from '@/features/calendar/utils/keys'
import { HorizontalDragPreview } from './horizontal-drag-preview'
import {
	getHorizontalEventKey,
	HorizontalEventBar,
} from './horizontal-event-bar'

const PREVIEW_ROW_CAP = 1

interface HorizontalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: ZonedDate[]
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
	positionedEvents: HorizontalPositionedEvent[]
	dayNumberHeight?: number
	allDay?: boolean
}

interface DragPreviewInput {
	days: ZonedDate[]
	gridType: 'day' | 'hour'
	resourceId?: string | number
	allDay?: boolean
}

const useDragPreviewPositioned = ({
	days,
	gridType,
	resourceId,
	allDay,
}: DragPreviewInput) => {
	const previewEvent = useDragPreviewEvent({
		days,
		gridType,
		resourceId,
		allDay,
	})
	return useMemo(() => {
		if (!previewEvent) {
			return null
		}
		const { positionedEvents } = layoutHorizontal({
			days,
			gridType,
			events: [previewEvent],
			dayMaxEvents: PREVIEW_ROW_CAP,
		})
		return positionedEvents.at(0) ?? null
	}, [previewEvent, days, gridType])
}

const NoMemoHorizontalGridEventsLayer: React.FC<
	HorizontalGridEventsLayerProps
> = ({
	gridType = 'day',
	days,
	resourceId,
	resource,
	'data-testid': dataTestId,
	positionedEvents,
	dayNumberHeight = DAY_NUMBER_HEIGHT,
	allDay,
}) => {
	const { eventHeight, eventSpacing } = useSmartCalendarContext()
	const dragPreview = useDragPreview()
	const firstDay = days.at(0)
	const lastDay = days.at(-1)
	const weekStart = firstDay ? startOf(firstDay, 'day') : undefined
	const rangeStart = firstDay
	const rangeEnd = lastDay ? add(lastDay, 1, gridType) : undefined
	const hiddenDaysOfDayGrid = useHiddenDaysOfGrid(gridType)

	const getRowTop = (row: number) =>
		dayNumberHeight + eventSpacing + row * (eventHeight + eventSpacing)

	const previewPositioned = useDragPreviewPositioned({
		days,
		gridType,
		resourceId,
		allDay,
	})

	return (
		<GridAxisContext.Provider value="horizontal">
			<div
				className="absolute inset-0 pointer-events-none z-10 overflow-clip"
				data-testid={dataTestId}
			>
				<GridNowLine
					axis="horizontal"
					days={days}
					gridType={gridType}
					resource={resource}
					resourceId={resourceId}
				/>
				{positionedEvents.map((positioned) => {
					const elementId = getHorizontalEventKey(
						positioned,
						weekStart,
						resourceId
					)
					return (
						<HorizontalEventBar
							draggedEventId={dragPreview?.event.id}
							elementId={elementId}
							eventHeight={eventHeight}
							gridType={gridType}
							hiddenDays={hiddenDaysOfDayGrid}
							key={keys.listKey(elementId, 'wrapper')}
							positioned={positioned}
							range={{ start: rangeStart, end: rangeEnd }}
							resourceId={resourceId}
							top={getRowTop(positioned.row)}
						/>
					)
				})}
				{previewPositioned && (
					<HorizontalDragPreview
						previewPositioned={previewPositioned}
						top={getRowTop(previewPositioned.row)}
					/>
				)}
			</div>
		</GridAxisContext.Provider>
	)
}

export const HorizontalGridEventsLayer = memo(NoMemoHorizontalGridEventsLayer)
