import { describe, expect, it } from 'bun:test'
import { applyInitialScrollIfNeeded } from './scroll-to-time-dom.utils'

const ROW_HEIGHT = 60
const COL_WIDTH = 64

const mockRect = (el: HTMLElement, rect: Partial<DOMRect>) => {
	const full = {
		top: 0,
		left: 0,
		width: 0,
		height: 0,
		right: 0,
		bottom: 0,
		x: 0,
		y: 0,
		toJSON: () => ({}),
		...rect,
	} as DOMRect
	el.getBoundingClientRect = () => full
}

const makeViewport = () => {
	const calls: ScrollToOptions[] = []
	const viewport = document.createElement('div')
	viewport.scrollTo = ((options?: ScrollToOptions | number, y?: number) => {
		if (typeof options === 'object' && options !== null) {
			calls.push(options)
		} else if (typeof options === 'number') {
			calls.push({ left: options, top: y })
		}
	}) as HTMLElement['scrollTo']
	return { viewport, calls }
}

const appendHourRow = (
	parent: HTMLElement,
	{
		hour,
		part,
		date,
		index,
		axis,
	}: {
		hour: number
		part?: string
		date?: string
		index: number
		axis: 'vertical' | 'horizontal'
	}
) => {
	const el = document.createElement('div')
	el.setAttribute('data-hour', String(hour).padStart(2, '0'))
	if (part) el.setAttribute('data-ilamy-part', part)
	if (date) el.setAttribute('data-date', date)
	mockRect(
		el,
		axis === 'vertical'
			? { top: index * ROW_HEIGHT, height: ROW_HEIGHT }
			: { left: index * COL_WIDTH, width: COL_WIDTH }
	)
	parent.appendChild(el)
	return el
}

describe('scroll-to-time-dom.utils', () => {
	const springHours = [
		0, 1, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
		21, 22, 23,
	]

	it('scrolls spring-forward DST vertical axis [00, 01, 03, 03, 04..23] to 08:00 instead of truncating at duplicate 03', () => {
		const { viewport, calls } = makeViewport()
		springHours.forEach((hour, index) => {
			appendHourRow(viewport, {
				hour,
				part: 'time-axis-hour',
				index,
				axis: 'vertical',
			})
		})

		const lastScrolledKeyRef = { current: null as string | null }
		applyInitialScrollIfNeeded({
			viewport,
			lastScrolledKeyRef,
			scrollKey: 'week:2025-03-09',
			scrollTime: '08:00',
			scrollToNow: false,
			axis: 'vertical',
			enabled: true,
		})

		expect(calls).toEqual([{ top: 8 * ROW_HEIGHT, behavior: 'auto' }])
		expect(lastScrolledKeyRef.current).toBe('week:2025-03-09|08:00|false')
	})

	it('lands on the first 03:00 row with fraction 0 when scrolling to spring-skipped 02:30', () => {
		const { viewport, calls } = makeViewport()
		springHours.forEach((hour, index) => {
			appendHourRow(viewport, {
				hour,
				part: 'time-axis-hour',
				index,
				axis: 'vertical',
			})
		})

		applyInitialScrollIfNeeded({
			viewport,
			lastScrolledKeyRef: { current: null },
			scrollKey: 'day:2025-03-09',
			scrollTime: '02:30',
			scrollToNow: false,
			axis: 'vertical',
			enabled: true,
		})

		expect(calls).toEqual([{ top: 2 * ROW_HEIGHT, behavior: 'auto' }])
	})

	it('ignores time-slot [data-hour] elements when time-axis-hour exists', () => {
		const { viewport, calls } = makeViewport()
		// Add a stray early [data-hour="08"] time-slot with wrong top before time-axis-hour
		appendHourRow(viewport, {
			hour: 8,
			part: 'time-slot',
			index: 99,
			axis: 'vertical',
		})
		for (let h = 0; h < 24; h++) {
			appendHourRow(viewport, {
				hour: h,
				part: 'time-axis-hour',
				index: h,
				axis: 'vertical',
			})
		}

		applyInitialScrollIfNeeded({
			viewport,
			lastScrolledKeyRef: { current: null },
			scrollKey: 'week:ordinary',
			scrollTime: '08:00',
			scrollToNow: false,
			axis: 'vertical',
			enabled: true,
		})

		expect(calls).toEqual([{ top: 8 * ROW_HEIGHT, behavior: 'auto' }])
	})

	it('stays on day 0 in horizontal 1-hour-per-day grids using data-date when target hour exceeds visible window', () => {
		const { viewport, calls } = makeViewport()
		;['2025-03-10', '2025-03-11', '2025-03-12'].forEach((date, index) => {
			appendHourRow(viewport, {
				hour: 8,
				part: 'res-h-hour-cell',
				date,
				index,
				axis: 'horizontal',
			})
		})

		applyInitialScrollIfNeeded({
			viewport,
			lastScrolledKeyRef: { current: null },
			scrollKey: 'res-h:week',
			scrollTime: '10:00',
			scrollToNow: false,
			axis: 'horizontal',
			enabled: true,
		})

		expect(calls).toEqual([{ left: 0, behavior: 'auto' }])
	})

	it('falls back to generic [data-hour] without data-date across spring DST and multi-day wrap', () => {
		const { viewport, calls } = makeViewport()
		springHours.forEach((hour, index) => {
			appendHourRow(viewport, { hour, index, axis: 'vertical' })
		})
		for (let h = 0; h < 24; h++) {
			appendHourRow(viewport, { hour: h, index: 24 + h, axis: 'vertical' })
		}

		applyInitialScrollIfNeeded({
			viewport,
			lastScrolledKeyRef: { current: null },
			scrollKey: 'fallback-spring',
			scrollTime: '23:30',
			scrollToNow: false,
			axis: 'vertical',
			enabled: true,
		})

		expect(calls).toEqual([{ top: 23.5 * ROW_HEIGHT, behavior: 'auto' }])
	})
})
