import type { Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo, useMemo } from 'react'
import { DAY_NUMBER_HEIGHT } from '@/config/constants'
import { GridNowLine } from '@/features/calendar/components/grid-now-line'
import { useDragPreviewEvent } from '@/features/calendar/hooks/use-drag-preview-event'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useDragPreview } from '@/features/calendar/stores/drag-preview-context'
import { GridAxisContext } from '@/features/calendar/stores/grid-axis-context'
import { keys } from '@/features/calendar/utils/keys'
import type { HorizontalPositionedEvent } from '@/features/calendar/utils/layout/geometry'
import { layoutHorizontal } from '@/features/calendar/utils/layout/horizontal'
import { HorizontalDragPreview } from './horizontal-drag-preview'
import {
	getHorizontalEventKey,
	HorizontalEventBar,
} from './horizontal-event-bar'

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

interface DragPreviewInput {
	days: Dayjs[]
	gridType: 'day' | 'hour'
	resourceId?: string | number
	allDay?: boolean
}

/** The in-flight drag candidate laid out on this layer, or null when none lands here. */
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
		const positioned = layoutHorizontal({
			days,
			gridType,
			events: [previewEvent],
			dayMaxEvents: PREVIEW_ROW_CAP,
		})
		return positioned.at(0) ?? null
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
	const weekStart = days.at(0)?.startOf('day')
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)

	// Layout returns the abstract row; the renderer owns the CSS units. Shared
	// so the preview cannot drift from the bar it mirrors.
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
