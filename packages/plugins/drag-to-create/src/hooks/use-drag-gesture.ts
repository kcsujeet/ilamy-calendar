import { useEffect, useRef } from 'react'
import { computeEdgeScroll } from '../utils/rect'
import { findScrollContainer } from '../utils/scroll'
import { exceedsThreshold } from '../utils/selection'

export interface DragPoint {
	clientX: number
	clientY: number
}

export interface UseDragGestureOptions<T> {
	/** Resolve a payload from the initial press; return null to ignore the press. */
	resolvePress: (event: PointerEvent) => T | null
	/** The gesture became an active drag (mouse/pen passed the threshold, or the touch long-press fired). */
	onStart?: (payload: T) => void
	/** The pointer moved during an active drag. */
	onMove: (point: DragPoint, payload: T) => void
	/** The active drag was released (fires only after `onStart`). */
	onEnd: (payload: T) => void
	/** The gesture was aborted: Escape, blur, pointercancel, or a touch swipe. */
	onCancel?: () => void
	/** Mouse/pen drag threshold in px. */
	thresholdPx?: number
	/** Touch press-and-hold (ms) that starts a selection, so a swipe still scrolls. */
	longPressMs?: number
	/** Touch movement (px) before the hold fires that aborts to a scroll. */
	touchCancelSlopPx?: number
	/** Axes the edge auto-scroll may use. Default both. */
	scrollAxis?: 'x' | 'y' | 'both'
}

interface PendingGesture<T> {
	pointerId: number
	pointerType: string
	originX: number
	originY: number
	payload: T
	active: boolean
}

// Match @dnd-kit's MouseSensor `distance: 2` so click-vs-drag feels identical.
const DEFAULT_THRESHOLD_PX = 2
const DEFAULT_LONG_PRESS_MS = 400
const DEFAULT_TOUCH_CANCEL_SLOP_PX = 10
// Auto-scroll: how close (px) to a scroll-container edge triggers it, and how far
// (px) it scrolls per animation frame.
const EDGE_SCROLL_PX = 40
const EDGE_SCROLL_SPEED_PX = 5

/**
 * A unified mouse / pen / touch press-drag gesture recognizer built on Pointer
 * Events (one code path for every input, per the Pointer Events model). Mouse and
 * pen start a drag once the pointer passes `thresholdPx`; touch starts on a
 * press-and-hold (`longPressMs`) so a normal swipe still scrolls the page, and
 * native scroll is suppressed for the rest of an active touch drag.
 *
 * The recognizer is domain-agnostic: the consumer resolves a payload from the
 * press (e.g. a grid cell) and reacts to start / move / end / cancel. It owns the
 * event wiring, the threshold/long-press, text-selection lock, trailing-click
 * suppression, and cleanup; the consumer owns what a selection means.
 */
