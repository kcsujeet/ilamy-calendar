import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import {
	DAY_NUMBER_HEIGHT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
} from '@/lib/constants'
import { getPositionedEvents } from './position-week-events'

const days = Array.from({ length: 7 }, (_, i) =>
	dayjs('2025-01-12').add(i, 'day')
)

describe('getPositionedEvents', () => {
	const singleDayEvent: CalendarEvent = {
		id: 'single-day',
		title: 'Meeting',
		start: dayjs('2025-01-13T10:00:00.000Z'),
		end: dayjs('2025-01-13T11:00:00.000Z'),
	}

	const multiDayEvent: CalendarEvent = {
		id: 'multi-day',
		title: 'Conference',
		start: dayjs('2025-01-13T00:00:00.000Z'),
		end: dayjs('2025-01-15T23:59:59.000Z'),
	}

	const longMultiDayEvent: CalendarEvent = {
		id: 'long-multi-day',
		title: 'Long Conference',
		start: dayjs('2025-01-10T00:00:00.000Z'),
		end: dayjs('2025-01-20T23:59:59.000Z'),
	}

	describe('Basic Positioning', () => {
		it('positions single-day event correctly', () => {
			const result = getPositionedEvents({
				days,
				events: [singleDayEvent],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(1)
			expect(result[0].left).toBeCloseTo(14.285714, 2)
			expect(result[0].width).toBeCloseTo(14.285714, 2)
			expect(result[0].position).toBe(0)
		})

		it('positions multi-day event correctly', () => {
			const result = getPositionedEvents({
				days,
				events: [multiDayEvent],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(1)
			expect(result[0].left).toBeCloseTo(14.285714, 2)
			expect(result[0].width).toBeCloseTo(42.857142, 2)
			expect(result[0].position).toBe(0)
		})

		it('calculates correct top position for first row', () => {
			const result = getPositionedEvents({
				days,
				events: [singleDayEvent],
				dayMaxEvents: 4,
			})

			const expectedTop =
				DAY_NUMBER_HEIGHT +
				GAP_BETWEEN_ELEMENTS +
				0 * (EVENT_BAR_HEIGHT + GAP_BETWEEN_ELEMENTS)
			expect(result[0].top).toBe(expectedTop)
			expect(result[0].height).toBe(EVENT_BAR_HEIGHT)
		})
	})

	describe('Edge Cases - Truncation', () => {
		it('truncates event starting before week start', () => {
			const result = getPositionedEvents({
				days,
				events: [longMultiDayEvent],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(1)
			expect(result[0].left).toBe(0)
			expect(result[0].isTruncatedStart).toBe(true)
		})

		it('truncates event ending after week end', () => {
			const result = getPositionedEvents({
				days,
				events: [
					{
						...multiDayEvent,
						start: dayjs('2025-01-16T00:00:00.000Z'),
						end: dayjs('2025-01-20T23:59:59.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(1)
			expect(result[0].isTruncatedEnd).toBe(true)
		})

		it('truncates event spanning entire week and beyond', () => {
			const result = getPositionedEvents({
				days,
				events: [longMultiDayEvent],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(1)
			expect(result[0].left).toBe(0)
			expect(result[0].width).toBe(100)
			expect(result[0].isTruncatedStart).toBe(true)
			expect(result[0].isTruncatedEnd).toBe(true)
		})
	})

	describe('Edge Cases - Grid Bounds', () => {
		it('clamps single-day event at last day boundary', () => {
			const result = getPositionedEvents({
				days,
				events: [
					{
						...singleDayEvent,
						start: dayjs('2025-01-18T23:00:00.000Z'),
						end: dayjs('2025-01-18T23:59:59.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(1)
			expect(result[0].left).toBeCloseTo(85.714285, 2)
		})

		it('handles events exactly at week boundaries', () => {
			const result = getPositionedEvents({
				days,
				events: [
					{
						...singleDayEvent,
						start: dayjs('2025-01-12T00:00:00.000Z'),
						end: dayjs('2025-01-12T23:59:59.000Z'),
					},
					{
						...singleDayEvent,
						start: dayjs('2025-01-18T00:00:00.000Z'),
						end: dayjs('2025-01-18T23:59:59.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(2)
			expect(result[0].left).toBe(0)
			expect(result[1].left).toBeCloseTo(85.714285, 2)
		})
	})

	describe('Complex Scenarios - Overlapping Events', () => {
		it('stacks overlapping single-day events vertically', () => {
			const result = getPositionedEvents({
				days,
				events: [
					singleDayEvent,
					{
						...singleDayEvent,
						id: 'single-2',
						start: dayjs('2025-01-13T11:00:00.000Z'),
					},
					{
						...singleDayEvent,
						id: 'single-3',
						start: dayjs('2025-01-13T14:00:00.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(3)
			expect(result[0].position).toBe(0)
			expect(result[1].position).toBe(1)
			expect(result[2].position).toBe(2)
		})

		it('stacks overlapping multi-day events correctly', () => {
			const result = getPositionedEvents({
				days,
				events: [
					multiDayEvent,
					{
						...multiDayEvent,
						id: 'multi-2',
						start: dayjs('2025-01-14T00:00:00.000Z'),
						end: dayjs('2025-01-16T23:59:59.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(2)
			expect(result[0].position).toBe(0)
			expect(result[1].position).toBe(1)
		})

		it('sorts multi-day events by duration (longer first)', () => {
			const shortEvent = {
				...multiDayEvent,
				id: 'short',
				end: dayjs('2025-01-14T23:59:59.000Z'),
			}
			const longEvent = {
				...multiDayEvent,
				id: 'long',
				end: dayjs('2025-01-16T23:59:59.000Z'),
			}

			const result = getPositionedEvents({
				days,
				events: [shortEvent, longEvent],
				dayMaxEvents: 4,
			})

			expect(result[0].id).toBe('long')
			expect(result[1].id).toBe('short')
		})
	})

	describe('Complex Scenarios - Gap Filling', () => {
		it('fills gaps with single-day events', () => {
			const result = getPositionedEvents({
				days,
				events: [
					multiDayEvent,
					{
						...singleDayEvent,
						start: dayjs('2025-01-16T10:00:00.000Z'),
						end: dayjs('2025-01-16T11:00:00.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(2)
			expect(result[0].position).toBe(0)
			expect(result[1].position).toBe(0)
		})

		it('places non-overlapping events in same row', () => {
			const result = getPositionedEvents({
				days,
				events: [
					multiDayEvent,
					{
						...multiDayEvent,
						id: 'multi-2',
						start: dayjs('2025-01-17T00:00:00.000Z'),
						end: dayjs('2025-01-18T23:59:59.000Z'),
					},
				],
				dayMaxEvents: 4,
			})

			expect(result).toHaveLength(2)
			expect(result[0].position).toBe(0)
			expect(result[1].position).toBe(0)
		})
	})

	describe('Grid Overflow Handling', () => {
		it('stops placing events when dayMaxEvents is reached', () => {
			const manyEvents = Array.from({ length: 10 }, (_, i) => ({
				...singleDayEvent,
				id: `event-${i}`,
				start: dayjs('2025-01-13T10:00:00.000Z').add(i, 'hour'),
			}))

			const result = getPositionedEvents({
				days,
				events: manyEvents,
				dayMaxEvents: 3,
			})

			expect(result.length).toBeLessThanOrEqual(3)
		})

		it('tries to place truncated version if full event does not fit', () => {
			const fillerEvents = [multiDayEvent, multiDayEvent, multiDayEvent].map(
				(e, i) => ({ ...e, id: `filler-${i}` })
			)

			const result = getPositionedEvents({
				days,
				events: fillerEvents,
				dayMaxEvents: 2,
			})

			expect(result).toHaveLength(2)
		})

		it('respects dayMaxEvents limit when placing overlapping events', () => {
			const blockerEvents = [multiDayEvent, multiDayEvent, multiDayEvent].map(
				(e, i) => ({ ...e, id: `blocker-${i}` })
			)

			const result = getPositionedEvents({
				days,
				events: blockerEvents,
				dayMaxEvents: 2,
			})

			expect(result.length).toBeLessThanOrEqual(2)
			result.forEach((event) => {
				expect(event.position).toBeLessThan(2)
			})
		})
	})

	describe('Hour Grid Type', () => {
		it('handles hour gridType for single-day events', () => {
			const result = getPositionedEvents({
				days,
				events: [{ ...singleDayEvent, end: singleDayEvent.start }],
				dayMaxEvents: 4,
				gridType: 'hour',
			})

			expect(result).toHaveLength(1)
			expect(result[0].width).toBeCloseTo(14.285714, 2)
		})

		it('handles hour gridType for multi-hour events', () => {
			const result = getPositionedEvents({
				days,
				events: [
					{
						...singleDayEvent,
						end: dayjs('2025-01-13T13:01:00.000Z'),
					},
				],
				dayMaxEvents: 4,
				gridType: 'hour',
			})

			expect(result).toHaveLength(1)
			expect(result[0].position).toBe(0)
		})
	})

	describe('Custom Day Number Height', () => {
		it('uses custom dayNumberHeight in calculation', () => {
			const customHeight = 50

			const result = getPositionedEvents({
				days,
				events: [singleDayEvent],
				dayMaxEvents: 4,
				dayNumberHeight: customHeight,
			})

			const expectedTop = customHeight + GAP_BETWEEN_ELEMENTS
			expect(result[0].top).toBe(expectedTop)
		})
	})

	describe('Custom Event Spacing', () => {
		it('uses custom eventSpacing in vertical positioning', () => {
			const customSpacing = 4

			const eventOne: CalendarEvent = {
				id: 'event-1',
				title: 'First Event',
				start: dayjs('2025-01-13T10:00:00.000Z'),
				end: dayjs('2025-01-13T11:00:00.000Z'),
			}

			const eventTwo: CalendarEvent = {
				id: 'event-2',
				title: 'Second Event',
				start: dayjs('2025-01-13T12:00:00.000Z'),
				end: dayjs('2025-01-13T13:00:00.000Z'),
			}

			const result = getPositionedEvents({
				days,
				events: [eventOne, eventTwo],
				dayMaxEvents: 4,
				eventSpacing: customSpacing,
			})

			expect(result).toHaveLength(2)

			const firstEventTop =
				DAY_NUMBER_HEIGHT +
				customSpacing +
				0 * (EVENT_BAR_HEIGHT + customSpacing)
			const secondEventTop =
				DAY_NUMBER_HEIGHT +
				customSpacing +
				1 * (EVENT_BAR_HEIGHT + customSpacing)

			expect(result[0].top).toBe(firstEventTop)
			expect(result[1].top).toBe(secondEventTop)
		})

		it('falls back to GAP_BETWEEN_ELEMENTS when eventSpacing is not provided', () => {
			const result = getPositionedEvents({
				days,
				events: [singleDayEvent],
				dayMaxEvents: 4,
			})

			const expectedTop =
				DAY_NUMBER_HEIGHT +
				GAP_BETWEEN_ELEMENTS +
				0 * (EVENT_BAR_HEIGHT + GAP_BETWEEN_ELEMENTS)
			expect(result[0].top).toBe(expectedTop)
		})

		it('applies custom eventSpacing to multi-day events', () => {
			const customSpacing = 8

			const result = getPositionedEvents({
				days,
				events: [multiDayEvent],
				dayMaxEvents: 4,
				eventSpacing: customSpacing,
			})

			expect(result).toHaveLength(1)

			const expectedTop =
				DAY_NUMBER_HEIGHT +
				customSpacing +
				0 * (EVENT_BAR_HEIGHT + customSpacing)
			expect(result[0].top).toBe(expectedTop)
		})
	})
})
