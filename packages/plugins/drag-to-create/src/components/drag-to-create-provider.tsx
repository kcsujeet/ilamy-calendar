import type { CellInfo, Resource } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar/react'
import { isRangeWithinBusinessHours } from '@ilamy/core'
import { toOffsetIso } from '@ilamy/utils/temporal'
import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDragGesture } from '../hooks/use-drag-gesture'
import type { DragToCreateOptions } from '../types'
import { cellElementAt, readCell } from '../utils/read-cell'
import { intersectRect, type Rect, unionRect } from '../utils/rect'
import { computeRange, isSameRegion } from '../utils/selection'
import {
	getCellBounds,
	type SnappedCell,
	snapCellToPoint,
} from '../utils/snap-cell'

interface Mirror {
	rect: Rect
	content: HTMLElement | null
}

const computeMirror = (
	startCell: SnappedCell,
	lastCell: SnappedCell
): Mirror | null => {
	const union = unionRect(getCellBounds(startCell), getCellBounds(lastCell))
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

export function DragToCreateProvider({
	children,
	options,
}: {
	children: ReactNode
	options: DragToCreateOptions
}): ReactNode {
	const {
		openEventForm,
		resources,
		hasResourceAxis,
		timezone,
		orientation,
		businessHours,
		selectConstraint,
	} = useIlamyCalendarContext()
	const [mirror, setMirror] = useState<Mirror | null>(null)
	const lastCellRef = useRef<SnappedCell | null>(null)

	const isResourceCalendar = hasResourceAxis
	const resourceScrollAxis = orientation === 'vertical' ? 'y' : 'x'
	const scrollAxis = isResourceCalendar ? resourceScrollAxis : 'both'

	const clearSelection = () => {
		lastCellRef.current = null
		setMirror(null)
	}

	const isSelectionAllowed = (
		startCell: SnappedCell,
		endCell: SnappedCell
	): boolean => {
		if (selectConstraint !== 'businessHours') {
			return true
		}
		const range = computeRange(startCell, endCell)
		const resource = resources.find(
			(item: Resource) => String(item.id) === range.resourceId
		)
		const effectiveHours = resource?.businessHours ?? businessHours
		if (!effectiveHours) {
			return true
		}
		return isRangeWithinBusinessHours({
			start: range.start,
			end: range.end,
			businessHours: effectiveHours,
			allDay: range.allDay,
		})
	}

	const commit = (startCell: SnappedCell, lastCell: SnappedCell) => {
		if (!isSelectionAllowed(startCell, lastCell)) {
			return
		}
		const range = computeRange(startCell, lastCell)
		const resource = resources.find(
			(item: Resource) => String(item.id) === range.resourceId
		)
		const startIso = toOffsetIso(range.start)
		const endIso = toOffsetIso(range.end)
		const selection: CellInfo = {
			start: startIso,
			end: endIso,
			resource,
			allDay: range.allDay,
		}
		if (options.onSelect) {
			options.onSelect(selection, openEventForm)
		} else {
			openEventForm({
				start: startIso,
				end: endIso,
				allDay: range.allDay,
				resourceId: resource?.id,
			})
		}
	}

	const readSnappedCell = (
		element: Element | null,
		point: { clientX: number; clientY: number }
	): SnappedCell | null => {
		const cell = readCell(element, timezone)
		return cell ? snapCellToPoint(cell, point) : null
	}

	useDragGesture<SnappedCell>({
		scrollAxis,
		resolvePress: (event) => {
			const cell = readSnappedCell(event.target as Element, event)
			if (!cell || !isSelectionAllowed(cell, cell)) {
				return null
			}
			return cell
		},
		onStart: (startCell) => {
			lastCellRef.current = startCell
			setMirror(computeMirror(startCell, startCell))
		},
		onMove: (point, startCell) => {
			const candidate = readSnappedCell(cellElementAt(point), point)
			if (
				candidate &&
				isSameRegion(startCell, candidate) &&
				isSelectionAllowed(startCell, candidate)
			) {
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
