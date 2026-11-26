import {
	computeEdgeScroll,
	exceedsThreshold,
	type PointerPoint,
} from './rect.utils'
import { findScrollContainer } from './scroll.utils'

/** Configuration for a unified mouse/pen/touch pointer drag gesture recognizer. */
export interface PointerGestureOptions<T> {
	/** Event target receiving initial pointerdown events (defaults to document). */
	target?: Document | HTMLElement
	/** Resolves payload for a press; return `null` to ignore the press. */
	resolvePress: (event: PointerEvent) => T | null
	/** Fired once a gesture transitions from pending to active drag. */
	onStart?: (payload: T) => void
	/** Fired whenever the pointer moves (or auto-scrolls) while active. */
	onMove: (point: PointerPoint, payload: T) => void
	/** Fired when an active drag finishes on pointerup. */
	onEnd: (payload: T) => void
	/** Fired when a press releases before activating a drag. */
	onTap?: (payload: T, event: PointerEvent, moved?: boolean) => void
	/** Fired when an active or pending gesture is aborted. */
	onCancel?: () => void
	/** Mouse/pen activation threshold in pixels (default 2; 0 activates immediately). */
	thresholdPx?: number
	/** Optional per-press threshold resolver overriding `thresholdPx`. */
	getThresholdPx?: (payload: T) => number
	/** Touch hold duration (ms) before drag activates so swipes still scroll. */
	longPressMs?: number
	/** Touch movement slop (px) before hold fires that aborts to scroll. */
	touchCancelSlopPx?: number
	/** Optional per-press edge auto-scroll axis lock. */
	getScrollAxis?: (payload: T) => 'x' | 'y' | 'both'
	/** Default edge auto-scroll axis lock when `getScrollAxis` is omitted. */
	scrollAxis?: 'x' | 'y' | 'both'
}

/** Live handle for updating options, cancelling, or destroying a gesture listener. */
export interface PointerGestureHandle<T> {
	update: (next: PointerGestureOptions<T>) => void
	cancel: () => void
	destroy: () => void
}

interface PendingGesture<T> {
	pointerId: number
	pointerType: string
	originX: number
	originY: number
	thresholdPx: number | undefined
	payload: T
	active: boolean
	moved: boolean
	dispatchedMove: boolean
}

const DEFAULT_LONG_PRESS_MS = 200
const DEFAULT_TOUCH_CANCEL_SLOP_PX = 10
const EDGE_SCROLL_PX = 24
const EDGE_SCROLL_SPEED_PX = 5

const lockTextSelection = () => {
	document.body.style.setProperty('user-select', 'none')
	document.body.style.setProperty('-webkit-user-select', 'none')
}

const computeStepDelta = <T>(
	options: PointerGestureOptions<T>,
	pending: PendingGesture<T>,
	container: HTMLElement,
	point: PointerPoint
) => {
	const axis =
		options.getScrollAxis?.(pending.payload) ?? options.scrollAxis ?? 'both'
	return computeEdgeScroll(point, container.getBoundingClientRect(), {
		edge: EDGE_SCROLL_PX,
		speed: EDGE_SCROLL_SPEED_PX,
		axis,
	})
}

const unlockTextSelection = () => {
	document.body.style.removeProperty('user-select')
	document.body.style.removeProperty('-webkit-user-select')
}

/**
 * Framework-free unified mouse/pen/touch pointer gesture recognizer supporting
 * tap vs drag distinction, touch long-press, edge auto-scroll, Escape/blur abort,
 * and single trailing-click suppression.
 */
