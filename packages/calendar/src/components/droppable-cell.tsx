import { useDroppable } from '@dnd-kit/core'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useDragPreview } from '@/contexts/drag-preview-context'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { CellInfo } from '@/features/calendar/types'
import { DISABLED_CELL_CLASSNAME } from '@/lib/constants'
import { isPreviewOnTarget } from '@/lib/utils/drag-preview'

interface DroppableCellProps {
	id: string
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
	resourceId?: string | number
	allDay?: boolean
	children?: React.ReactNode
	className?: string
	style?: React.CSSProperties
	'data-testid'?: string
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
	const start = date.hour(hour ?? 0).minute(minute ?? 0)

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

/**
 * Whether the in-flight drag would land on this cell. `end` is exclusive
 * (#248); `isPreviewOnTarget` takes the last instant the cell covers.
 *
 * A boolean is all the cell needs: it reports the landing on
 * `data-drop-target` and paints nothing itself.
 */
const useDragLandsHere = (
	cellRange: { start: Dayjs; end: Dayjs },
	resourceId: string | number | undefined,
	allDay: boolean | undefined
): boolean => {
	const dragPreview = useDragPreview()
	return isPreviewOnTarget(dragPreview, {
		rangeStart: cellRange.start,
		rangeEnd: cellRange.end.subtract(1, 'millisecond'),
		resourceId,
		allDay,
	})
}

interface CellClassInput {
	className?: string
	customClassName?: string
	disabledClass: string
	clickBlocked: boolean
	cellDisabled: boolean
}

const cellClasses = ({
	className,
	customClassName,
	disabledClass,
	clickBlocked,
	cellDisabled,
}: CellClassInput) =>
	cn(
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

export function DroppableCell({
	id,
	type,
	date,
	hour,
	minute,
	slotDurationMinutes,
	resourceId,
	allDay,
	children,
	className,
	style,
	'data-testid': dataTestId,
	disabled = false,
}: DroppableCellProps) {
	const {
		onCellClick,
		isCellDisabled,
		getCellClassName,
		getResourceById,
		disableDragAndDrop,
		disableCellClick,
		classesOverride,
		view,
	} = useSmartCalendarContext()

	const { start, end } = getCellRange(date, hour, minute, slotDurationMinutes)
	// `getResourceById` is only present on resource calendars; regular calendars resolve to undefined.
	const resource = getResourceById?.(resourceId)
	const cellInfo: CellInfo = { start, end, resource, allDay }

	// Disabled by business hours (`disabled` prop) or the consumer's predicate.
	const cellDisabled = disabled || Boolean(isCellDisabled?.(cellInfo))
	const clickBlocked = disableCellClick || cellDisabled

	const { isOver, setNodeRef } = useDroppable({
		id,
		data: { type, date, hour, minute, resourceId, allDay },
		disabled: disableDragAndDrop || cellDisabled,
	})

	const handleCellClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (clickBlocked) {
			return
		}
		onCellClick(cellInfo)
	}

	const landsHere = useDragLandsHere({ start, end }, resourceId, allDay)
	// `isOver` alone is not enough: a grab offset moves the candidate off the
	// cell the pointer is on, and the cells it does cover must light up too.
	const isDropTarget = isOver || landsHere
	const dropAllowed = !disableDragAndDrop && !cellDisabled
	const showDropHighlight = isDropTarget && dropAllowed

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The cell is interactive for event creation
		// biome-ignore lint/a11y/useKeyWithClickEvents: Key events are handled by parent components
		<div
			className={cellClasses({
				className,
				customClassName: getCellClassName?.(cellInfo),
				disabledClass: classesOverride?.disabledCell || DISABLED_CELL_CLASSNAME,
				clickBlocked,
				cellDisabled,
			})}
			data-all-day={allDay ? 'true' : undefined}
			data-disabled={cellDisabled.toString()}
			data-drop-target={showDropHighlight ? 'true' : undefined}
			data-end={end.toISOString()}
			data-resource-id={resourceId}
			data-start={start.toISOString()}
			data-testid={dataTestId}
			data-view={view}
			onClick={handleCellClick}
			ref={setNodeRef}
			style={style}
		>
			{showDropHighlight && (
				<div
					aria-hidden="true"
					className="absolute inset-0 pointer-events-none"
					style={{ backgroundColor: DROP_TARGET_HIGHLIGHT }}
				/>
			)}
			{children}
		</div>
	)
}
