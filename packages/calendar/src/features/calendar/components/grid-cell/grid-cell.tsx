import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type { TimeAxis } from '@ilamy/utils/helpers'
import type React from 'react'
import { memo, useRef } from 'react'
import { useIsCellUnavailable } from '@/features/calendar/hooks/use-is-cell-unavailable'
import type { DragPreviewState } from '@/features/calendar/stores/drag-preview-context'
import { keys } from '@/features/calendar/utils/keys'
import type { HorizontalCellLayout } from '@/features/calendar/utils/layout/geometry'
import type { DropColumnData } from '../drag-and-drop/dnd-utils'
import {
	DroppableCell,
	type DroppableCellProps,
	SlotCell,
} from '../droppable-cell'
import { AllEventDialog, type AllEventDialogHandle } from './all-events-dialog'
import { GridCellContent } from './grid-cell-content'
import { GridCellEvents } from './grid-cell-events'

interface GridProps {
	day: Dayjs
	hour?: number
	minute?: number
	/** Span of an hour-grid slot, for business-hour containment. */
	slotDurationMinutes?: number
	dayMaxEvents?: number
	className?: string
	resourceId?: string | number
	/** Whether the cell spans a day (month, all-day row) or an hour slot. */
	gridType?: 'day' | 'hour'
	/** False in time grids, whose events are drawn by a separate layer. */
	shouldRenderEvents?: boolean
	allDay?: boolean
	showDayNumber?: boolean
	/** Shown before the day number, for the first cell of a week row. */
	weekNumber?: number
	children?: React.ReactNode
	'data-testid'?: string
	precomputedLayout?: HorizontalCellLayout
	/** Whether this cell draws the dashed sub-hour divider below itself. */
	isSubDivider?: boolean
	/** The axis time runs along in the grid, for cells of an hour grid. */
	axis?: TimeAxis
	/**
	 * Set when the cell is one slot of a time column, which is the drop target:
	 * the column's slots, and this cell's place among them.
	 */
	dropSlots?: DropColumnData['slots']
	slotIndex?: number
	/** The drag, given only when it lands on the cell's column. */
	dragPreview?: DragPreviewState | null
}

/**
 * The caller's test id, or the cell's own. The own one is built only when
 * needed: the time grid always passes one, and formatting a key it then
 * discarded was a measurable share of navigating a large time grid.
 */
const getCellTestId = (
	day: Dayjs,
	gridType: 'day' | 'hour',
	callerTestId: string | undefined
) => {
	if (callerTestId) {
		return callerTestId
	}
	if (gridType === 'hour') {
		return keys.cell.day(day, day.format('HH'), day.format('mm'))
	}
	return keys.cell.day(day)
}

interface GridCellBodyProps
	extends Pick<
			GridProps,
			'day' | 'resourceId' | 'precomputedLayout' | 'weekNumber' | 'children'
		>,
		Required<
			Pick<
				GridProps,
				'gridType' | 'allDay' | 'shouldRenderEvents' | 'showDayNumber'
			>
		> {
	allEventsDialogRef: React.RefObject<AllEventDialogHandle | null>
}

/** What goes inside the droppable cell: the day header, then its events and any children. */
const GridCellBody: React.FC<GridCellBodyProps> = ({
	day,
	gridType,
	allDay,
	resourceId,
	precomputedLayout,
	showDayNumber,
	weekNumber,
	shouldRenderEvents,
	allEventsDialogRef,
	children,
}) => (
	<GridCellContent
		day={day}
		showDayNumber={showDayNumber}
		weekNumber={weekNumber}
	>
		{shouldRenderEvents && (
			<GridCellEvents
				allDay={allDay}
				allEventsDialogRef={allEventsDialogRef}
				day={day}
				gridType={gridType}
				precomputedLayout={precomputedLayout}
				resourceId={resourceId}
			/>
		)}
		{children}
	</GridCellContent>
)

type GridCellTargetProps = DroppableCellProps &
	Pick<GridProps, 'dropSlots' | 'slotIndex' | 'dragPreview'>

/** The cell's element: a slot of its column's drop target when it has one, a drop target of its own otherwise. */
const GridCellTarget: React.FC<GridCellTargetProps> = ({
	dropSlots,
	slotIndex,
	dragPreview = null,
	...cellProps
}) => {
	if (dropSlots === undefined || slotIndex === undefined) {
		return <DroppableCell {...cellProps} />
	}
	return (
		<SlotCell
			{...cellProps}
			dragPreview={dragPreview}
			slotIndex={slotIndex}
			slots={dropSlots}
		/>
	)
}

const NoMemoGridCell: React.FC<GridProps> = ({
	day,
	hour,
	minute,
	slotDurationMinutes = 60,
	className = '',
	resourceId,
	gridType = 'day',
	shouldRenderEvents = true,
	allDay = false,
	precomputedLayout,
	'data-testid': dataTestId,
	showDayNumber = false,
	weekNumber,
	isSubDivider = false,
	axis,
	children,
	...columnSlot
}) => {
	const allEventsDialogRef = useRef<AllEventDialogHandle>(null)
	const isUnavailable = useIsCellUnavailable({
		day,
		gridType,
		slotDurationMinutes,
		resourceId,
	})
	const testId = getCellTestId(day, gridType, dataTestId)

	const cellProps = {
		allDay,
		axis,
		className: cn(
			'cursor-pointer overflow-clip p-1 bg-background not-in-data-dragging:hover:bg-accent min-h-[60px] relative min-w-0',
			className
		),
		'data-testid': testId,
		date: day,
		disabled: isUnavailable,
		hour,
		isSubDivider,
		minute,
		resourceId,
		slotDurationMinutes,
		type: 'day-cell' as const,
	}
	const body = (
		<GridCellBody
			allDay={allDay}
			allEventsDialogRef={allEventsDialogRef}
			day={day}
			gridType={gridType}
			precomputedLayout={precomputedLayout}
			resourceId={resourceId}
			shouldRenderEvents={shouldRenderEvents}
			showDayNumber={showDayNumber}
			weekNumber={weekNumber}
		>
			{children}
		</GridCellBody>
	)

	return (
		<>
			<GridCellTarget {...cellProps} {...columnSlot}>
				{body}
			</GridCellTarget>

			{/* Only a cell that draws events can show "+N more", the dialog's one
			    opener. Time-grid slots draw none, and a closed dialog in each of
			    their thousands still cost a quarter to a third of navigating a
			    15-minute resource week (#300). */}
			{shouldRenderEvents && <AllEventDialog ref={allEventsDialogRef} />}
		</>
	)
}

export const GridCell = memo(NoMemoGridCell) as typeof NoMemoGridCell
