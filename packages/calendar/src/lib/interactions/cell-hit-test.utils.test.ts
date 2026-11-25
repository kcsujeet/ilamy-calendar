import { afterEach, describe, expect, it } from 'bun:test'
import {
	dayKey,
	parseDate,
	toUtcIso,
	type ZonedDate,
} from '../../utils/temporal'
import {
	cellElementAt,
	computeSelectionRange,
	findSlotAtPointer,
	getCellBounds,
	isSameRegion,
	type RawCell,
	readCell,
	snapCellToPoint,
} from './cell-hit-test.utils'

const makeBoxCell = (
	attrs: Record<string, string>,
	box: { top: number; left: number; width: number; height: number } = {
		top: 0,
		left: 0,
		width: 100,
		height: 60,
	}
): HTMLElement => {
	const el = document.createElement('div')
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value)
	}
	el.getBoundingClientRect = () =>
		({
			...box,
			right: box.left + box.width,
			bottom: box.top + box.height,
			x: box.left,
			y: box.top,
			toJSON: () => ({}),
		}) as DOMRect
	return el
}

const wallClock = (date: ZonedDate | undefined): string => {
	if (!date) return ''
	const hh = String(date.hour).padStart(2, '0')
	const mm = String(date.minute).padStart(2, '0')
	return `${dayKey(date)} ${hh}:${mm}`
}

const readStrict = (
	attrs: Record<string, string>,
	box = { top: 100, left: 200, width: 80, height: 120 }
): RawCell => {
	const cell = readCell(makeBoxCell(attrs, box))
	if (!cell) throw new Error('Invalid cell fixture')
	return cell
}

describe('readCell', () => {
	it('returns null for null/undefined, non-cell, missing dates, or disabled cell', () => {
		expect(readCell(null)).toBeNull()
		expect(readCell(undefined)).toBeNull()
		expect(readCell(document.createElement('div'))).toBeNull()
		expect(
			readCell(makeBoxCell({ 'data-start': '2025-01-01T09:00:00Z' }))
		).toBeNull()
		expect(
			readCell(
				makeBoxCell({
					'data-start': '2025-01-01T09:00:00Z',
					'data-end': '2025-01-01T10:00:00Z',
					'data-disabled': 'true',
				})
			)
		).toBeNull()
	})

	it('reads metadata and finds ancestor cell from child element', () => {
		const cell = makeBoxCell({
			'data-start': '2025-01-01T09:00:00.000Z',
			'data-end': '2025-01-01T10:00:00.000Z',
			'data-resource-id': 'room-a',
			'data-all-day': 'true',
			'data-snap-minutes': '15',
			'data-time-axis': 'vertical',
		})
		const child = document.createElement('span')
		cell.appendChild(child)

		const result = readCell(child)
		expect(result?.element).toBe(cell)
		expect(result?.resourceId).toBe('room-a')
		expect(result?.allDay).toBe(true)
		expect(result?.snapMinutes).toBe(15)
		expect(result?.axis).toBe('vertical')
	})

	it('reconstructs wall-clock dates across behind/ahead timezones without drift', () => {
		const cellBehind = makeBoxCell({
			'data-start': '2026-06-01T03:00:00.000Z',
			'data-end': '2026-06-30T02:59:00.000Z',
		})
		const halifax = readCell(cellBehind, 'America/Halifax')
		expect(wallClock(halifax?.start)).toBe('2026-06-01 00:00')
		expect(wallClock(halifax?.end)).toBe('2026-06-29 23:59')

		const cellAhead = makeBoxCell({
			'data-start': '2026-06-01T15:00:00.000Z',
			'data-end': '2026-06-02T14:59:00.000Z',
		})
		const tokyo = readCell(cellAhead, 'Asia/Tokyo')
		expect(wallClock(tokyo?.start)).toBe('2026-06-02 00:00')
		expect(wallClock(tokyo?.end)).toBe('2026-06-02 23:59')
	})
})

