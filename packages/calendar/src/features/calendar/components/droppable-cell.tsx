import { useDroppable } from '@dnd-kit/core'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import {
	getCellMinutes,
	resolveSnapDuration,
	type TimeAxis,
} from '@ilamy/utils/helpers'
import type React from 'react'
import { useId } from 'react'
import { DISABLED_CELL_CLASSNAME } from '@/config/constants'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'
import {
	type DragPreviewState,
	useDragPreview,
} from '@/features/calendar/stores/drag-preview-context'
import type { CellInfo } from '@/features/calendar/types'
import { isPreviewOnTarget } from '@/features/calendar/utils/drag-preview'
import type { DropCellData, DropColumnData } from './drag-and-drop/dnd-utils'

export interface DroppableCellProps {
	type: 'day-cell' | 'time-cell'
	date: Dayjs
	hour?: number
	minute?: number
	/**
	 * Duration of a minute-level cell, in minutes. Only meaningful when
	 * `minute` is set; ignored for hour cells (always 60) and day cells
	 * (always the full day). Only the vertical grid renders minute-level
	 * cells, so this is inert on the horizontal one.
	 */
	slotDurationMinutes: number
	/** The axis time runs along in the grid that drew the cell; set on hour cells. */
	axis?: TimeAxis
	resourceId?: string | number
	allDay?: boolean
	children?: React.ReactNode
	className?: string
	style?: React.CSSProperties
	'data-testid'?: string
	/**
	 * Whether this cell draws the dashed sub-hour divider below itself. Emitted
	 * as `data-slot-divider` so a consumer can hide or restyle just those lines
	 * from a stylesheet (`[data-slot-divider] { border-bottom-style: none }`),
	 * which is how you get sub-hour drag targets without the visual clutter.
	 * The library ships no CSS, so a stable selector is the whole affordance.
	 */
	isSubDivider?: boolean
	disabled?: boolean
}

/**
 * The time span a cell represents, chosen by how precisely the caller located
 * the cell rather than by which view is rendering: a `slotDurationMinutes`-wide
 * slot when `minute` is given, a one-hour slot when only `hour` is, and the
 * whole day when neither is.
 *
 * Only the vertical grid passes `minute`, and `slotDuration` only reaches that
 * engine (`view-renderer.tsx`). Resource calendars default to the horizontal
 * engine, so they report one-hour cells whatever `slotDuration` is set to;
 * `orientation="vertical"` is what makes it apply (#255).
 */
function getCellRange(
	date: Dayjs,
	hour: number | undefined,
	minute: number | undefined,
	slotDurationMinutes: number
): { start: Dayjs; end: Dayjs } {
	// A day cell is given any time of day (the day view passes `currentDate`),
	// and `.hour(0)` would keep that moment's UTC offset: on the day the clocks
	// spring forward the day would start an hour early, on the previous day.
	// `startOf('day')` finds the day's own midnight.
	const start =
		hour === undefined
			? date.startOf('day')
			: date.hour(hour).minute(minute ?? 0)

	if (hour !== undefined && minute !== undefined) {
		return { start, end: start.add(slotDurationMinutes, 'minute') }
	}
	if (hour !== undefined) {
		return { start, end: start.hour(hour + 1).minute(0) }
	}
	// The next midnight, not 23:59: `end` is exclusive, which is what the slot
	// and hour branches above already report (#248).
	return { start, end: start.add(1, 'day').startOf('day') }
}

/**
 * The size a drag, resize or selection snaps to inside a time cell, when that
 * is finer than the cell; undefined otherwise, so a cell that snaps to itself
 * says nothing. A cell without a `minute` is an hour long.
 */
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

/**
 * The tint a cell wears while a drag would land on it, taken from FullCalendar
 * rather than invented: v6 ships `--fc-highlight-color:rgba(188,232,241,.3)`
 * behind `.fc .fc-highlight{background:var(--fc-highlight-color)}`, and v4's
 * `core/main.css` spells the same colour `#bce8f1` at `opacity: .3`.
 *
 * A fixed literal, not a theme token, and deliberately so. Two earlier attempts
 * failed on exactly that point: a grey tint sits on the same axis as the
 * disabled and hover fills, which in a monochrome theme (the demo sets
 * `--primary` and `--foreground` to the same black) makes all three
 * indistinguishable; and a tint in the DRAGGED EVENT's own colour is the same
 * hue as the mirror standing on it. This pale cyan can collide with neither.
 */
