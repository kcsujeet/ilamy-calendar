import { useDroppable } from '@dnd-kit/core'
import { cn } from '@ilamy/ui/lib/utils'
import {
	getCellMinutes,
	resolveSnapDuration,
	type TimeAxis,
} from '@ilamy/utils/helpers'
import {
	add,
	startOf,
	toOffsetIso,
	toUtcIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type React from 'react'
import { useId } from 'react'
import { DISABLED_CELL_CLASSNAME } from '@/config/constants'
import { useCalendarCellContext } from '@/hooks/use-calendar-cell-context'
import { useSlotProps } from '@/stores/calendar-theme-context'
import {
	type DragPreviewState,
	useDragPreview,
} from '@/stores/drag-preview-context'
import type { CellInfo } from '@/types/calendar.types'
import type { DropCellData, DropColumnData } from '@/utils/dnd.utils'
import { isPreviewOnTarget } from '@/utils/drag-preview.utils'

export interface DroppableCellProps {
	type: 'day-cell' | 'time-cell'
	date: ZonedDate
	hour?: number
	minute?: number
	slotDurationMinutes: number
	axis?: TimeAxis
	resourceId?: string | number
	/** True for cells in the all-day row band. */
	allDay?: boolean
	children?: React.ReactNode
	className?: string
	style?: React.CSSProperties
	'data-testid'?: string
	isSubDivider?: boolean
	/**
	 * Visual shading only (e.g. outside business hours or month padding day).
	 * In v4.0 shaded cells remain clickable and accept drops unless refused by
	 * `isCellDisabled` or `eventConstraint`/`selectConstraint`.
	 */
	shaded?: boolean
	/** Hard refusal (consumer-driven); blocks clicks and drops. */
	disabled?: boolean
}

function getCellRange(
	date: ZonedDate,
	hour: number | undefined,
	minute: number | undefined,
	slotDurationMinutes: number
): { start: ZonedDate; end: ZonedDate } {
	if (hour === undefined) {
		const start = startOf(date, 'day')
		return { start, end: startOf(add(start, 1, 'day'), 'day') }
	}
	const start = withTime(date, {
		hour,
		minute: minute ?? 0,
		second: 0,
		millisecond: 0,
	})
	const durationMinutes = minute !== undefined ? slotDurationMinutes : 60
	return { start, end: add(start, durationMinutes, 'minute') }
}

function getFinerSnapMinutes(
	hour: number | undefined,
	minute: number | undefined,
	slotDurationMinutes: number,
	snapDuration: number | undefined
): number | undefined {
	if (hour === undefined) {
		return undefined
	}
	const cellMinutes = getCellMinutes(minute, slotDurationMinutes)
	const snapMinutes = resolveSnapDuration(snapDuration, cellMinutes)
	return snapMinutes < cellMinutes ? snapMinutes : undefined
}

const DROP_TARGET_HIGHLIGHT = 'rgba(188, 232, 241, 0.3)'

const DropTargetHighlight = () => (
	<div
		aria-hidden="true"
		className="absolute inset-0 pointer-events-none"
		style={{ backgroundColor: DROP_TARGET_HIGHLIGHT }}
	/>
)

interface DragLandsOnCellInput {
	dragPreview: DragPreviewState | null
	cellRange: { start: ZonedDate; end: ZonedDate }
	data: DropCellData
}

const dragLandsOnCell = ({
	dragPreview,
	cellRange,
	data,
}: DragLandsOnCellInput): boolean =>
	isPreviewOnTarget(dragPreview, {
		rangeStart: cellRange.start,
		rangeEnd: add(cellRange.end, -1, 'millisecond'),
		resourceId: data.resourceId,
		allDay: data.allDay,
	})

interface DropHighlightInput {
	isOver: boolean
	cellRange: { start: ZonedDate; end: ZonedDate }
	data: DropCellData
}

const useShowDropHighlight = ({
	isOver,
	cellRange,
	data,
}: DropHighlightInput): boolean => {
	const dragPreview = useDragPreview()
	const landsHere = dragLandsOnCell({ dragPreview, cellRange, data })
	const isRefused = dragPreview?.isDropAllowed === false
	return (isOver || landsHere) && !isRefused
}

const useDropTarget = (data: DropCellData) => {
	const { isOver, setNodeRef } = useDroppable({
		id: useId(),
		data,
	})
	return { isOver, setNodeRef }
}

interface CellDataInput {
	reportsAllDay: boolean
	cellDisabled: boolean
	shaded: boolean
	showDropHighlight: boolean
	isSubDivider: boolean
	snapMinutes?: number
	axis?: TimeAxis
	range: { start: ZonedDate; end: ZonedDate }
	resourceId?: string | number
	dataTestId?: string
	view: string
}

const getCellDataAttributes = ({
	reportsAllDay,
	cellDisabled,
	shaded,
	showDropHighlight,
	isSubDivider,
	snapMinutes,
	axis,
	range,
	resourceId,
	dataTestId,
	view,
}: CellDataInput) => ({
	'data-all-day': reportsAllDay ? 'true' : undefined,
	'data-disabled': cellDisabled.toString(),
	'data-non-business': shaded ? 'true' : undefined,
	'data-drop-target': showDropHighlight ? 'true' : undefined,
	'data-end': toUtcIso(range.end),
	'data-resource-id': resourceId,
	'data-slot-divider': isSubDivider ? 'true' : undefined,
	'data-snap-minutes': snapMinutes,
	'data-start': toUtcIso(range.start),
	'data-time-axis': snapMinutes === undefined ? undefined : axis,
	'data-testid': dataTestId,
	'data-view': view,
})

const isCellRefusing = (
	disabled: boolean,
	isCellDisabled: ((info: CellInfo) => boolean) | undefined,
	cellInfo: CellInfo
): boolean => {
	if (disabled) {
		return true
	}
	return Boolean(isCellDisabled?.(cellInfo))
}

const useCellModel = ({
	type,
	date,
	hour,
	minute,
	slotDurationMinutes,
	axis,
	resourceId,
	allDay,
	shaded = false,
	disabled = false,
}: DroppableCellProps) => {
	const {
		view,
		isCellDisabled,
		getResourceById,
		disableCellClick,
		snapDuration,
	} = useCalendarCellContext()

	const range = getCellRange(date, hour, minute, slotDurationMinutes)
	const resource = getResourceById?.(resourceId)
	// D11: Month day-grid cells report `allDay: true` on click and drag-to-create
	// (FullCalendar `DayGridRows.tsx:256`, v7.1.1). Drop data keeps `allDay` true
	// ONLY for the all-day row band so dragging a timed event in month view keeps
	// its time of day (`EventDragging.ts:450`).
	const isMonthDayCell = view === 'month' && hour === undefined
	const reportsAllDay = Boolean(allDay) || isMonthDayCell
	const cellInfo: CellInfo = {
		start: toOffsetIso(range.start),
		end: toOffsetIso(range.end),
		resource,
		allDay: reportsAllDay,
	}

	const cellDisabled = isCellRefusing(disabled, isCellDisabled, cellInfo)
	const clickBlocked = Boolean(disableCellClick) || cellDisabled

	const snapMinutes = getFinerSnapMinutes(
		hour,
		minute,
		slotDurationMinutes,
		snapDuration
	)

	const data: DropCellData = {
		type,
		date,
		hour,
		minute,
		slotDurationMinutes,
		snapMinutes,
		axis,
		resourceId,
		allDay,
		disabled: cellDisabled,
	}
	return {
		range,
		cellInfo,
		cellDisabled,
		shaded,
		reportsAllDay,
		clickBlocked,
		snapMinutes,
		data,
	}
}

interface CellFrameProps extends DroppableCellProps {
	cell: ReturnType<typeof useCellModel>
	showDropHighlight: boolean
	elementRef?: (node: HTMLElement | null) => void
}

type CellSlotStyle = { className?: string; style?: React.CSSProperties }

const pickCellOverlay = (
	cellDisabled: boolean,
	shaded: boolean,
	disabledSlot: CellSlotStyle,
	shadedSlot: CellSlotStyle
): CellSlotStyle | undefined => {
	if (cellDisabled) {
		return disabledSlot
	}
	if (shaded) {
		return shadedSlot
	}
	return undefined
}

const mergeCellSlotStyles = (
	base: CellSlotStyle,
	overlay: CellSlotStyle | undefined
): { className: string; style: React.CSSProperties | undefined } => {
	const className = cn(base.className, overlay?.className)
	const style = { ...base.style, ...overlay?.style }
	return {
		className,
		style: Object.keys(style).length > 0 ? style : undefined,
	}
}

const CellFrame = ({
	cell,
	showDropHighlight,
	elementRef,
	axis,
	resourceId,
	children,
	className,
	style,
	'data-testid': dataTestId,
	isSubDivider = false,
}: CellFrameProps) => {
	const { onCellClick, getCellClassName, classesOverride, view } =
		useCalendarCellContext()
	const {
		range,
		cellInfo,
		cellDisabled,
		shaded,
		reportsAllDay,
		clickBlocked,
		snapMinutes,
	} = cell

	const disabledClass = classesOverride?.disabledCell || DISABLED_CELL_CLASSNAME
	const cellSlot = useSlotProps('cell', {
		structuralClassName: 'droppable-cell relative',
		defaultClassName: clickBlocked ? 'cursor-default' : 'cursor-pointer',
		extraClassName: cn(className, getCellClassName?.(cellInfo)),
		style,
	})
	const shadedSlot = useSlotProps('cellNonBusiness', {
		defaultClassName: 'bg-secondary/60 text-muted-foreground',
	})
	const disabledSlot = useSlotProps('cellDisabled', {
		defaultClassName: disabledClass,
	})

	const activeOverlay = pickCellOverlay(
		cellDisabled,
		shaded,
		disabledSlot,
		shadedSlot
	)
	const { className: mergedClassName, style: mergedStyle } =
		mergeCellSlotStyles(cellSlot, activeOverlay)

	const handleCellClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!clickBlocked) {
			onCellClick(cellInfo)
		}
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The cell is interactive for event creation
		// biome-ignore lint/a11y/useKeyWithClickEvents: Key events are handled by parent components
		<div
			className={mergedClassName}
			{...getCellDataAttributes({
				reportsAllDay,
				cellDisabled,
				shaded,
				showDropHighlight,
				isSubDivider,
				snapMinutes,
				axis,
				range,
				resourceId,
				dataTestId,
				view,
			})}
			onClick={handleCellClick}
			ref={elementRef}
			style={mergedStyle}
		>
			{showDropHighlight && <DropTargetHighlight />}
			{children}
		</div>
	)
}

export function DroppableCell(props: DroppableCellProps) {
	const cell = useCellModel(props)
	const { isOver, setNodeRef } = useDropTarget(cell.data)
	const showDropHighlight = useShowDropHighlight({
		isOver,
		cellRange: cell.range,
		data: cell.data,
	})
	return (
		<CellFrame
			{...props}
			cell={cell}
			elementRef={setNodeRef}
			showDropHighlight={showDropHighlight}
		/>
	)
}

interface SlotCellProps extends DroppableCellProps {
	slots: DropColumnData['slots']
	slotIndex: number
	dragPreview: DragPreviewState | null
}

export function SlotCell({
	slots,
	slotIndex,
	dragPreview,
	...props
}: SlotCellProps) {
	const cell = useCellModel(props)
	const publish = (element: HTMLElement | null) => {
		slots[slotIndex] = element ? { data: cell.data, element } : undefined
	}
	const showDropHighlight = dragLandsOnCell({
		dragPreview,
		cellRange: cell.range,
		data: cell.data,
	})
	return (
		<CellFrame
			{...props}
			cell={cell}
			elementRef={publish}
			showDropHighlight={showDropHighlight}
		/>
	)
}
