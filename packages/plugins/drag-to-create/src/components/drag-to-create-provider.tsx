import type { CellInfo, Resource } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDragGesture } from '../hooks/use-drag-gesture'
import type { DragToCreateOptions } from '../types'
import { type RawCell, readCell } from '../utils/read-cell'
import { intersectRect, type Rect, unionRect } from '../utils/rect'
import { computeRange, isSameRegion } from '../utils/selection'

/**
 * The mirror rect spanning the start..last cell, clipped to the calendar body so
 * the overlay never paints outside the (possibly scrolled / short) calendar.
 * Returns null when the selection is scrolled entirely out of the body's view.
 */
const computeMirror = (startCell: RawCell, lastCell: RawCell): Rect | null => {
	const union = unionRect(
		startCell.element.getBoundingClientRect(),
		lastCell.element.getBoundingClientRect()
	)
	const body = startCell.element.closest('[data-calendar-viewport]')
	if (!body) {
		return union
	}
	return intersectRect(union, body.getBoundingClientRect())
}

/** The selection highlight, portaled to the body and positioned from `rect`. */
function SelectionMirror({ rect }: { rect: Rect }): ReactNode {
	return createPortal(
		<div
			aria-hidden="true"
			className="pointer-events-none fixed z-50 rounded-sm border border-primary bg-primary/20"
			style={{
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
			}}
		/>,
		document.body
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
	const { openEventForm, resources, timezone } = useIlamyCalendarContext()
	const [mirror, setMirror] = useState<Rect | null>(null)
	const lastCellRef = useRef<RawCell | null>(null)

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
			{mirror && <SelectionMirror rect={mirror} />}
		</>
	)
}
