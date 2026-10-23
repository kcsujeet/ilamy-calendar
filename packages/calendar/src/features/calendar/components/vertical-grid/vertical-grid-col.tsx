import { useDroppable } from '@dnd-kit/core'
import type { VerticalColumnSpec } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { memo, useId, useMemo } from 'react'
import { useDragPreviewEvent } from '@/features/calendar/hooks/use-drag-preview-event'
import type { StickyInsetSide } from '@/features/calendar/hooks/use-sticky-insets'
import {
	type DragPreviewState,
	useDragPreview,
} from '@/features/calendar/stores/drag-preview-context'
import { keys } from '@/features/calendar/utils/keys'
import type { DropColumnData } from '../drag-and-drop/dnd-utils'
import { GridCell } from '../grid-cell/grid-cell'
import { VerticalGridEventsLayer } from './events-layer/vertical-grid-events-layer'

export interface VerticalGridColProps extends VerticalColumnSpec {
	'data-testid'?: string
	'data-sticky-inset'?: StickyInsetSide
	/**
	 * Granularity of each hour row in minutes. `60` renders one cell per hour with
	 * no sub-hour lines. `30` renders two. `15` renders four with dashed separators.
	 */
	slotDurationMinutes?: number
}

/** The 1px of Tailwind's `gap-px`, which draws the lines between a column's rows. */
const ROW_GAP_PX = 1

/** The minute each slot of an hour starts at: `[0, 15, 30, 45]` for 15-minute slots. */
const getSlotOffsets = (slotDurationMinutes: number): number[] =>
	Array.from(
		{ length: Math.floor(60 / slotDurationMinutes) },
		(_, i) => i * slotDurationMinutes
	)

interface ColumnRowsProps
	extends Pick<
		VerticalGridColProps,
		'id' | 'days' | 'gridType' | 'renderCell'
	> {
	resourceId?: string | number
	slotDurationMinutes: number
	slots: DropColumnData['slots']
	/** The drag, given only when it lands on this column. */
	dragPreview: DragPreviewState | null
}

/**
 * The rows of a column: its cells, or what `renderCell` draws in their place.
 * Memoized apart from the column, which re-renders on every drag step to learn
 * whether the drag lands on it, so that a step that changes nothing here does
 * not rebuild thousands of cells.
 */
const NoMemoColumnRows: React.FC<ColumnRowsProps> = ({
	id,
	days,
	gridType,
	renderCell,
	resourceId,
	slotDurationMinutes,
	slots,
	dragPreview,
}) => {
	const cellOffsets = getSlotOffsets(slotDurationMinutes)
	const hasSubHourSlots = cellOffsets.length > 1
	return (
		<>
			{days.map((day, dayIndex) => {
				const hourStr = day.format('HH')

				if (renderCell) {
					const isTimeGutter = id === keys.col.time
					const testId = isTimeGutter
						? keys.cell.verticalTime(hourStr)
						: keys.cell.vertical(day, hourStr, '00', resourceId)
					return (
						<div
							className="min-h-[60px] bg-background"
							data-hour={isTimeGutter ? hourStr : undefined}
							data-testid={testId}
							key={keys.listKey(dayIndex, hourStr)}
						>
							{renderCell(day)}
						</div>
					)
				}

				return (
					<div
						className="flex flex-col min-h-[60px]"
						key={keys.listKey(dayIndex, hourStr)}
					>
						{cellOffsets.map((minute, offsetIndex) => {
							const mm = String(minute).padStart(2, '0')
							const testId = keys.cell.vertical(day, hourStr, mm, resourceId)
							// Sub-hour slots keep a dashed divider (the documented gap
							// exception) between sub-slots within an hour; the solid hour
							// lines come from the grid's gap-px.
							const isSubDivider =
								hasSubHourSlots && offsetIndex < cellOffsets.length - 1

							return (
								<GridCell
									axis="vertical"
									className={cn(
										'not-in-data-dragging:hover:bg-accent relative z-10 flex-1 min-h-0 cursor-pointer',
										isSubDivider && 'border-b border-dashed'
									)}
									data-testid={testId}
									day={hasSubHourSlots ? day.minute(minute) : day}
									dragPreview={dragPreview}
									dropSlots={slots}
									gridType={gridType}
									// Match the horizontal grid: a daily cell describes the
									// whole day (hour undefined); an hourly cell its slot.
									// Passing the hour for daily cells made them 00:00-01:00
									// slots, breaking drag-to-create's cross-day selection.
									hour={gridType === 'hour' ? day.hour() : undefined}
									isSubDivider={isSubDivider}
									key={keys.listKey(dayIndex, mm)}
									minute={hasSubHourSlots ? minute : undefined}
									resourceId={resourceId} // Events are rendered in a separate layer
									shouldRenderEvents={false}
									slotDurationMinutes={slotDurationMinutes}
									slotIndex={dayIndex * cellOffsets.length + offsetIndex}
								/>
							)
						})}
					</div>
				)
			})}
		</>
	)
}

