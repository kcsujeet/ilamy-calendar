import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { readCell } from './read-cell'

const makeCell = (attrs: Record<string, string>): HTMLElement => {
	const el = document.createElement('div')
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value)
	}
	return el
}

// The running calendar calls dayjs.tz.setDefault(timezone). Replicate it around
// a test so the configured dayjs (whose dayjs() constructor is aliased to
// dayjs.tz()) parses the UTC `Z` attributes the way it does in the app — without
// this, the round-trip bug stays hidden and the test is falsely green.
const withCalendarTimezone = (tz: string, run: () => void): void => {
	dayjs.tz.setDefault(tz)
	try {
		run()
	} finally {
		dayjs.tz.setDefault(undefined)
	}
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

		expect(result?.start.toISOString()).toBe('2025-01-01T09:00:00.000Z')
		expect(result?.end.toISOString()).toBe('2025-01-01T10:00:00.000Z')
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

	// Cells emit data-start/data-end via toISOString() (UTC). readCell must
	// round-trip them back to the calendar-tz wall-clock the cell represented.
	// The bug: under the calendar's setDefault, the configured dayjs() reads a
	// `Z` string by its literal time, so a plain reconstruction drifted by the
	// UTC offset (a Jun 29 23:59 cell read back as Jun 30 02:59). readCell parses
	// the instant with dayjs.utc() first, then renders it in the calendar tz.
	describe('timezone reconstruction', () => {
		it('round-trips a UTC-behind zone without drift (the reported bug)', () => {
			// America/Halifax is UTC-3 in June: the UTC ISO date is >= the local date.
			withCalendarTimezone('America/Halifax', () => {
				const cell = makeCell({
					'data-start': '2026-06-01T03:00:00.000Z', // Jun 1 00:00 local
					'data-end': '2026-06-30T02:59:00.000Z', // Jun 29 23:59 local
				})

				const result = readCell(cell, 'America/Halifax')

				expect(result?.start.format('YYYY-MM-DD HH:mm')).toBe(
					'2026-06-01 00:00'
				)
				expect(result?.end.format('YYYY-MM-DD HH:mm')).toBe('2026-06-29 23:59')
			})
		})

		it('round-trips a UTC-ahead zone where the ISO date precedes the local date', () => {
			// Asia/Tokyo is UTC+9: the UTC ISO date is < the local date.
			withCalendarTimezone('Asia/Tokyo', () => {
				const cell = makeCell({
					'data-start': '2026-06-01T15:00:00.000Z', // Jun 2 00:00 local
					'data-end': '2026-06-02T14:59:00.000Z', // Jun 2 23:59 local
				})

				const result = readCell(cell, 'Asia/Tokyo')

				expect(result?.start.format('YYYY-MM-DD HH:mm')).toBe(
					'2026-06-02 00:00'
				)
				expect(result?.end.format('YYYY-MM-DD HH:mm')).toBe('2026-06-02 23:59')
			})
		})

		it('preserves the instant when no calendar timezone is given', () => {
			// Regular calendar (no tz): rendered in local time, but the absolute
			// instant must be unchanged regardless of the runner's system zone.
			const cell = makeCell({
				'data-start': '2026-06-01T03:00:00.000Z',
				'data-end': '2026-06-30T02:59:00.000Z',
			})

			const result = readCell(cell)

			expect(result?.start.toISOString()).toBe('2026-06-01T03:00:00.000Z')
			expect(result?.end.toISOString()).toBe('2026-06-30T02:59:00.000Z')
		})
	})
})
