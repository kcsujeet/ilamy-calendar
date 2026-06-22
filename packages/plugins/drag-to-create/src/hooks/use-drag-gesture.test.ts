import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { type UseDragGestureOptions, useDragGesture } from './use-drag-gesture'

// Drive the hook with synthetic pointer events and record the lifecycle, so each
// test reads as: dispatched events -> recorded callbacks. The payload is a plain
// string ('cell') since the hook is domain-agnostic.
interface Recorder {
	starts: string[]
	moves: Array<{ x: number; y: number; payload: string }>
	ends: string[]
	cancels: number
}

const renderGesture = (
	overrides: Partial<UseDragGestureOptions<string>> = {}
) => {
	const rec: Recorder = { starts: [], moves: [], ends: [], cancels: 0 }
	const options: UseDragGestureOptions<string> = {
		resolvePress: () => 'cell',
		onStart: (payload) => rec.starts.push(payload),
		onMove: (point, payload) =>
			rec.moves.push({ x: point.clientX, y: point.clientY, payload }),
		onEnd: (payload) => rec.ends.push(payload),
		onCancel: () => {
			rec.cancels += 1
		},
		...overrides,
	}
	const { unmount } = renderHook(() => useDragGesture(options))
	return { rec, unmount }
}

// pointerdown is bound to document; the rest to window (matches the hook).
const down = (init: PointerEventInit = {}) =>
	document.dispatchEvent(
		new PointerEvent('pointerdown', {
			button: 0,
			isPrimary: true,
			pointerId: 1,
			pointerType: 'mouse',
			bubbles: true,
			...init,
		})
	)
const move = (init: PointerEventInit = {}) =>
	window.dispatchEvent(
		new PointerEvent('pointermove', { pointerId: 1, bubbles: true, ...init })
	)
const up = (init: PointerEventInit = {}) =>
	window.dispatchEvent(
		new PointerEvent('pointerup', { pointerId: 1, bubbles: true, ...init })
	)
const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

describe('useDragGesture', () => {
	describe('mouse / pen', () => {
		it('fires start, move, end across a drag past the threshold', () => {
			const { rec } = renderGesture()

			down({ clientX: 0, clientY: 0 })
			move({ clientX: 5, clientY: 0 }) // hypot 5 >= 2
			up({ clientX: 5, clientY: 0 })

			expect(rec.starts).toEqual(['cell'])
			expect(rec.moves).toEqual([{ x: 5, y: 0, payload: 'cell' }])
			expect(rec.ends).toEqual(['cell'])
			expect(rec.cancels).toBe(0)
		})

		it('a tap (no movement) fires nothing', () => {
			const { rec } = renderGesture()

			down({ clientX: 0, clientY: 0 })
			up({ clientX: 0, clientY: 0 })

			expect(rec.starts).toEqual([])
			expect(rec.ends).toEqual([])
			expect(rec.cancels).toBe(0)
		})

		it('movement below the threshold does not start a drag', () => {
			const { rec } = renderGesture()

			down({ clientX: 0, clientY: 0 })
			move({ clientX: 1, clientY: 0 }) // hypot 1 < 2
			up({ clientX: 1, clientY: 0 })

			expect(rec.starts).toEqual([])
			expect(rec.ends).toEqual([])
		})

		it('ignores the press when resolvePress returns null', () => {
			const { rec } = renderGesture({ resolvePress: () => null })

			down({ clientX: 0 })
			move({ clientX: 50 })
			up({ clientX: 50 })

			expect(rec.starts).toEqual([])
			expect(rec.moves).toEqual([])
		})

		it('honours a custom thresholdPx', () => {
			const { rec } = renderGesture({ thresholdPx: 30 })

			down({ clientX: 0 })
			move({ clientX: 10 }) // < 30, no start yet
			expect(rec.starts).toEqual([])

			move({ clientX: 40 }) // >= 30
			expect(rec.starts).toEqual(['cell'])
		})

		it('ignores secondary / non-primary buttons', () => {
			const { rec } = renderGesture()

			down({ button: 2, clientX: 0 })
			move({ clientX: 50 })

			expect(rec.starts).toEqual([])
		})
	})

	describe('cancellation', () => {
		it('cancels an active drag on Escape and stops tracking', () => {
			const { rec } = renderGesture()

			down()
			move({ clientX: 10 })
			expect(rec.starts).toEqual(['cell'])

			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
			expect(rec.cancels).toBe(1)

			move({ clientX: 20 }) // no longer tracked
			expect(rec.moves).toHaveLength(1)
		})

		it('cancels on pointercancel', () => {
			const { rec } = renderGesture()

			down()
			move({ clientX: 10 })
			window.dispatchEvent(
				new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })
			)

			expect(rec.cancels).toBe(1)
		})

		it('cancels on window blur', () => {
			const { rec } = renderGesture()

			down()
			move({ clientX: 10 })
			window.dispatchEvent(new Event('blur'))

			expect(rec.cancels).toBe(1)
		})
	})

	describe('touch (long-press)', () => {
		it('starts after the hold, then tracks and ends', async () => {
			const { rec } = renderGesture({ longPressMs: 1 })

			down({ pointerType: 'touch', clientX: 0, clientY: 0 })
			expect(rec.starts).toEqual([]) // hold pending, not yet a select

			await delay(20)
			expect(rec.starts).toEqual(['cell']) // hold fired

			move({ pointerType: 'touch', clientX: 0, clientY: 30 })
			up({ pointerType: 'touch' })

			expect(rec.moves).toEqual([{ x: 0, y: 30, payload: 'cell' }])
			expect(rec.ends).toEqual(['cell'])
		})

		it('aborts to a scroll when the finger moves before the hold fires', () => {
			const { rec } = renderGesture({ longPressMs: 1000 })

			down({ pointerType: 'touch', clientX: 0, clientY: 0 })
			move({ pointerType: 'touch', clientX: 0, clientY: 20 }) // > slop 10

			expect(rec.starts).toEqual([])
			expect(rec.cancels).toBe(1)
		})

		it('jitter under the slop does not abort the hold', async () => {
			const { rec } = renderGesture({ longPressMs: 1, touchCancelSlopPx: 10 })

			down({ pointerType: 'touch', clientX: 0, clientY: 0 })
			move({ pointerType: 'touch', clientX: 3, clientY: 0 }) // < 10
			expect(rec.cancels).toBe(0)

			await delay(20)
			expect(rec.starts).toEqual(['cell'])
		})
	})

	describe('side effects', () => {
		it('locks user-select while active and restores it on end', () => {
			renderGesture()

			down()
			move({ clientX: 10 })
			expect(document.body.style.getPropertyValue('user-select')).toBe('none')

			up({ clientX: 10 })
			expect(document.body.style.getPropertyValue('user-select')).toBe('')
		})

		it('suppresses the click synthesized right after a drag, once', () => {
			renderGesture()

			down()
			move({ clientX: 10 })
			up({ clientX: 10 })

			const first = new MouseEvent('click', { bubbles: true, cancelable: true })
			window.dispatchEvent(first)
			expect(first.defaultPrevented).toBe(true)

			const second = new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
			window.dispatchEvent(second)
			expect(second.defaultPrevented).toBe(false)
		})
	})

	describe('cleanup', () => {
		it('removes listeners on unmount', () => {
			const { rec, unmount } = renderGesture()

			unmount()
			down()
			move({ clientX: 10 })
			up({ clientX: 10 })

			expect(rec.starts).toEqual([])
		})
	})
})