export function useDragGesture<T>(options: UseDragGestureOptions<T>): void {
	// Listeners attach once; read the latest callbacks/config through a ref so
	// they never go stale.
	const optionsRef = useRef(options)
	optionsRef.current = options

	const gestureRef = useRef<PendingGesture<T> | null>(null)

	useEffect(() => {
		// Block native text selection during a drag so it doesn't highlight content
		// across the elements the pointer passes over.
		const lockTextSelection = () => {
			document.body.style.setProperty('user-select', 'none')
			document.body.style.setProperty('-webkit-user-select', 'none')
		}
		const unlockTextSelection = () => {
			document.body.style.removeProperty('user-select')
			document.body.style.removeProperty('-webkit-user-select')
		}

		let longPressTimer: ReturnType<typeof setTimeout> | null = null
		const clearLongPress = () => {
			if (longPressTimer !== null) {
				clearTimeout(longPressTimer)
				longPressTimer = null
			}
		}

		// Edge auto-scroll: the cell's scroll container, the last pointer position
		// (the finger/mouse holds still at the edge), and the rAF handle.
		let scrollContainer: HTMLElement | null = null
		let lastPoint: DragPoint | null = null
		let autoScrollFrame: number | null = null

		const stopAutoScroll = () => {
			if (autoScrollFrame !== null) {
				cancelAnimationFrame(autoScrollFrame)
				autoScrollFrame = null
			}
		}

		// While the pointer sits in an edge zone, scroll the container a step per
		// frame and re-fire onMove so the selection extends to the cell now under
		// the (stationary) pointer. Stops itself once the pointer leaves the edge.
		const runAutoScroll = () => {
			autoScrollFrame = null
			const gesture = gestureRef.current
			if (!gesture?.active) {
				return
			}
			if (!scrollContainer || !lastPoint) {
				return
			}
			// computeEdgeScroll locks to scrollAxis so a horizontal resource grid
			// doesn't auto-scroll vertically (across resources) and vice versa.
			const delta = computeEdgeScroll(
				lastPoint,
				scrollContainer.getBoundingClientRect(),
				{
					edge: EDGE_SCROLL_PX,
					speed: EDGE_SCROLL_SPEED_PX,
					axis: optionsRef.current.scrollAxis,
				}
			)
			if (delta.x === 0 && delta.y === 0) {
				return
			}
			scrollContainer.scrollBy({
				left: delta.x,
				top: delta.y,
				behavior: 'instant',
			})
			optionsRef.current.onMove(lastPoint, gesture.payload)
			autoScrollFrame = requestAnimationFrame(runAutoScroll)
		}

		const ensureAutoScroll = () => {
			if (autoScrollFrame === null) {
				autoScrollFrame = requestAnimationFrame(runAutoScroll)
			}
		}

		const preventTouchScroll = (event: TouchEvent) => {
			if (gestureRef.current?.active) {
				event.preventDefault()
			}
		}

		// Swallow the click synthesized after a drag so the press target's own click
		// handler doesn't also fire.
		const suppressClickOnce = (event: MouseEvent) => {
			event.stopImmediatePropagation()
			event.preventDefault()
			window.removeEventListener('click', suppressClickOnce, { capture: true })
		}

		// Tear down the current gesture's listeners/timer/locks (no callback).
		const teardown = () => {
			clearLongPress()
			stopAutoScroll()
			window.removeEventListener('touchmove', preventTouchScroll)
			unlockTextSelection()
			scrollContainer = null
			lastPoint = null
			gestureRef.current = null
		}

		// Abort an in-progress or pending gesture (Escape, blur, cancel, swipe).
		const cancel = () => {
			const wasPending = gestureRef.current !== null
			teardown()
			if (wasPending) {
				optionsRef.current.onCancel?.()
			}
		}

		const activate = (gesture: PendingGesture<T>) => {
			gesture.active = true
			clearLongPress()
			lockTextSelection()
			// Clear any selection the pre-activation movement may have started.
			window.getSelection()?.removeAllRanges()
			if (gesture.pointerType === 'touch') {
				window.addEventListener('touchmove', preventTouchScroll, {
					passive: false,
				})
			}
			optionsRef.current.onStart?.(gesture.payload)
		}

		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 0 || !event.isPrimary) {
				return
			}
			const payload = optionsRef.current.resolvePress(event)
			if (payload === null) {
				return
			}
			clearLongPress()
			const gesture: PendingGesture<T> = {
				pointerId: event.pointerId,
				pointerType: event.pointerType,
				originX: event.clientX,
				originY: event.clientY,
				payload,
				active: false,
			}
			gestureRef.current = gesture
			scrollContainer = findScrollContainer(event.target as Element)
			// Touch starts on a hold (a swipe scrolls); mouse/pen on a small drag.
			if (event.pointerType === 'touch') {
				const longPressMs =
					optionsRef.current.longPressMs ?? DEFAULT_LONG_PRESS_MS
				longPressTimer = setTimeout(() => {
					if (gestureRef.current === gesture) {
						activate(gesture)
					}
				}, longPressMs)
			}
		}

		const onPointerMove = (event: PointerEvent) => {
			const gesture = gestureRef.current
			if (!gesture || event.pointerId !== gesture.pointerId) {
				return
			}
			const dx = event.clientX - gesture.originX
			const dy = event.clientY - gesture.originY
			if (!gesture.active) {
				if (gesture.pointerType === 'touch') {
					const slop =
						optionsRef.current.touchCancelSlopPx ?? DEFAULT_TOUCH_CANCEL_SLOP_PX
					// Moving before the hold fires is a scroll, not a select.
					if (exceedsThreshold(dx, dy, slop)) {
						cancel()
					}
					return
				}
				const threshold = optionsRef.current.thresholdPx ?? DEFAULT_THRESHOLD_PX
				if (!exceedsThreshold(dx, dy, threshold)) {
					return
				}
				activate(gesture)
			}
			lastPoint = { clientX: event.clientX, clientY: event.clientY }
			optionsRef.current.onMove(lastPoint, gesture.payload)
			ensureAutoScroll()
		}

		const onPointerUp = (event: PointerEvent) => {
			const gesture = gestureRef.current
			if (!gesture || event.pointerId !== gesture.pointerId) {
				return
			}
			if (!gesture.active) {
				teardown()
				return
			}
			window.addEventListener('click', suppressClickOnce, { capture: true })
			const { payload } = gesture
			teardown()
			optionsRef.current.onEnd(payload)
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				cancel()
			}
		}

		document.addEventListener('pointerdown', onPointerDown)
		window.addEventListener('pointermove', onPointerMove)
		window.addEventListener('pointerup', onPointerUp)
		window.addEventListener('pointercancel', cancel)
		window.addEventListener('blur', cancel)
		window.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', onPointerUp)
			window.removeEventListener('pointercancel', cancel)
			window.removeEventListener('blur', cancel)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('click', suppressClickOnce, { capture: true })
			window.removeEventListener('touchmove', preventTouchScroll)
			clearLongPress()
			stopAutoScroll()
			unlockTextSelection()
		}
	}, [])
}
