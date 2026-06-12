import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { layoutHorizontal } from './horizontal'

const days = Array.from({ length: 7 }, (_, i) =>
	dayjs('2025-01-12T00:00:00.000Z').add(i, 'day')
)

// Compact event factory: id doubles as title.
const mkEvent = (
	id: string,
	startISO: string,
	endISO: string
): CalendarEvent => ({
	id,
	title: id,
	start: dayjs(startISO),
	end: dayjs(endISO),
})

const singleDayEvent = mkEvent(
	'single-day',
	'2025-01-13T10:00:00.000Z',
	'2025-01-13T11:00:00.000Z'
)
const multiDayEvent = mkEvent(
	'multi-day',
	'2025-01-13T00:00:00.000Z',
	'2025-01-15T23:59:59.000Z'
)
const longMultiDayEvent = mkEvent(
	'long-multi-day',
	'2025-01-10T00:00:00.000Z',
	'2025-01-20T23:59:59.000Z'
)

// Run layout with the default 7-day grid and dayMaxEvents 4.
const run = (
	events: CalendarEvent[],
	opts: { dayMaxEvents?: number; gridType?: 'day' | 'hour' } = {}
) =>
	layoutHorizontal({
		days,
		events,
		dayMaxEvents: opts.dayMaxEvents ?? 4,
		gridType: opts.gridType,
	})

