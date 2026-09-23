import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	setSystemTime,
	test,
} from 'bun:test'
import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { useScrollToTime } from './use-scroll-to-time'

const HOUR_PIXEL_SIZE = 60

const stubRect = (top: number, left: number) => () =>
	({
		top,
		left,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	}) as DOMRect

/** The hours every fixture draws, 06:00 to 17:00. */
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

const hourIndex = (hour: number) => HOURS.indexOf(hour)

const padHour = (hour: number) => String(hour).padStart(2, '0')

const setupScrollSpy = () => {
	const spy = mock((_options?: ScrollToOptions) => {})
	Element.prototype.scrollTo = spy as unknown as Element['scrollTo']
	return spy
}

interface FixtureElement {
	/** Tags the element `data-hour`, as the time gutter or time header does. */
	hour?: string
	/** `[start, end)` as UTC ISO strings, as `DroppableCell` reports itself. */
	start?: string
	end?: string
	allDay?: boolean
}

/**
 * A scroll viewport holding `elements` in order. The first sits at offset 0
 * inside the time area and each later one steps down/right by one hour, which
 * mirrors how the real gutter, header row or cells are laid out after any
 * sticky-left/top column.
 */
const buildViewport = (elements: FixtureElement[]) => {
	const viewport = document.createElement('div')
	viewport.getBoundingClientRect = stubRect(0, 0)
	elements.forEach(({ hour, start, end, allDay }, index) => {
		const element = document.createElement('div')
		if (hour) {
			element.setAttribute('data-hour', hour)
		}
		if (start) {
			element.setAttribute('data-start', start)
		}
		if (end) {
			element.setAttribute('data-end', end)
		}
		if (allDay) {
			element.setAttribute('data-all-day', 'true')
		}
		element.getBoundingClientRect = stubRect(
			index * HOUR_PIXEL_SIZE,
			index * HOUR_PIXEL_SIZE
		)
		viewport.appendChild(element)
	})
	document.body.appendChild(viewport)
	return viewport
}

/** The gutter alone: one `data-hour` row per hour. */
const hourRows = (): FixtureElement[] =>
	HOURS.map((hour) => ({ hour: padHour(hour) }))

/**
 * One-hour cells on 1 January 2025, 06:00 to 17:00 UTC. Each also carries its
 * `data-hour`, standing in for the gutter row at the same offset, so
 * `scrollTime` has something to aim at in the same grid.
 */
const hourCells = (): FixtureElement[] =>
	HOURS.map((hour) => ({
		hour: padHour(hour),
		start: `2025-01-01T${padHour(hour)}:00:00.000Z`,
		end: `2025-01-01T${padHour(hour + 1)}:00:00.000Z`,
	}))

/** Whole-day cells for 1 to 10 January 2025. */
const dayCells = (): FixtureElement[] =>
	[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) => ({
		start: `2025-01-${String(day).padStart(2, '0')}T00:00:00.000Z`,
		end: `2025-01-${String(day + 1).padStart(2, '0')}T00:00:00.000Z`,
	}))

afterEach(() => {
	document.body.innerHTML = ''
	setSystemTime()
})

