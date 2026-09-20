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
import { useDragPreviewEvent } from '@/hooks/use-drag-preview-event'
import { DAY_NUMBER_HEIGHT } from '@/lib/constants'
import type { HorizontalPositionedEvent } from '@/lib/layout/geometry'
import { layoutHorizontal } from '@/lib/layout/horizontal'
import { timeOfDayPattern } from '@/lib/utils/date-utils'
import { dragSegmentFor } from '@/lib/utils/grab-offset'
import { keys } from '@/lib/utils/keys'
import { HorizontalDragPreview } from './horizontal-drag-preview'
import { HorizontalEventBar, horizontalEventKey } from './horizontal-event-bar'

/**
 * The preview is a single bar, so it never competes for a row and is never the
 * one that overflows. `layoutHorizontal` still wants a cap.
 */
const PREVIEW_ROW_CAP = 1

interface HorizontalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: Dayjs[]
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
	positionedEvents: HorizontalPositionedEvent[]
	/** Pixel offset reserved above the bars (the day-number strip). */
	dayNumberHeight?: number
	/**
	 * True for the all-day band, which shows only all-day events. A month row
	 * leaves it unset and shows both kinds — same rule the real events take
	 * through `useProcessedWeekEvents`.
	 */
	allDay?: boolean
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
	const { eventHeight, eventSpacing, resources } = useSmartCalendarContext()
	const dragPreview = useDragPreview()
	const weekStart = days.at(0)?.startOf('day')
	// Stacked resource rows share one continuous now-line; only the first resource
	// (or a non-resource grid) draws the dot at its start, so it isn't repeated.
	const isFirstResource = !resourceId || resources?.at(0)?.id === resourceId

	// Now-line is gated to hour-resolution horizontal grids (resource day horizontal,
	// resource week horizontal hourly). Day-resolution grids — regular MonthView and
	// resource MonthView — skip it; a 24h-percentage line per cell would be a
	// meaningless 1px sliver.
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	const showNowLine = gridType === 'hour' && Boolean(rangeStart && rangeEnd)

	// Layout returns the abstract row; the renderer owns the CSS units. Shared
	// so the preview cannot drift from the bar it mirrors.
	const rowTop = (row: number) =>
		dayNumberHeight + eventSpacing + row * (eventHeight + eventSpacing)

	const previewEvent = useDragPreviewEvent({
		days,
		gridType,
		resourceId,
		allDay,
	})
	const previewPositioned = useMemo(() => {
		if (!previewEvent) {
			return null
		}
		const positioned = layoutHorizontal({
			days,
			gridType,
			events: [previewEvent],
			dayMaxEvents: PREVIEW_ROW_CAP,
		})
		return positioned.at(0) ?? null
	}, [previewEvent, days, gridType])

	return (
		<GridAxisContext.Provider value="horizontal">
			<div
				className="absolute inset-0 pointer-events-none z-10 overflow-clip"
				data-testid={dataTestId}
			>
				{showNowLine && rangeStart && rangeEnd && (
					<CurrentTimeMarker
						axis="horizontal"
						rangeEnd={rangeEnd}
						rangeStart={rangeStart}
						resource={resource}
						withDot={isFirstResource}
					/>
				)}
				{positionedEvents.map((positioned) => {
					const elementId = horizontalEventKey(
						positioned,
						weekStart,
						resourceId
					)
					return (
						<HorizontalEventBar
							draggedEventId={dragPreview?.event.id}
							elementId={elementId}
							eventHeight={eventHeight}
							key={keys.listKey(elementId, 'wrapper')}
							positioned={positioned}
							range={{ start: rangeStart, end: rangeEnd }}
							resourceId={resourceId}
							top={rowTop(positioned.row)}
						/>
					)
				})}
				{previewPositioned && (
					<HorizontalDragPreview
						previewPositioned={previewPositioned}
						top={rowTop(previewPositioned.row)}
					/>
				)}
			</div>
		</GridAxisContext.Provider>
	)
}

export const HorizontalGridEventsLayer = memo(NoMemoHorizontalGridEventsLayer)
