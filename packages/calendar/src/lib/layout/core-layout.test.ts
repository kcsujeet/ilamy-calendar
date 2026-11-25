import { describe, expect, it } from 'bun:test'
import { getDayHours, getWeekDays } from '../../utils/core-date-grid.utils'
import { parseDate } from '../../utils/temporal'
import { layoutHorizontal } from './core-layout-horizontal.utils'
import { layoutVertical } from './core-layout-vertical.utils'

const at = (iso: string, tz = 'UTC') => {
	const d = parseDate(iso, tz)
	if (!d) throw new Error(`Invalid date: ${iso}`)
	return d
}

describe('core headless layout engines', () => {
	it('places multi-day and overflowing events in layoutHorizontal', () => {
		const days = getWeekDays(at('2026-03-04T00:00:00Z'), 0)
		const events = [
			{
				id: '1',
				title: 'Span',
				start: '2026-03-02T00:00:00Z',
				end: '2026-03-05T00:00:00Z',
				allDay: true,
			},
			{
				id: '2',
				title: 'Single',
				start: '2026-03-02T09:00:00Z',
				end: '2026-03-02T10:00:00Z',
			},
		]

		const { positionedEvents } = layoutHorizontal({
			days,
			events,
			dayMaxEvents: 4,
			gridType: 'day',
		})

		expect(positionedEvents.map((p) => p.event.id)).toEqual(['1', '2'])
		expect(positionedEvents.at(0)?.row).toBe(0)
		expect(positionedEvents.at(1)?.row).toBe(1)
	})

	it('places overlapping timed events across a DST transition on clock rows in layoutVertical', () => {
		// 2025-03-09 in America/New_York is spring-forward (23-hour day).
		// 09:00-11:00 still sits at row 9 (top = 9/24 * 100 = 37.5%, height = 2/24 * 100).
		const hours = getDayHours({
			referenceDate: at('2025-03-09T00:00', 'America/New_York'),
		})
		const events = [
			{
				id: '1',
				title: 'Morning',
				start: '2025-03-09T09:00:00-04:00',
				end: '2025-03-09T11:00:00-04:00',
			},
		]

		const placed = layoutVertical({
			days: hours,
			gridType: 'hour',
			events,
		})

		expect(placed).toHaveLength(1)
		expect(placed.at(0)?.top).toBeCloseTo(37.5, 4)
		expect(placed.at(0)?.height).toBeCloseTo((2 / 24) * 100, 4)
	})
})