const DROP_TARGET_HIGHLIGHT = 'rgba(188, 232, 241, 0.3)'

/** The tint itself, so the cell's own body stays about being a cell. */
const DropTargetHighlight = () => (
	<div
		aria-hidden="true"
		className="absolute inset-0 pointer-events-none"
		style={{ backgroundColor: DROP_TARGET_HIGHLIGHT }}
	/>
)

interface DragLandsOnCellInput {
	dragPreview: DragPreviewState | null
	cellRange: { start: Dayjs; end: Dayjs }
	data: DropCellData
}

/**
 * Whether the in-flight drag would land on this cell. `end` is exclusive
 * (#248); `isPreviewOnTarget` takes the last instant the cell covers.
 *
 * A boolean is all the cell needs. The tint it draws is one fixed colour, and
 * `data-drop-target` carries no payload either, so neither reader wants the
 * candidate itself.
 */
const dragLandsOnCell = ({
	dragPreview,
	cellRange,
	data,
}: DragLandsOnCellInput): boolean =>
	isPreviewOnTarget(dragPreview, {
		rangeStart: cellRange.start,
		rangeEnd: cellRange.end.subtract(1, 'millisecond'),
		resourceId: data.resourceId,
		allDay: data.allDay,
	})

interface DropHighlightInput {
	/** Whether dnd-kit says the pointer is over this very cell. */
	isOver: boolean
	cellRange: { start: Dayjs; end: Dayjs }
	data: DropCellData
}

/**
 * Whether to tint the cell: the drag would land across it.
 *
 * `isOver` alone is not enough: a grab offset moves the candidate off the
 * cell the pointer is on, and the cells it does cover must light up too. A
 * refused placement draws no tint, not even on the cell under the pointer.
 *
 * Over an ALLOWED placement the cells it spans tint, closed ones included: a
 * multi-day drag crosses closed days, and leaving those cells grey makes the
 * bar look like it is crossing unavailable ground.
 */
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

/**
 * Registers the cell as a drop target of its own.
 *
 * A disabled cell stays REGISTERED so the pointer can be released there and
 * the drag keeps a preview to refuse: `data.disabled` makes the drop a no-op
 * (`getUpdatedEvent`) and marks the placement refused, which draws nothing and
 * leaves the not-allowed cursor as the signal. Refusing the hit-test instead
 * left `over` null, which swapped that for a floating chip the moment the
 * pointer crossed a closed day.
 */
const useDropTarget = (data: DropCellData) => {
	const { isOver, setNodeRef } = useDroppable({
		// An id for the cell, not for its date. dnd-kit re-registers a droppable
		// whenever its id changes and copies its whole registry each time, so a
		// date-based id made every navigation cost O(cells²) (#300). `data`
		// still carries the date, and the drop reads it from there.
		id: useId(),
		data,
	})
	return { isOver, setNodeRef }
}

interface CellDataInput {
	allDay?: boolean
	cellDisabled: boolean
	showDropHighlight: boolean
	isSubDivider: boolean
	snapMinutes?: number
	axis?: TimeAxis
	range: { start: Dayjs; end: Dayjs }
	resourceId?: string | number
	dataTestId?: string
	view: string
}

/**
 * What the cell tells the outside world about itself: its range, whether it
 * refuses drops, whether a drag lands across it, and whether it draws the
 * sub-hour divider. These are the library's styling and testing surface, since
 * it ships no CSS of its own.
 */
const getCellDataAttributes = ({
	allDay,
	cellDisabled,
	showDropHighlight,
	isSubDivider,
	snapMinutes,
	axis,
	range,
	resourceId,
	dataTestId,
	view,
}: CellDataInput) => ({
	'data-all-day': allDay ? 'true' : undefined,
	'data-disabled': cellDisabled.toString(),
	'data-drop-target': showDropHighlight ? 'true' : undefined,
	'data-end': range.end.toISOString(),
	'data-resource-id': resourceId,
	'data-slot-divider': isSubDivider ? 'true' : undefined,
	'data-snap-minutes': snapMinutes,
	'data-start': range.start.toISOString(),
	'data-time-axis': snapMinutes === undefined ? undefined : axis,
	'data-testid': dataTestId,
	'data-view': view,
})

/**
 * Whether the cell refuses interaction: closed by business hours (`disabled`)
 * or by the consumer's `isCellDisabled` predicate, when they gave one.
 */
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