describe('useScrollToTime', () => {
	let viewport: HTMLElement
	let scrollSpy: ReturnType<typeof setupScrollSpy>

	beforeEach(() => {
		viewport = buildViewport(hourRows())
		scrollSpy = setupScrollSpy()
	})

	/**
	 * Mounts the hook over `target` (the hour-row viewport by default). Only
	 * `scrollToNow` can change on rerender, which the live-toggle case needs.
	 */
	const renderScrollHook = (
		overrides: Partial<{
			target: HTMLElement
			scrollTime?: string
			scrollToNow: boolean
			enabled: boolean
			scrollKey: string
			axis: 'vertical' | 'horizontal'
		}> = {}
	) => {
		const { target = viewport, scrollToNow = false, ...options } = overrides
		const viewportRef = createRef<HTMLElement>()
		viewportRef.current = target
		return renderHook(
			(props: { scrollToNow: boolean }) =>
				useScrollToTime({
					viewportRef,
					scrollTime: '08:00:00',
					enabled: true,
					scrollKey: 'day-2025-01-01',
					...options,
					scrollToNow: props.scrollToNow,
				}),
			{ initialProps: { scrollToNow } }
		)
	}

	const scrolledToTop = (): number | undefined =>
		scrollSpy.mock.calls.at(0)?.at(0)?.top

	const scrolledToLeft = (): number | undefined =>
		scrollSpy.mock.calls.at(0)?.at(0)?.left

	test('scrolls the viewport to the row matching scrollTime on mount', () => {
		renderScrollHook({ scrollTime: '08:00:00' })

		expect(scrollSpy).toHaveBeenCalledTimes(1)
		expect(scrollSpy.mock.contexts.at(0)).toBe(viewport)
		expect(scrolledToTop()).toBe(hourIndex(8) * HOUR_PIXEL_SIZE)
	})

	test('does not scroll when scrollTime is undefined', () => {
		renderScrollHook({ scrollTime: undefined })

		expect(scrollSpy).not.toHaveBeenCalled()
	})

	test('does not scroll when enabled is false', () => {
		renderScrollHook({ enabled: false })

		expect(scrollSpy).not.toHaveBeenCalled()
	})

	test('clamps to the first row when scrollTime is before the visible range', () => {
		renderScrollHook({ scrollTime: '03:00:00' })

		expect(scrolledToTop()).toBe(hourIndex(6) * HOUR_PIXEL_SIZE)
	})

	test('clamps to the last row when scrollTime is after the visible range', () => {
		renderScrollHook({ scrollTime: '22:00:00' })

		expect(scrolledToTop()).toBe(hourIndex(17) * HOUR_PIXEL_SIZE)
	})

	test('floors minutes to the hour', () => {
		renderScrollHook({ scrollTime: '08:45:30' })

		expect(scrolledToTop()).toBe(hourIndex(8) * HOUR_PIXEL_SIZE)
	})

	test('accepts HH:mm format without seconds', () => {
		renderScrollHook({ scrollTime: '10:00' })

		expect(scrolledToTop()).toBe(hourIndex(10) * HOUR_PIXEL_SIZE)
	})

	test('does nothing when scrollTime is malformed', () => {
		renderScrollHook({ scrollTime: 'not-a-time' })

		expect(scrollSpy).not.toHaveBeenCalled()
	})

	test('re-scrolls when scrollKey changes', () => {
		const viewportRef = createRef<HTMLElement>()
		viewportRef.current = viewport

		const { rerender } = renderHook(
			(props: { scrollKey: string }) =>
				useScrollToTime({
					viewportRef,
					scrollTime: '08:00:00',
					enabled: true,
					scrollKey: props.scrollKey,
				}),
			{ initialProps: { scrollKey: 'day-2025-01-01' } }
		)

		expect(scrollSpy).toHaveBeenCalledTimes(1)
		rerender({ scrollKey: 'day-2025-01-02' })
		expect(scrollSpy).toHaveBeenCalledTimes(2)
	})

	test('re-scrolls when scrollTime changes on the same date range', () => {
		const viewportRef = createRef<HTMLElement>()
		viewportRef.current = viewport

		const { rerender } = renderHook(
			(props: { scrollTime: string }) =>
				useScrollToTime({
					viewportRef,
					scrollTime: props.scrollTime,
					enabled: true,
					scrollKey: 'day-2025-01-01',
				}),
			{ initialProps: { scrollTime: '08:00:00' } }
		)

		rerender({ scrollTime: '14:00:00' })
		const scrolledTops = scrollSpy.mock.calls.map((call) => call.at(0)?.top)
		expect(scrolledTops).toEqual([
			hourIndex(8) * HOUR_PIXEL_SIZE,
			hourIndex(14) * HOUR_PIXEL_SIZE,
		])
	})

	test('scrolls horizontally when axis is "horizontal"', () => {
		renderScrollHook({ scrollTime: '10:00', axis: 'horizontal' })

		expect(scrolledToLeft()).toBe(hourIndex(10) * HOUR_PIXEL_SIZE)
		expect(scrolledToTop()).toBeUndefined()
	})

	describe('scrollToNow', () => {
		test('scrolls to the cell that contains now', () => {
			setSystemTime(new Date('2025-01-01T10:30:00.000Z'))
			renderScrollHook({
				target: buildViewport(hourCells()),
				scrollToNow: true,
			})

			expect(scrolledToTop()).toBe(4 * HOUR_PIXEL_SIZE)
		})

		test("scrolls a day-column grid horizontally to today's column", () => {
			setSystemTime(new Date('2025-01-05T15:00:00.000Z'))
			renderScrollHook({
				target: buildViewport(dayCells()),
				scrollToNow: true,
				axis: 'horizontal',
			})

			expect(scrolledToLeft()).toBe(4 * HOUR_PIXEL_SIZE)
			expect(scrolledToTop()).toBeUndefined()
		})

		test('wins over scrollTime while now is on screen', () => {
			setSystemTime(new Date('2025-01-01T14:00:00.000Z'))
			renderScrollHook({
				target: buildViewport(hourCells()),
				scrollToNow: true,
				scrollTime: '08:00',
			})

			expect(scrolledToTop()).toBe(8 * HOUR_PIXEL_SIZE)
		})

		test('falls back to scrollTime when now is not on screen', () => {
			// A month later than every cell, at 14:00, so a fallback that still
			// read now's hour would land on 14:00 rather than scrollTime's 10:00.
			setSystemTime(new Date('2025-02-01T14:00:00.000Z'))
			renderScrollHook({
				target: buildViewport(hourCells()),
				scrollToNow: true,
				scrollTime: '10:00',
			})

			expect(scrolledToTop()).toBe(4 * HOUR_PIXEL_SIZE)
		})

		test('returns to the start when now is off screen and there is no scrollTime', () => {
			// Leaving the grid where the last range put it would carry today's
			// offset into a month that does not contain today. FullCalendar resets
			// to the range start (plus scrollTime) on every range change.
			setSystemTime(new Date('2025-02-01T10:00:00.000Z'))
			renderScrollHook({
				target: buildViewport(dayCells()),
				scrollToNow: true,
				scrollTime: undefined,
				axis: 'horizontal',
			})

			expect(scrolledToLeft()).toBe(0)
		})

		test('ignores all-day cells, which contain now in every time grid', () => {
			setSystemTime(new Date('2025-01-01T12:00:00.000Z'))
			const allDay = {
				start: '2025-01-01T00:00:00.000Z',
				end: '2025-01-02T00:00:00.000Z',
				allDay: true,
			}
			renderScrollHook({
				target: buildViewport([allDay, ...hourCells()]),
				scrollToNow: true,
			})

			// The timed cells start one step past the all-day cell. Measured from
			// the first timed cell, 12:00 is six steps in; measuring from the
			// all-day cell, or scrolling to it, would give seven or zero.
			expect(scrolledToTop()).toBe(6 * HOUR_PIXEL_SIZE)
		})

		test('re-scrolls when scrollToNow is turned on for the same range', () => {
			setSystemTime(new Date('2025-01-01T14:00:00.000Z'))
			const { rerender } = renderScrollHook({
				target: buildViewport(hourCells()),
				scrollTime: '08:00',
			})

			rerender({ scrollToNow: true })
			const scrolledTops = scrollSpy.mock.calls.map((call) => call.at(0)?.top)
			expect(scrolledTops).toEqual([2 * HOUR_PIXEL_SIZE, 8 * HOUR_PIXEL_SIZE])
		})
	})
})