describe('cellElementAt', () => {
	const originalElementsFromPoint = document.elementsFromPoint
	afterEach(() => {
		document.elementsFromPoint = originalElementsFromPoint
	})

	it('finds the cell beneath an event bar drawn over it', () => {
		const bar = makeBoxCell({ 'data-testid': 'bar' })
		const cell = makeBoxCell(
			{ 'data-start': '2025-01-01T09:00:00.000Z' },
			{ top: 0, left: 0, width: 100, height: 60 }
		)
		document.elementsFromPoint = () => [bar, cell, document.body]

		expect(cellElementAt({ clientX: 10, clientY: 10 })).toBe(cell)
	})

	it('resolves Blink [py, py+1) subpixel bleed to the cell whose rect actually contains py', () => {
		const cell00 = makeBoxCell(
			{ 'data-start': '2025-03-13T00:00:00.000Z' },
			{ top: 172, left: 100, width: 170, height: 15.90625 }
		)
		const cell15 = makeBoxCell(
			{ 'data-start': '2025-03-13T00:15:00.000Z' },
			{ top: 187.90625, left: 100, width: 170, height: 15.921875 }
		)
		// Blink hit-tests [187, 188) and returns cell15 first even though cell15.top > 187!
		document.elementsFromPoint = () => [cell15, cell00, document.body]
		expect(cellElementAt({ clientX: 120, clientY: 187 })).toBe(cell00)

		// At exact shared integer edge, earlier cell wins (taking last containing match)
		const upper = makeBoxCell(
			{ 'data-start': '2025-03-13T01:00:00.000Z' },
			{ top: 200, left: 100, width: 170, height: 30 }
		)
		const lower = makeBoxCell(
			{ 'data-start': '2025-03-13T01:30:00.000Z' },
			{ top: 230, left: 100, width: 170, height: 30 }
		)
		document.elementsFromPoint = () => [lower, upper]
		expect(cellElementAt({ clientX: 120, clientY: 230 })).toBe(upper)
	})

	it('respects custom selector when provided and returns null when none match', () => {
		const noCell = makeBoxCell({})
		document.elementsFromPoint = () => [noCell, document.body]
		expect(cellElementAt({ clientX: 1, clientY: 1 })).toBeNull()

		const cell = makeBoxCell(
			{ 'data-cell': 'true', 'data-start': '2025-01-01T09:00:00Z' },
			{ top: 0, left: 0, width: 100, height: 50 }
		)
		document.elementsFromPoint = () => [noCell, cell]
		expect(
			cellElementAt({ clientX: 10, clientY: 10 }, '[data-cell="true"]')
		).toBe(cell)
	})
})

describe('snapCellToPoint and getCellBounds', () => {
	const snapping = (axis: 'vertical' | 'horizontal', minutes = 15) => ({
		'data-start': '2025-03-12T09:00:00.000Z',
		'data-end': '2025-03-12T10:00:00.000Z',
		'data-time-axis': axis,
		'data-snap-minutes': String(minutes),
	})

	it('snaps vertically and horizontally to 15-minute slices', () => {
		const vCell = readStrict(snapping('vertical'))
		const vSnapped = snapCellToPoint(vCell, { clientX: 210, clientY: 160 })
		expect(toUtcIso(vSnapped.start)).toBe('2025-03-12T09:30:00.000Z')
		expect(toUtcIso(vSnapped.end)).toBe('2025-03-12T09:45:00.000Z')
		expect(getCellBounds(vSnapped)).toEqual({
			top: 160,
			left: 200,
			width: 80,
			height: 30,
		})

		const hCell = readStrict(snapping('horizontal'))
		const hSnapped = snapCellToPoint(hCell, { clientX: 220, clientY: 100 })
		expect(toUtcIso(hSnapped.start)).toBe('2025-03-12T09:15:00.000Z')
		expect(getCellBounds(hSnapped)).toEqual({
			top: 100,
			left: 220,
			width: 20,
			height: 120,
		})
	})

	it('leaves cells without snapMinutes unchanged', () => {
		const raw = readStrict({
			'data-start': '2025-03-12T09:00:00.000Z',
			'data-end': '2025-03-12T10:00:00.000Z',
		})
		expect(snapCellToPoint(raw, { clientX: 210, clientY: 160 })).toBe(raw)
		expect(getCellBounds(raw)).toEqual({
			top: 100,
			left: 200,
			width: 80,
			height: 120,
		})
	})
})