const ColumnRows = memo(NoMemoColumnRows)

const NoMemoVerticalGridCol: React.FC<VerticalGridColProps> = ({
	id,
	days,
	resource,
	'data-testid': dataTestId,
	'data-sticky-inset': stickyInset,
	gridType,
	className,
	renderCell,
	noEvents,
	slotDurationMinutes = 60,
}) => {
	// The spec carries `resource` as the single source; derive the id here.
	const resourceId = resource?.id

	// The column is the one drop target; its slots publish themselves into
	// `slots` (see DropColumnData). The time gutter draws no slots, so it is no
	// target.
	const slotsPerRow = getSlotOffsets(slotDurationMinutes).length
	const totalSlots = days.length * slotsPerRow
	const slots = useMemo<DropColumnData['slots']>(
		() => Array.from({ length: totalSlots }, () => undefined),
		[totalSlots]
	)
	// The drag, for the slots of a column it lands on only; for every other
	// column the slots see none, so a drag step re-renders one column's slots,
	// not all of them.
	const dragPreview = useDragPreview()
	// Asked as the events layer asks it (its `hour` default), so both agree on
	// which column the drag lands on.
	const dragLandsOnColumn =
		useDragPreviewEvent({ days, gridType: gridType ?? 'hour', resourceId }) !==
		null
	const columnDragPreview = dragLandsOnColumn ? dragPreview : null

	const { setNodeRef } = useDroppable({
		id: useId(),
		data: { slots, slotsPerRow, rowGap: ROW_GAP_PX },
		disabled: renderCell !== undefined,
	})

	return (
		<div
			className={cn(
				// Opaque column; grid lines come from the gaps in the containers
				// (this one for vertical separators between columns is the parent's job).
				'flex flex-col flex-1 items-center min-w-20 justify-center bg-background relative',
				className
			)}
			data-sticky-inset={stickyInset}
			data-testid={dataTestId || keys.container.vertical.col(id)}
		>
			{/* Time slots. gap-px + bg-border draws the hour lines through the gaps. */}
			<div
				className="w-full h-full relative grid gap-px bg-border"
				ref={setNodeRef}
				style={{
					gridTemplateRows: `repeat(${days.length}, minmax(0, 1fr))`,
				}}
			>
				<ColumnRows
					days={days}
					dragPreview={columnDragPreview}
					gridType={gridType}
					id={id}
					renderCell={renderCell}
					resourceId={resourceId}
					slotDurationMinutes={slotDurationMinutes}
					slots={slots}
				/>

				{/* Event blocks layer */}
				{!noEvents && (
					<div className="absolute inset-0 z-10 pointer-events-none">
						<VerticalGridEventsLayer
							data-testid={keys.container.eventsLayer('vertical', id)}
							days={days}
							gridType={gridType}
							resource={resource}
							resourceId={resourceId}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

export const VerticalGridCol = memo(
	NoMemoVerticalGridCol
) as typeof NoMemoVerticalGridCol
