import { afterEach, describe, expect, it } from 'bun:test'
import {
	createPointerGesture,
	type PointerGestureHandle,
	type PointerGestureOptions,
} from './pointer-gesture'

interface Recorder {
	starts: string[]
	moves: Array<{ x: number; y: number; payload: string }>
	ends: string[]
	taps: string[]
	cancels: number
}

const activeHandles: Array<PointerGestureHandle<string>> = []

const createRecordedGesture = (
	overrides: Partial<PointerGestureOptions<string>> = {}
) => {
	const rec: Recorder = {
		starts: [],
		moves: [],
		ends: [],
		taps: [],
		cancels: 0,
	}
	const handle = createPointerGesture<string>({
		resolvePress: () => 'cell',
		onStart: (payload) => rec.starts.push(payload),
		onMove: (point, payload) =>
			rec.moves.push({ x: point.clientX, y: point.clientY, payload }),
		onEnd: (payload) => rec.ends.push(payload),
		onTap: (payload) => rec.taps.push(payload),
		onCancel: () => {
			rec.cancels += 1
		},
		...overrides,
	})
	activeHandles.push(handle)
	return { rec, handle }
}

afterEach(() => {
	while (activeHandles.length > 0) {
		activeHandles.pop()?.destroy()
	}
	document.body.innerHTML = ''
})

const down = (init: PointerEventInit = {}, target: EventTarget = document) => {
	target.dispatchEvent(
		new PointerEvent('pointerdown', {
			button: 0,
			isPrimary: true,
			pointerId: 1,
			pointerType: 'mouse',
			bubbles: true,
			...init,
		})
	)
}

const move = (init: PointerEventInit = {}) => {
	window.dispatchEvent(
		new PointerEvent('pointermove', { pointerId: 1, bubbles: true, ...init })
	)
}

const up = (init: PointerEventInit = {}) => {
	window.dispatchEvent(
		new PointerEvent('pointerup', { pointerId: 1, bubbles: true, ...init })
	)
}

const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