describe('isSameRegion & computeSelectionRange', () => {
	const mkCell = (
		startIso: string,
		endIso: string,
		extra: Partial<Pick<RawCell, 'allDay' | 'resourceId'>> = {}
	): RawCell => {
		const start = parseDate(startIso, 'UTC')
		const end = parseDate(endIso, 'UTC')
		if (!start || !end) throw new Error('Invalid date')
		return {
			start,
			end,
			allDay: extra.allDay ?? false,
			resourceId: extra.resourceId,
			element: document.createElement('div'),
		}
	}

	it('checks allDay and resourceId region affinity', () => {
		const a = mkCell('2025-01-01T09:00:00Z', '2025-01-01T10:00:00Z', {
			resourceId: 'r1',
		})
		const b = mkCell('2025-01-02T14:00:00Z', '2025-01-02T15:00:00Z', {
			resourceId: 'r1',
		})
		const c = mkCell('2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z', {
			allDay: true,
			resourceId: 'r1',
		})
		const d = mkCell('2025-01-01T09:00:00Z', '2025-01-01T10:00:00Z', {
			resourceId: 'r2',
		})

		expect(isSameRegion(a, b)).toBe(true)
		expect(isSameRegion(a, c)).toBe(false)
		expect(isSameRegion(a, d)).toBe(false)
	})

	it('normalizes forward and reverse selections', () => {
		const early = mkCell('2025-01-01T09:00:00Z', '2025-01-01T10:00:00Z', {
			resourceId: 'r1',
		})
		const late = mkCell('2025-01-01T11:00:00Z', '2025-01-01T12:00:00Z', {
			resourceId: 'r1',
		})
		const forward = computeSelectionRange(early, late)
		const reverse = computeSelectionRange(late, early)
		expect(toUtcIso(forward.start)).toBe('2025-01-01T09:00:00.000Z')
		expect(toUtcIso(forward.end)).toBe('2025-01-01T12:00:00.000Z')
		expect(toUtcIso(reverse.start)).toBe('2025-01-01T09:00:00.000Z')
		expect(toUtcIso(reverse.end)).toBe('2025-01-01T12:00:00.000Z')
		expect(reverse.resourceId).toBe('r1')
	})
})

describe('findSlotAtPointer', () => {
	const mkEntry = (id: string, top: number, bottom: number) => ({
		data: id,
		element: {
			getBoundingClientRect: () =>
				({
					top,
					bottom,
					left: 0,
					right: 100,
					width: 100,
					height: bottom - top,
				}) as DOMRect,
		},
	})

	it('resolves slot edges, 1px gaps to earlier row, shared integer edges, and undefined pointers', () => {
		const slots = [
			mkEntry('09:00', 100, 130.5),
			mkEntry('09:30', 130.5, 160),
			mkEntry('10:00', 161, 191.5),
			mkEntry('10:30', 191.5, 221),
		]

		expect(findSlotAtPointer(slots, 130.4)?.slot).toBe('09:00')
		expect(findSlotAtPointer(slots, 130.5)?.slot).toBe('09:00') // shared edge -> earlier
		expect(findSlotAtPointer(slots, 130.6)?.slot).toBe('09:30')
		expect(findSlotAtPointer(slots, 160.5)?.slot).toBe('09:30') // gap -> earlier
		expect(findSlotAtPointer(slots, 161)?.slot).toBe('10:00')
		expect(findSlotAtPointer(slots, undefined)?.slot).toBe('09:00')
		expect(findSlotAtPointer([undefined, undefined], 130)?.slot).toBeUndefined()
	})
})