interface CellClassInput {
	className?: string
	customClassName?: string
	disabledClassOverride?: string
	clickBlocked: boolean
	cellDisabled: boolean
}

const getCellClasses = ({
	className,
	customClassName,
	disabledClassOverride,
	clickBlocked,
	cellDisabled,
}: CellClassInput) => {
	const disabledClass = disabledClassOverride || DISABLED_CELL_CLASSNAME
	return cn(
		// `relative` so the drop-target highlight, which is this component's own
		// `absolute inset-0` child, is positioned against the cell rather than
		// against whatever happens to be the nearest positioned ancestor. The one
		// current caller passes it too; owning it here means the next one need not.
		'droppable-cell relative',
		className,
		customClassName,
		clickBlocked ? 'cursor-default' : 'cursor-pointer',
		cellDisabled && disabledClass
	)
}

/**
 * What a cell works out about itself, whichever way it takes part in a drop:
 * the span it covers, whether it refuses interaction, and the data a drop reads.
 */
const useCellModel = ({
	type,
	date,
	hour,
	minute,
	slotDurationMinutes,
	axis,
	resourceId,
	allDay,
	disabled = false,
}: DroppableCellProps) => {
	const { isCellDisabled, getResourceById, disableCellClick, snapDuration } =
		useCalendarCellContext()

	const range = getCellRange(date, hour, minute, slotDurationMinutes)
	// `getResourceById` is only present on resource calendars; regular calendars resolve to undefined.
	const resource = getResourceById?.(resourceId)
	const cellInfo: CellInfo = { ...range, resource, allDay }

	const cellDisabled = isCellRefusing(disabled, isCellDisabled, cellInfo)
	const clickBlocked = disableCellClick || cellDisabled

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
	return { range, cellInfo, cellDisabled, clickBlocked, snapMinutes, data }
}

interface CellFrameProps extends DroppableCellProps {
	cell: ReturnType<typeof useCellModel>
	showDropHighlight: boolean
	elementRef?: (node: HTMLElement | null) => void
}

/** The cell's element: its attributes, classes, click and the tint it wears under a drag. */
const CellFrame = ({
	cell,
	showDropHighlight,
	elementRef,
	axis,
	resourceId,
	allDay,
	children,
	className,
	style,
	'data-testid': dataTestId,
	isSubDivider = false,
}: CellFrameProps) => {
	const { onCellClick, getCellClassName, classesOverride, view } =
		useCalendarCellContext()
	const { range, cellInfo, cellDisabled, clickBlocked, snapMinutes } = cell

	const handleCellClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (clickBlocked) {
			return
		}
		onCellClick(cellInfo)
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The cell is interactive for event creation
		// biome-ignore lint/a11y/useKeyWithClickEvents: Key events are handled by parent components
		<div
			className={getCellClasses({
				className,
				customClassName: getCellClassName?.(cellInfo),
				disabledClassOverride: classesOverride?.disabledCell,
				clickBlocked,
				cellDisabled,
			})}
			{...getCellDataAttributes({
				allDay,
				cellDisabled,
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
			style={style}
		>
			{showDropHighlight && <DropTargetHighlight />}
			{children}
		</div>
	)
}

/** A cell that is a drop target of its own: a day cell, an all-day cell, a timeline hour. */
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
	/** The column's slots, which the column registered as its one drop target. */
	slots: DropColumnData['slots']
	slotIndex: number
	/** The drag, given only when it lands on this cell's column. */
	dragPreview: DragPreviewState | null
}

/**
 * A slot of a time column: it looks and behaves as a `DroppableCell` does, but
 * is not registered with dnd-kit. It publishes its data to the column's drop
 * target, which finds it from the pointer (`getSnappedOverData`).
 *
 * It tints only where the candidate lands, and is told the drag by its column
 * rather than reading it: a cell reading the context re-rendered all 20,000
 * slots of a 30-resource week on every drag step, and a column hands the drag
 * only to the slots it lands on, so every other column's slots bail out.
 */
export function SlotCell({
	slots,
	slotIndex,
	dragPreview,
	...props
}: SlotCellProps) {
	const cell = useCellModel(props)
	// A ref callback, not an effect: it runs on every commit of the cell like an
	// effect without dependencies would, for a fraction of the cost (an effect
	// per slot added 0.8 s to mounting 20,000 of them).
	const publish = () => {
		slots[slotIndex] = cell.data
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