export function createPointerGesture<T>(
	initialOptions: PointerGestureOptions<T>
): PointerGestureHandle<T> {
	let options = initialOptions
	const downTarget: Document | HTMLElement = initialOptions.target ?? document
	let gesture: PendingGesture<T> | null = null
	let longPressTimer: ReturnType<typeof setTimeout> | null = null
	let scrollContainer: HTMLElement | null = null
	let lastPoint: PointerPoint | null = null
	let autoScrollFrame: number | null = null

	const clearLongPress = () => {
		if (longPressTimer !== null) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
	}

	const stopAutoScroll = () => {
		if (autoScrollFrame !== null) {
			cancelAnimationFrame(autoScrollFrame)
			autoScrollFrame = null
		}
	}

	const preventTouchScroll = (event: TouchEvent) => {
		if (gesture?.active) {
			event.preventDefault()
		}
	}

	const suppressClickOnce = (event: MouseEvent) => {
		event.stopImmediatePropagation()
		event.preventDefault()
		window.removeEventListener('click', suppressClickOnce, { capture: true })
	}

	const armClickSuppression = () => {
		window.addEventListener('click', suppressClickOnce, { capture: true })
	}

	const disarmClickSuppression = () => {
		window.removeEventListener('click', suppressClickOnce, { capture: true })
	}

	const teardown = () => {
		clearLongPress()
		stopAutoScroll()
		window.removeEventListener('touchmove', preventTouchScroll)
		unlockTextSelection()
		scrollContainer = null
		lastPoint = null
		gesture = null
	}

	const runAutoScroll = () => {
		autoScrollFrame = null
		if (!(gesture?.active && scrollContainer && lastPoint)) return
		const delta = computeStepDelta(options, gesture, scrollContainer, lastPoint)
		if (delta.x === 0 && delta.y === 0) return
		scrollContainer.scrollBy({
			left: delta.x,
			top: delta.y,
			behavior: 'instant',
		})
		options.onMove(lastPoint, gesture.payload)
		autoScrollFrame = requestAnimationFrame(runAutoScroll)
	}

	const ensureAutoScroll = () => {
		if (autoScrollFrame === null) {
			autoScrollFrame = requestAnimationFrame(runAutoScroll)
		}
	}

	const activate = (pending: PendingGesture<T>) => {
		pending.active = true
		clearLongPress()
		lockTextSelection()
		window.getSelection()?.removeAllRanges()
		if (pending.pointerType === 'touch') {
			window.addEventListener('touchmove', preventTouchScroll, {
				passive: false,
			})
		}
		options.onStart?.(pending.payload)
	}

	const cancel = () => {
		const wasPending = gesture !== null
		const wasActive = gesture?.active === true
		teardown()
		if (wasActive) {
			armClickSuppression()
		}
		if (wasPending) {
			options.onCancel?.()
		}
	}

	const onPointerDown = (event: Event) => {
		if (!(event instanceof PointerEvent)) return
		disarmClickSuppression()
		if (event.button !== 0 || !event.isPrimary) return

		const payload = options.resolvePress(event)
		if (payload === null) return

		clearLongPress()
		const thresholdPx = options.getThresholdPx
			? options.getThresholdPx(payload)
			: options.thresholdPx

		const pending: PendingGesture<T> = {
			pointerId: event.pointerId,
			pointerType: event.pointerType,
			originX: event.clientX,
			originY: event.clientY,
			thresholdPx,
			payload,
			active: false,
			moved: false,
			dispatchedMove: event.pointerType !== 'touch',
		}
		gesture = pending
		scrollContainer = findScrollContainer(event.target as Element)

		if (event.pointerType === 'touch') {
			const longPressMs = options.longPressMs ?? DEFAULT_LONG_PRESS_MS
			longPressTimer = setTimeout(() => {
				if (gesture === pending) {
					activate(pending)
				}
			}, longPressMs)
			return
		}

		if (thresholdPx === 0) {
			activate(pending)
		}
	}

	const tryActivate = (
		pending: PendingGesture<T>,
		event: PointerEvent
	): boolean => {
		const dx = event.clientX - pending.originX
		const dy = event.clientY - pending.originY
		if (pending.pointerType === 'touch') {
			const slop = options.touchCancelSlopPx ?? DEFAULT_TOUCH_CANCEL_SLOP_PX
			if (exceedsThreshold(dx, dy, slop)) {
				cancel()
			}
			return false
		}
		if (!exceedsThreshold(dx, dy, pending.thresholdPx)) {
			return false
		}
		activate(pending)
		return true
	}

	const onPointerMove = (event: PointerEvent) => {
		if (!gesture || event.pointerId !== gesture.pointerId) return
		if (
			event.clientX !== gesture.originX ||
			event.clientY !== gesture.originY
		) {
			gesture.moved = true
		}
		if (!gesture.active && !tryActivate(gesture, event)) return
		if (!gesture.dispatchedMove) {
			const dx = event.clientX - gesture.originX
			const dy = event.clientY - gesture.originY
			if (!exceedsThreshold(dx, dy, gesture.thresholdPx)) return
			gesture.dispatchedMove = true
		}
		lastPoint = { clientX: event.clientX, clientY: event.clientY }
		options.onMove(lastPoint, gesture.payload)
		ensureAutoScroll()
	}

	const onPointerUp = (event: PointerEvent) => {
		if (!gesture || event.pointerId !== gesture.pointerId) return
		const { payload, active, moved } = gesture
		if (!active) {
			teardown()
			options.onTap?.(payload, event, moved)
			return
		}
		armClickSuppression()
		teardown()
		options.onEnd(payload)
	}

	const handleContainerScroll = () => {
		if (gesture?.active && lastPoint) {
			options.onMove(lastPoint, gesture.payload)
		}
	}

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			cancel()
		}
	}

	downTarget.addEventListener('pointerdown', onPointerDown)
	window.addEventListener('pointermove', onPointerMove)
	window.addEventListener('pointerup', onPointerUp)
	window.addEventListener('pointercancel', cancel)
	window.addEventListener('blur', cancel)
	window.addEventListener('keydown', onKeyDown)
	window.addEventListener('scroll', handleContainerScroll, {
		capture: true,
		passive: true,
	})

	return {
		update: (next) => {
			options = next
		},
		cancel,
		destroy: () => {
			downTarget.removeEventListener('pointerdown', onPointerDown)
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', onPointerUp)
			window.removeEventListener('pointercancel', cancel)
			window.removeEventListener('blur', cancel)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('scroll', handleContainerScroll, {
				capture: true,
			})
			disarmClickSuppression()
			teardown()
		},
	}
}
