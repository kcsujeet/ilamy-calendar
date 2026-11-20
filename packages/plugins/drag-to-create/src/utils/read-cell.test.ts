import { afterEach, describe, expect, it } from 'bun:test'
import { dayKey, toUtcIso, type ZonedDate } from '@ilamy/utils/temporal'
import { cellElementAt, readCell } from './read-cell'

const makeCell = (attrs: Record<string, string>): HTMLElement => {
	const el = document.createElement('div')
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value)
	}
	return el
}

const wallClock = (date: ZonedDate | undefined): string => {
	if (!date) {
		return ''
	}
	const hh = String(date.hour).padStart(2, '0')
	const mm = String(date.minute).padStart(2, '0')
	return `${dayKey(date)} ${hh}:${mm}`
}

describe('readCell', () => {
	it('returns null for null/undefined', () => {
		expect(readCell(null)).toBeNull()
		expect(readCell(undefined)).toBeNull()
	})

	it('returns null when the element is not inside a cell', () => {
		expect(readCell(document.createElement('div'))).toBeNull()
	})

	it('reads start/end/resource/allDay off a cell', () => {
		const cell = makeCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
			'data-resource-id': 'room-a',
			'data-all-day': 'true',
		})

		const result = readCell(cell)

		expect(result ? toUtcIso(result.start) : '').toBe(
			'2025-01-01T09:00:00.000Z'
		)
		expect(result ? toUtcIso(result.end) : '').toBe('2025-01-01T10:00:00.000Z')
		expect(result?.resourceId).toBe('room-a')
		expect(result?.allDay).toBe(true)
		expect(result?.element).toBe(cell)
	})

	it('defaults allDay to false and resourceId to undefined when absent', () => {
		const cell = makeCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
		})

		const result = readCell(cell)

		expect(result?.allDay).toBe(false)
		expect(result?.resourceId).toBeUndefined()
	})

	it('finds the cell from a descendant element', () => {
		const cell = makeCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
		})
		const child = document.createElement('span')
		cell.appendChild(child)

		expect(readCell(child)?.element).toBe(cell)
	})

	it('returns null for a disabled cell', () => {
		const cell = makeCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
			'data-disabled': 'true',
		})

		expect(readCell(cell)).toBeNull()
	})

	it('reads the snap size and the time axis a cell names', () => {
		const cell = makeCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
			'data-snap-minutes': '5',
			'data-time-axis': 'horizontal',
		})

		const result = readCell(cell)

		expect(result?.snapMinutes).toBe(5)
		expect(result?.axis).toBe('horizontal')
	})

	it('leaves the snap size and the time axis undefined on a cell that names neither', () => {
		const cell = makeCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
		})

		const result = readCell(cell)

		expect(result?.snapMinutes).toBeUndefined()
		expect(result?.axis).toBeUndefined()
	})

	describe('timezone reconstruction', () => {
		it('round-trips a UTC-behind zone without drift', () => {
			// America/Halifax is UTC-3 in June: the UTC ISO date is >= the local date.
			const cell = makeCell({
				'data-start': '2026-06-01T03:00:00.000Z', // Jun 1 00:00 local
				'data-end': '2026-06-30T02:59:00.000Z', // Jun 29 23:59 local
			})

			const result = readCell(cell, 'America/Halifax')

			expect(wallClock(result?.start)).toBe('2026-06-01 00:00')
			expect(wallClock(result?.end)).toBe('2026-06-29 23:59')
		})

		it('round-trips a UTC-ahead zone where the ISO date precedes the local date', () => {
			// Asia/Tokyo is UTC+9: the UTC ISO date is < the local date.
			const cell = makeCell({
				'data-start': '2026-06-01T15:00:00.000Z', // Jun 2 00:00 local
				'data-end': '2026-06-02T14:59:00.000Z', // Jun 2 23:59 local
			})

			const result = readCell(cell, 'Asia/Tokyo')

			expect(wallClock(result?.start)).toBe('2026-06-02 00:00')
			expect(wallClock(result?.end)).toBe('2026-06-02 23:59')
		})

		it('preserves the instant when no calendar timezone is given', () => {
			const cell = makeCell({
				'data-start': '2026-06-01T03:00:00.000Z',
				'data-end': '2026-06-30T02:59:00.000Z',
			})

			const result = readCell(cell)

			expect(result ? toUtcIso(result.start) : '').toBe(
				'2026-06-01T03:00:00.000Z'
			)
			expect(result ? toUtcIso(result.end) : '').toBe(
				'2026-06-30T02:59:00.000Z'
			)
		})
	})
})

describe('cellElementAt', () => {
	const originalElementsFromPoint = document.elementsFromPoint
	afterEach(() => {
		document.elementsFromPoint = originalElementsFromPoint
	})

	const stubElementsFromPoint = (stack: Element[]) => {
		document.elementsFromPoint = () => stack
	}

	// FullCalendar finds the cell under the pointer from the cells' rectangles,
	// so an event bar drawn over the cell never hides it (HitDragging.queryHit,
	// v7.1.1 interaction/src/interactions/HitDragging.ts:181).
	it('finds the cell beneath an event bar drawn over it', () => {
		const bar = makeCell({ 'data-testid': 'bar' })
		const cell = makeCell({ 'data-start': '2025-01-01T09:00:00.000Z' })
		stubElementsFromPoint([bar, cell, document.body])

		expect(cellElementAt({ clientX: 1, clientY: 1 })).toBe(cell)
	})

	it('returns null when no cell lies under the point', () => {
		stubElementsFromPoint([makeCell({}), document.body])

		expect(cellElementAt({ clientX: 1, clientY: 1 })).toBeNull()
	})
})
