import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
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

const buildViewport = (hours: number[]) => {
	const viewport = document.createElement('div')
	viewport.getBoundingClientRect = stubRect(0, 0)
	hours.forEach((hour, index) => {
		const row = document.createElement('div')
		row.setAttribute('data-hour', String(hour).padStart(2, '0'))
		// First row sits at offset 0 inside the time area; later rows step
		// down/right by one hour height. Mirrors how the real time-gutter or
		// time-header row is laid out after any sticky-left/top column.
		row.getBoundingClientRect = stubRect(
			index * HOUR_PIXEL_SIZE,
			index * HOUR_PIXEL_SIZE
		)
		viewport.appendChild(row)
	})
	document.body.appendChild(viewport)
	return viewport
}

const hourIndex = (hour: number) =>
	[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].indexOf(hour)

const setupScrollSpy = () => {
	const spy = mock((_options?: ScrollToOptions) => {})
	Element.prototype.scrollTo = spy as unknown as Element['scrollTo']
	return spy
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('useScrollToTime', () => {
	let viewport: HTMLElement
	let scrollSpy: ReturnType<typeof setupScrollSpy>

	beforeEach(() => {
		viewport = buildViewport([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
		scrollSpy = setupScrollSpy()
	})

	const renderScrollHook = (
		overrides: Partial<{
			viewportRef: ReturnType<typeof createRef<HTMLElement>>
			scrollTime?: string
			enabled: boolean
			scrollKey: string
			axis: 'vertical' | 'horizontal'
		}> = {}
	) => {
		const viewportRef = createRef<HTMLElement>()
		viewportRef.current = viewport
		return renderHook(() =>
			useScrollToTime({
				viewportRef,
				scrollTime: '08:00:00',
				enabled: true,
				scrollKey: 'day-2025-01-01',
				...overrides,
			})
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

	test('scrolls horizontally when axis is "horizontal"', () => {
		renderScrollHook({ scrollTime: '10:00', axis: 'horizontal' })

		expect(scrolledToLeft()).toBe(hourIndex(10) * HOUR_PIXEL_SIZE)
		expect(scrolledToTop()).toBeUndefined()
	})
})
