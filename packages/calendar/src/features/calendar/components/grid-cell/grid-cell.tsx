import type { HorizontalCellLayout } from '@ilamy/core'
import { cn } from '@ilamy/ui/lib/utils'
import type { TimeAxis } from '@ilamy/utils/helpers'
import type { ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { memo, useRef } from 'react'
import { useIsCellUnavailable } from '@/features/calendar/hooks/use-is-cell-unavailable'
import type { DragPreviewState } from '@/features/calendar/stores/drag-preview-context'
import { keys } from '@/features/calendar/utils/keys'
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
	day: ZonedDate
	hour?: number
	minute?: number
	slotDurationMinutes?: number
	dayMaxEvents?: number
	className?: string
	resourceId?: string | number
	gridType?: 'day' | 'hour'
	shouldRenderEvents?: boolean
	allDay?: boolean
	showDayNumber?: boolean
	weekNumber?: number
	children?: React.ReactNode
	'data-testid'?: string
	precomputedLayout?: HorizontalCellLayout
	isSubDivider?: boolean
	axis?: TimeAxis
	dropSlots?: DropColumnData['slots']
	slotIndex?: number
	dragPreview?: DragPreviewState | null
}

const getCellTestId = (
	day: ZonedDate,
	gridType: 'day' | 'hour',
	callerTestId: string | undefined
) => {
	if (callerTestId) {
		return callerTestId
	}
	if (gridType === 'hour') {
		return keys.cell.day(day, day.hour, day.minute)
	}
	return keys.cell.day(day)
}

interface GridCellBodyProps
	extends Pick<
			GridProps,
			'day' | 'precomputedLayout' | 'weekNumber' | 'children'
		>,
		Required<Pick<GridProps, 'showDayNumber'>> {
	allEventsDialogRef: React.RefObject<AllEventDialogHandle | null>
}

const GridCellBody: React.FC<GridCellBodyProps> = ({
	day,
	precomputedLayout,
	showDayNumber,
	weekNumber,
	allEventsDialogRef,
	children,
}) => (
	<GridCellContent
		day={day}
		showDayNumber={showDayNumber}
		weekNumber={weekNumber}
	>
		{precomputedLayout && (
			<GridCellEvents
				allEventsDialogRef={allEventsDialogRef}
				day={day}
				precomputedLayout={precomputedLayout}
			/>
		)}
		{children}
	</GridCellContent>
)

type GridCellTargetProps = DroppableCellProps &
	Pick<GridProps, 'dropSlots' | 'slotIndex' | 'dragPreview'>

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
	const isShaded = useIsCellUnavailable({
		day,
		gridType,
		slotDurationMinutes,
		resourceId,
	})
	const testId = getCellTestId(day, gridType, dataTestId)

	const cellProps: DroppableCellProps = {
		allDay,
		axis,
		className: cn(
			'cursor-pointer overflow-clip p-1 bg-background not-in-data-dragging:hover:bg-accent min-h-[60px] relative min-w-0',
			className
		),
		'data-testid': testId,
		date: day,
		shaded: isShaded,
		hour,
		isSubDivider,
		minute,
		resourceId,
		slotDurationMinutes,
		type: 'day-cell',
	}
	const body = (
		<GridCellBody
			allEventsDialogRef={allEventsDialogRef}
			day={day}
			precomputedLayout={precomputedLayout}
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

			{shouldRenderEvents && <AllEventDialog ref={allEventsDialogRef} />}
		</>
	)
}

export const GridCell = memo(NoMemoGridCell) as typeof NoMemoGridCell
