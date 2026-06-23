import type { CellInfo, Resource } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDragGesture } from '../hooks/use-drag-gesture'
import type { DragToCreateOptions } from '../types'
import { type RawCell, readCell } from '../utils/read-cell'
import { intersectRect, type Rect, unionRect } from '../utils/rect'
import { computeRange, isSameRegion } from '../utils/selection'

/** Where the selection highlight mounts and the rect (in that box's space). */
interface Mirror {
	rect: Rect
	/**
	 * The grid's scroll content (`data-calendar-scroll-content`) to mount inside,
	 * or null to fall back to a fixed overlay on the body.
	 */
	content: HTMLElement | null
}

/**
 * Positions the mirror inside the grid's scroll content so the overlay scrolls
 * with the cells, is clipped by the scroll viewport, and is painted *beneath*
 * the sticky header / resource column (which sit at higher z within the same
 * box). The rect is relative to that content box, which already moves with the
 * scroll, so no scroll offset is needed. Falls back to a fixed overlay clipped
 * to the calendar viewport when no scroll content is found; returns null when
 * the fallback selection is scrolled entirely out of view.
 */
const computeMirror = (
	startCell: RawCell,
	lastCell: RawCell
): Mirror | null => {
	const union = unionRect(
		startCell.element.getBoundingClientRect(),
		lastCell.element.getBoundingClientRect()
	)
	const content = startCell.element.closest('[data-calendar-scroll-content]')
	if (content instanceof HTMLElement) {
		const box = content.getBoundingClientRect()
		const rect = {
			top: union.top - box.top,
			left: union.left - box.left,
			width: union.width,
			height: union.height,
		}
		return { rect, content }
	}
	const viewport = startCell.element.closest('[data-calendar-viewport]')
	if (!viewport) {
		return { rect: union, content: null }
	}
	const clipped = intersectRect(union, viewport.getBoundingClientRect())
	if (!clipped) {
		return null
	}
	return { rect: clipped, content: null }
}

/**
 * The selection highlight. Mounted inside the grid's scroll content (positioned
 * `absolute`, below the sticky chrome) when available, else a fixed overlay on
 * the body. `z-15` sits above the cells (`z-10`) and below the sticky header
 * (`z-21`) / resource column (`z-20`).
 */
function SelectionMirror({ rect, content }: Mirror): ReactNode {
	const placement = content ? 'absolute z-15' : 'fixed z-50'
	return createPortal(
		<div
			aria-hidden="true"
			className={`pointer-events-none ${placement} rounded-sm border border-primary bg-primary/20`}
			style={{
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
			}}
		/>,
		content ?? document.body
	)
}

/**
 * Wires the calendar's selection logic into the generic `useDragGesture`
 * recognizer: a press resolves to a grid cell, dragging extends the selection to
 * the cell under the pointer (clamped to the same region), and releasing opens
 * the event form with the range. The gesture mechanics (mouse threshold vs touch
 * long-press, scroll/text-selection suppression, cleanup) live in the hook.
 */
export function DragToCreateProvider({
	children,
	options,
}: {
	children: ReactNode
	options: DragToCreateOptions
}): ReactNode {
	const { openEventForm, resources, timezone, orientation } =
		useIlamyCalendarContext()
	const [mirror, setMirror] = useState<Mirror | null>(null)
	const lastCellRef = useRef<RawCell | null>(null)

	// Resource calendars scroll along the axis their resources are laid out on
	// (vertical resource grid -> rows -> y; horizontal -> columns -> x). Locking
	// the auto-scroll to that axis stops a drag from scrolling across resources.
	// Regular calendars have a single axis, so both are allowed.
	const isResourceCalendar = resources.length > 0
	const resourceScrollAxis = orientation === 'vertical' ? 'y' : 'x'
	const scrollAxis = isResourceCalendar ? resourceScrollAxis : 'both'

	const clearSelection = () => {
		lastCellRef.current = null
		setMirror(null)
	}

	const commit = (startCell: RawCell, lastCell: RawCell) => {
		const range = computeRange(startCell, lastCell)
		const resource = resources.find(
			(item: Resource) => String(item.id) === range.resourceId
		)
		const selection: CellInfo = {
			start: range.start,
			end: range.end,
			resource,
			allDay: range.allDay,
		}
		if (options.onSelect) {
			options.onSelect(selection, openEventForm)
		} else {
			openEventForm({
				start: range.start,
				end: range.end,
				allDay: range.allDay,
				resourceId: range.resourceId,
			})
		}
	}

	useDragGesture<RawCell>({
		scrollAxis,
		resolvePress: (event) => readCell(event.target as Element, timezone),
		onStart: (startCell) => {
			lastCellRef.current = startCell
			setMirror(computeMirror(startCell, startCell))
		},
		onMove: ({ clientX, clientY }, startCell) => {
			const candidate = readCell(
				document.elementFromPoint(clientX, clientY),
				timezone
			)
			if (candidate && isSameRegion(startCell, candidate)) {
				lastCellRef.current = candidate
			}
			const lastCell = lastCellRef.current ?? startCell
			setMirror(computeMirror(startCell, lastCell))
		},
		onEnd: (startCell) => {
			const lastCell = lastCellRef.current ?? startCell
			commit(startCell, lastCell)
			clearSelection()
		},
		onCancel: clearSelection,
	})

	return (
		<>
			{children}
			{mirror && <SelectionMirror {...mirror} />}
		</>
	)
}
