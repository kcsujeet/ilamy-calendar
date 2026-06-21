import type { CellInfo, Resource } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DragToCreateOptions } from '../types'
import { type RawCell, readCell } from '../utils/read-cell'
import { intersectRect, type Rect, unionRect } from '../utils/rect'
import {
	computeRange,
	exceedsThreshold,
	isSameRegion,
} from '../utils/selection'

interface Gesture {
	pointerId: number
	originX: number
	originY: number
	startCell: RawCell
	lastCell: RawCell
	active: boolean
}

/**
 * The mirror rect for the current gesture, clipped to the calendar body so the
 * overlay never paints outside the (possibly scrolled / short) calendar. Returns
 * null when the selection is scrolled entirely out of the body's view.
 */
const computeMirror = (gesture: Gesture): Rect | null => {
	const union = unionRect(
		gesture.startCell.element.getBoundingClientRect(),
		gesture.lastCell.element.getBoundingClientRect()
	)
	const body = gesture.startCell.element.closest('[data-calendar-viewport]')
	if (!body) {
		return union
	}
	return intersectRect(union, body.getBoundingClientRect())
}

/**
 * Owns the entire drag-to-select gesture: pointer tracking, the click-vs-drag
 * threshold, the single-region clamp, the mirror overlay, and the commit. Reads
 * only the public calendar API + the DOM (the self-describing cell attributes).
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
	const gestureRef = useRef<Gesture | null>(null)

	// Latest values, so the listeners (attached once) never go stale.
	const latest = useRef({
		openEventForm,
		resources,
		timezone,
		onSelect: options.onSelect,
	})
	latest.current = {
		openEventForm,
		resources,
		timezone,
		onSelect: options.onSelect,
	}

	useEffect(() => {
		// Block native text selection during a drag so the gesture doesn't
		// highlight event titles and day numbers across the cells it passes over.
		const lockTextSelection = () => {
			document.body.style.setProperty('user-select', 'none')
			document.body.style.setProperty('-webkit-user-select', 'none')
		}
		const unlockTextSelection = () => {
			document.body.style.removeProperty('user-select')
			document.body.style.removeProperty('-webkit-user-select')
		}

		const reset = () => {
			gestureRef.current = null
			setMirror(null)
			unlockTextSelection()
		}

		// Swallow the synthesized click that follows a drag, so the cell's own
		// onCellClick does not also fire after a selection.
		const suppressClickOnce = (event: MouseEvent) => {
			event.stopImmediatePropagation()
			event.preventDefault()
			window.removeEventListener('click', suppressClickOnce, { capture: true })
		}

		const commit = (gesture: Gesture) => {
			const range = computeRange(gesture.startCell, gesture.lastCell)
			const resource = latest.current.resources.find(
				(item: Resource) => String(item.id) === range.resourceId
			)
			const selection: CellInfo = {
				start: range.start,
				end: range.end,
				resource,
				allDay: range.allDay,
			}
			window.addEventListener('click', suppressClickOnce, { capture: true })
			const openEventForm = latest.current.openEventForm
			try {
				if (latest.current.onSelect) {
					latest.current.onSelect(selection, openEventForm)
				} else {
					openEventForm({
						start: range.start,
						end: range.end,
						allDay: range.allDay,
						resourceId: range.resourceId,
					})
				}
			} finally {
				reset()
			}
		}

		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 0 || !event.isPrimary) {
				return
			}
			const cell = readCell(event.target as Element, latest.current.timezone)
			if (!cell) {
				return
			}
			gestureRef.current = {
				pointerId: event.pointerId,
				originX: event.clientX,
				originY: event.clientY,
				startCell: cell,
				lastCell: cell,
				active: false,
			}
		}

		const onPointerMove = (event: PointerEvent) => {
			const gesture = gestureRef.current
			if (!gesture || event.pointerId !== gesture.pointerId) {
				return
			}
			if (!gesture.active) {
				const dx = event.clientX - gesture.originX
				const dy = event.clientY - gesture.originY
				if (!exceedsThreshold(dx, dy)) {
					return
				}
				gesture.active = true
				lockTextSelection()
				// Clear any selection the pre-threshold movement may have started.
				window.getSelection()?.removeAllRanges()
			}
			const candidate = readCell(
				document.elementFromPoint(event.clientX, event.clientY),
				latest.current.timezone
			)
			if (candidate && isSameRegion(gesture.startCell, candidate)) {
				gesture.lastCell = candidate
			}
			setMirror(computeMirror(gesture))
		}

		const onPointerUp = (event: PointerEvent) => {
			const gesture = gestureRef.current
			if (!gesture || event.pointerId !== gesture.pointerId) {
				return
			}
			if (gesture.active) {
				commit(gesture)
			} else {
				reset()
			}
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				reset()
			}
		}

		document.addEventListener('pointerdown', onPointerDown)
		window.addEventListener('pointermove', onPointerMove)
		window.addEventListener('pointerup', onPointerUp)
		window.addEventListener('pointercancel', reset)
		window.addEventListener('blur', reset)
		window.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', onPointerUp)
			window.removeEventListener('pointercancel', reset)
			window.removeEventListener('blur', reset)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('click', suppressClickOnce, { capture: true })
		}
	}, [])

	const mirrorNode = mirror
		? createPortal(
				<div
					aria-hidden="true"
					className="pointer-events-none fixed z-50 rounded-sm border border-primary bg-primary/20"
					style={{
						top: mirror.top,
						left: mirror.left,
						width: mirror.width,
						height: mirror.height,
					}}
				/>,
				document.body
			)
		: null

	return (
		<>
			{children}
			{mirrorNode}
		</>
	)
}