describe('createPointerGesture', () => {
	describe('mouse / pen', () => {
		it('fires start, move, end across a drag past the threshold', () => {
			const { rec } = createRecordedGesture()

			down({ clientX: 0, clientY: 0 })
			move({ clientX: 5, clientY: 0 })
			up({ clientX: 5, clientY: 0 })

			expect(rec.starts).toEqual(['cell'])
			expect(rec.moves).toEqual([{ x: 5, y: 0, payload: 'cell' }])
			expect(rec.ends).toEqual(['cell'])
			expect(rec.taps).toEqual([])
			expect(rec.cancels).toBe(0)
		})

		it('fires onTap on release before threshold without starting drag or suppressing click', () => {
			const { rec } = createRecordedGesture({ thresholdPx: 5 })

			down({ clientX: 10, clientY: 10 })
			move({ clientX: 11, clientY: 11 })
			up({ clientX: 11, clientY: 11 })

			expect(rec.starts).toEqual([])
			expect(rec.ends).toEqual([])
			expect(rec.taps).toEqual(['cell'])

			const click = new MouseEvent('click', { bubbles: true, cancelable: true })
			window.dispatchEvent(click)
			expect(click.defaultPrevented).toBe(false)
		})

		it('ignores the press when resolvePress returns null', () => {
			const { rec } = createRecordedGesture({ resolvePress: () => null })

			down({ clientX: 0 })
			move({ clientX: 50 })
			up({ clientX: 50 })

			expect(rec.starts).toEqual([])
			expect(rec.moves).toEqual([])
			expect(rec.taps).toEqual([])
		})

		it('honours custom thresholdPx and zero thresholdPx for resize handles', () => {
			const custom = createRecordedGesture({ thresholdPx: 30 })
			down({ clientX: 0 })
			move({ clientX: 10 })
			expect(custom.rec.starts).toEqual([])
			move({ clientX: 40 })
			expect(custom.rec.starts).toEqual(['cell'])
			up({ clientX: 40 })

			const immediate = createRecordedGesture({ thresholdPx: 0 })
			down({ clientX: 0 })
			expect(immediate.rec.starts).toEqual(['cell'])
			move({ clientX: 1 })
			expect(immediate.rec.moves).toEqual([{ x: 1, y: 0, payload: 'cell' }])
			up({ clientX: 1 })
			expect(immediate.rec.ends).toEqual(['cell'])
		})

		it('ignores secondary or non-primary pointers', () => {
			const { rec } = createRecordedGesture()

			down({ button: 2, clientX: 0 })
			move({ clientX: 50 })
			up({ clientX: 50 })

			expect(rec.starts).toEqual([])
			expect(rec.taps).toEqual([])
		})

		it('scopes pointerdown to custom target element and refreshes callbacks via update()', () => {
			const host = document.createElement('div')
			document.body.appendChild(host)
			const events: string[] = []
			const handle = createPointerGesture<string>({
				target: host,
				resolvePress: () => 'v1',
				onStart: (payload) => events.push(`start:${payload}`),
				onMove: () => {},
				onEnd: (payload) => events.push(`end:${payload}`),
			})
			activeHandles.push(handle)

			// Press outside host is ignored
			down({ clientX: 0 }, document.body)
			move({ clientX: 20 })
			up({ clientX: 20 })
			expect(events).toEqual([])

			// Update options without re-attaching
			handle.update({
				target: host,
				resolvePress: () => 'v2',
				onStart: (payload) => events.push(`updated-start:${payload}`),
				onMove: () => {},
				onEnd: (payload) => events.push(`updated-end:${payload}`),
			})

			down({ clientX: 0 }, host)
			move({ clientX: 20 })
			up({ clientX: 20 })
			expect(events).toEqual(['updated-start:v2', 'updated-end:v2'])
		})
	})

	describe('cancellation & click suppression', () => {
		const dispatchClick = () => {
			const event = new MouseEvent('click', { bubbles: true, cancelable: true })
			window.dispatchEvent(event)
			return event
		}

		it('cancels on Escape, pointercancel, and window blur and stops tracking', () => {
			const { rec } = createRecordedGesture()

			down()
			move({ clientX: 10 })
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
			move({ clientX: 20 })
			expect(rec.cancels).toBe(1)
			expect(rec.moves).toHaveLength(1)

			down()
			move({ clientX: 10 })
			window.dispatchEvent(
				new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })
			)
			expect(rec.cancels).toBe(2)

			down()
			move({ clientX: 10 })
			window.dispatchEvent(new Event('blur'))
			expect(rec.cancels).toBe(3)
		})

		it('swallows the trailing click once after active drag or cancelled active drag, and lets later clicks pass', () => {
			createRecordedGesture()

			down()
			move({ clientX: 10 })
			up({ clientX: 10 })
			expect(dispatchClick().defaultPrevented).toBe(true)
			expect(dispatchClick().defaultPrevented).toBe(false)

			down()
			move({ clientX: 10 })
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
			up({ clientX: 10 })
			expect(dispatchClick().defaultPrevented).toBe(true)
			expect(dispatchClick().defaultPrevented).toBe(false)

			// Next press disarms any lingering suppression
			down()
			move({ clientX: 10 })
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
			up({ clientX: 10 })
			down()
			up()
			expect(dispatchClick().defaultPrevented).toBe(false)
		})

		it('auto-disarms trailing click suppression on next macrotask so external buttons still click when no trailing click fires', async () => {
			const host = document.createElement('div')
			const externalBtn = document.createElement('button')
			document.body.append(host, externalBtn)
			let externalClicks = 0
			externalBtn.addEventListener('click', () => {
				externalClicks += 1
			})

			const handle = createPointerGesture<string>({
				target: host,
				resolvePress: () => 'drag',
				onMove: () => {},
				onEnd: () => {},
			})
			activeHandles.push(handle)

			// Trailing click immediately after pointerup IS suppressed
			down({ clientX: 0 }, host)
			move({ clientX: 20 })
			up({ clientX: 20 })
			expect(dispatchClick().defaultPrevented).toBe(true)

			// Drag ending across lanes without a trailing click releases on next macrotask
			down({ clientX: 0 }, host)
			move({ clientX: 20 })
			up({ clientX: 20 })
			await delay(10)
			externalBtn.click()
			expect(externalClicks).toBe(1)

			// Pressing Escape and holding pointer down across macrotasks keeps suppression until pointerup
			down({ clientX: 0 }, host)
			move({ clientX: 10 })
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
			await delay(10)
			up({ clientX: 10 })
			expect(dispatchClick().defaultPrevented).toBe(true)

			// A plain click on the next press is NOT suppressed
			down({ clientX: 0 }, host)
			up({ clientX: 0 })
			expect(dispatchClick().defaultPrevented).toBe(false)
		})
	})

	describe('touch (long-press & edge auto-scroll)', () => {
		it('starts after long-press hold, locks user-select, and aborts to scroll on swipe', async () => {
			const { rec } = createRecordedGesture({ longPressMs: 5 })

			down({ pointerType: 'touch', clientX: 0, clientY: 0 })
			expect(rec.starts).toEqual([])
			await delay(20)
			expect(rec.starts).toEqual(['cell'])
			expect(document.body.style.getPropertyValue('user-select')).toBe('none')

			move({ pointerType: 'touch', clientX: 0, clientY: 30 })
			up({ pointerType: 'touch' })
			expect(document.body.style.getPropertyValue('user-select')).toBe('')
			expect(rec.ends).toEqual(['cell'])

			const swipe = createRecordedGesture({ longPressMs: 500 })
			down({ pointerType: 'touch', clientX: 0, clientY: 0 })
			move({ pointerType: 'touch', clientX: 0, clientY: 20 })
			expect(swipe.rec.cancels).toBe(1)
			expect(swipe.rec.starts).toEqual([])
		})

		it('auto-scrolls nearest scrollable ancestor when pointer sits in edge zone', async () => {
			const scroller = document.createElement('div')
			scroller.style.overflowY = 'auto'
			Object.defineProperty(scroller, 'scrollHeight', { value: 1000 })
			Object.defineProperty(scroller, 'clientHeight', { value: 300 })
			let scrolledByY = 0
			scroller.scrollBy = ((options?: ScrollToOptions) => {
				scrolledByY += options?.top ?? 0
			}) as typeof scroller.scrollBy
			scroller.getBoundingClientRect = () =>
				({
					top: 100,
					left: 0,
					width: 400,
					height: 300,
					right: 400,
					bottom: 400,
					x: 0,
					y: 100,
					toJSON: () => ({}),
				}) as DOMRect

			const child = document.createElement('div')
			scroller.appendChild(child)
			document.body.appendChild(scroller)

			let moveCount = 0
			const handle = createPointerGesture<string>({
				target: scroller,
				resolvePress: () => 'cell',
				onMove: () => {
					moveCount += 1
				},
				onEnd: () => {},
				scrollAxis: 'y',
			})
			activeHandles.push(handle)

			down({ clientX: 50, clientY: 150 }, child)
			move({ clientX: 50, clientY: 390 }) // bottom edge zone (>= 360)
			await delay(40)
			up({ clientX: 50, clientY: 390 })

			expect(scrolledByY).toBeGreaterThan(0)
			expect(moveCount).toBeGreaterThan(1)
		})
	})

	describe('destroy', () => {
		it('removes listeners and resets user-select on destroy mid-drag', () => {
			const { rec, handle } = createRecordedGesture()

			down({ clientX: 0 })
			move({ clientX: 10 })
			expect(document.body.style.getPropertyValue('user-select')).toBe('none')

			handle.destroy()
			expect(document.body.style.getPropertyValue('user-select')).toBe('')

			move({ clientX: 30 })
			up({ clientX: 30 })
			expect(rec.ends).toEqual([])
		})
	})
})