describe('layoutHorizontal', () => {
	describe('Basic Positioning', () => {
		it('positions single-day event correctly', () => {
			const result = run([singleDayEvent])

			expect(result).toHaveLength(1)
			const [p] = result
			expect(p.left).toBeCloseTo(14.285714, 2)
			expect(p.width).toBeCloseTo(14.285714, 2)
			expect(p.row).toBe(0)
		})

		it('positions multi-day event correctly', () => {
			const result = run([multiDayEvent])

			expect(result).toHaveLength(1)
			const [p] = result
			expect(p.left).toBeCloseTo(14.285714, 2)
			expect(p.width).toBeCloseTo(42.857142, 2)
			expect(p.row).toBe(0)
		})

		it('emits horizontal-kind placements — the renderer derives pixels from row', () => {
			const [p] = run([singleDayEvent])
			expect(p.kind).toBe('horizontal')
		})

		it('nests the original event by reference, un-mutated and un-copied', () => {
			const [p] = run([singleDayEvent])
			expect(p.event).toBe(singleDayEvent)
		})
	})

	describe('Edge Cases - Truncation', () => {
		it('truncates event starting before week start', () => {
			const result = run([longMultiDayEvent])

			expect(result).toHaveLength(1)
			const [p] = result
			expect(p.left).toBe(0)
			expect(p.isTruncatedStart).toBe(true)
		})

		it('truncates event ending after week end', () => {
			const result = run([
				mkEvent(
					'multi-day',
					'2025-01-16T00:00:00.000Z',
					'2025-01-20T23:59:59.000Z'
				),
			])

			expect(result).toHaveLength(1)
			expect(result.at(0)?.isTruncatedEnd).toBe(true)
		})

		it('truncates event spanning entire week and beyond', () => {
			const result = run([longMultiDayEvent])

			expect(result).toHaveLength(1)
			const [p] = result
			expect(p.left).toBe(0)
			expect(p.width).toBe(100)
			expect(p.isTruncatedStart).toBe(true)
			expect(p.isTruncatedEnd).toBe(true)
		})
	})

	describe('Edge Cases - Grid Bounds', () => {
		it('clamps single-day event at last day boundary', () => {
			const result = run([
				mkEvent(
					'single-day',
					'2025-01-18T23:00:00.000Z',
					'2025-01-18T23:59:59.000Z'
				),
			])

			expect(result).toHaveLength(1)
			expect(result.at(0)?.left).toBeCloseTo(85.714285, 2)
		})

		it('handles events exactly at week boundaries', () => {
			const result = run([
				mkEvent(
					'first',
					'2025-01-12T00:00:00.000Z',
					'2025-01-12T23:59:59.000Z'
				),
				mkEvent('last', '2025-01-18T00:00:00.000Z', '2025-01-18T23:59:59.000Z'),
			])

			expect(result).toHaveLength(2)
			const [first, last] = result
			expect(first.left).toBe(0)
			expect(last.left).toBeCloseTo(85.714285, 2)
		})
	})

	describe('Complex Scenarios - Overlapping Events', () => {
		it('stacks overlapping single-day events vertically', () => {
			const result = run([
				singleDayEvent,
				mkEvent(
					'single-2',
					'2025-01-13T11:00:00.000Z',
					'2025-01-13T11:30:00.000Z'
				),
				mkEvent(
					'single-3',
					'2025-01-13T14:00:00.000Z',
					'2025-01-13T14:30:00.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 1, 2])
		})

		it('stacks overlapping multi-day events correctly', () => {
			const result = run([
				multiDayEvent,
				mkEvent(
					'multi-2',
					'2025-01-14T00:00:00.000Z',
					'2025-01-16T23:59:59.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 1])
		})

		it('sorts multi-day events by duration (longer first)', () => {
			const result = run([
				mkEvent(
					'short',
					'2025-01-13T00:00:00.000Z',
					'2025-01-14T23:59:59.000Z'
				),
				mkEvent('long', '2025-01-13T00:00:00.000Z', '2025-01-16T23:59:59.000Z'),
			])

			expect(result.map((p) => p.event.id)).toEqual(['long', 'short'])
		})
	})

	describe('Complex Scenarios - Gap Filling', () => {
		it('fills gaps with single-day events', () => {
			const result = run([
				multiDayEvent,
				mkEvent(
					'gap-filler',
					'2025-01-16T10:00:00.000Z',
					'2025-01-16T11:00:00.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 0])
		})

		it('places non-overlapping events in same row', () => {
			const result = run([
				multiDayEvent,
				mkEvent(
					'multi-2',
					'2025-01-17T00:00:00.000Z',
					'2025-01-18T23:59:59.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 0])
		})
	})

	describe('Grid Overflow Handling', () => {
		it('stops placing events when dayMaxEvents is reached', () => {
			const manyEvents = Array.from({ length: 10 }, (_, i) =>
				mkEvent(
					`event-${i}`,
					dayjs('2025-01-13T10:00:00.000Z').add(i, 'hour').toISOString(),
					dayjs('2025-01-13T11:00:00.000Z').add(i, 'hour').toISOString()
				)
			)

			const result = run(manyEvents, { dayMaxEvents: 3 })

			expect(result).toHaveLength(3)
			expect(result.map((p) => p.event.id)).toEqual([
				'event-0',
				'event-1',
				'event-2',
			])
			expect(result.map((p) => p.row)).toEqual([0, 1, 2])
		})

		it('tries to place truncated version if full event does not fit', () => {
			const fillerEvents = [0, 1, 2].map((i) =>
				mkEvent(
					`filler-${i}`,
					'2025-01-13T00:00:00.000Z',
					'2025-01-15T23:59:59.000Z'
				)
			)

			const result = run(fillerEvents, { dayMaxEvents: 2 })

			expect(result).toHaveLength(2)
		})

		it('respects dayMaxEvents limit when placing overlapping events', () => {
			const blockerEvents = [0, 1, 2].map((i) =>
				mkEvent(
					`blocker-${i}`,
					'2025-01-13T00:00:00.000Z',
					'2025-01-15T23:59:59.000Z'
				)
			)

			const result = run(blockerEvents, { dayMaxEvents: 2 })

			expect(result).toHaveLength(2)
			expect(result.map((p) => p.row)).toEqual([0, 1])
		})
	})

	describe('Hour Grid Type', () => {
		it('handles hour gridType for single-day events', () => {
			const result = run(
				[
					mkEvent(
						'single-day',
						'2025-01-13T10:00:00.000Z',
						'2025-01-13T10:00:00.000Z'
					),
				],
				{ gridType: 'hour' }
			)

			expect(result).toHaveLength(1)
			expect(result.at(0)?.width).toBeCloseTo(14.285714, 2)
		})

		it('handles hour gridType for multi-hour events', () => {
			const result = run(
				[
					mkEvent(
						'single-day',
						'2025-01-13T10:00:00.000Z',
						'2025-01-13T13:01:00.000Z'
					),
				],
				{ gridType: 'hour' }
			)

			expect(result).toHaveLength(1)
			expect(result.at(0)?.row).toBe(0)
		})
	})
})
