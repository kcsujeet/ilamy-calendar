import { describe, expect, it } from 'bun:test'
import { type RawCell, readCell } from './read-cell'
import { getCellBounds, snapCellToPoint } from './snap-cell'

/** A cell element on screen at the given box, with the attributes a calendar cell emits. */
const makeCellElement = (
	attrs: Record<string, string>,
	box: { top: number; left: number; width: number; height: number }
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

const hourAttrs = {
	'data-start': '2025-03-12T09:00:00.000Z',
	'data-end': '2025-03-12T10:00:00.000Z',
}
const snapping = (axis: 'vertical' | 'horizontal', minutes = 15) => ({
	...hourAttrs,
	'data-time-axis': axis,
	'data-snap-minutes': String(minutes),
})

const readSnapCell = (
	attrs: Record<string, string>,
	box = { top: 100, left: 200, width: 80, height: 120 }
): RawCell => {
	const cell = readCell(makeCellElement(attrs, box))
	if (!cell) {
		throw new Error('the fixture is not a readable cell')
	}
	return cell
}

const span = (cell: RawCell) => [
	cell.start.toISOString(),
	cell.end.toISOString(),
]

describe('snapCellToPoint', () => {
	it.each([
		[100, '09:00', '09:15'],
		[129, '09:00', '09:15'],
		[130, '09:15', '09:30'],
		[160, '09:30', '09:45'],
		[219, '09:45', '10:00'],
		[400, '09:45', '10:00'],
	])(
		'with the pointer at y=%i in a 120px hour cell it selects %s to %s',
		(clientY, from, to) => {
			const snapped = snapCellToPoint(readSnapCell(snapping('vertical')), {
				clientX: 210,
				clientY,
			})

			expect(span(snapped)).toEqual([
				`2025-03-12T${from}:00.000Z`,
				`2025-03-12T${to}:00.000Z`,
			])
		}
	)

	it('reads the horizontal position on a horizontal cell', () => {
		// 20 of 80px across the cell is 15 of 60 minutes.
		const snapped = snapCellToPoint(readSnapCell(snapping('horizontal')), {
			clientX: 220,
			clientY: 100,
		})

		expect(span(snapped)).toEqual([
			'2025-03-12T09:15:00.000Z',
			'2025-03-12T09:30:00.000Z',
		])
	})

	it('snaps inside a 30-minute slot to 5 minutes', () => {
		const slot = readSnapCell({
			'data-start': '2025-03-12T09:30:00.000Z',
			'data-end': '2025-03-12T10:00:00.000Z',
			'data-time-axis': 'vertical',
			'data-snap-minutes': '5',
		})

		const snapped = snapCellToPoint(slot, { clientX: 210, clientY: 190 })

		// 90 of 120px is 22.5 of 30 minutes: the 20-minute bucket.
		expect(span(snapped)).toEqual([
			'2025-03-12T09:50:00.000Z',
			'2025-03-12T09:55:00.000Z',
		])
	})

	it('returns a cell with no snap as it is', () => {
		const cell = readSnapCell(hourAttrs)

		expect(snapCellToPoint(cell, { clientX: 210, clientY: 190 })).toBe(cell)
	})

	it('tells a different pointer position in the same cell apart', () => {
		const cell = readSnapCell(snapping('vertical'))
		const top = snapCellToPoint(cell, { clientX: 210, clientY: 100 })
		const bottom = snapCellToPoint(cell, { clientX: 210, clientY: 219 })

		expect([top.start.toISOString(), bottom.start.toISOString()]).toEqual([
			'2025-03-12T09:00:00.000Z',
			'2025-03-12T09:45:00.000Z',
		])
	})
})

describe('getCellBounds', () => {
	it('is the whole cell for a cell that was not snapped', () => {
		const cell = readSnapCell(hourAttrs)

		expect(getCellBounds(cell)).toEqual({
			top: 100,
			left: 200,
			width: 80,
			height: 120,
		})
	})

	it('is the snap-sized slice of the cell, read from where the cell is now', () => {
		const box = { top: 100, left: 200, width: 80, height: 120 }
		const snapped = snapCellToPoint(readSnapCell(snapping('vertical'), box), {
			clientX: 210,
			clientY: 160,
		})
		// The grid scrolls: the cell is 40px higher, and the slice moves with it.
		box.top = 60

		expect(getCellBounds(snapped)).toEqual({
			top: 120,
			left: 200,
			width: 80,
			height: 30,
		})
	})

	it('slices a horizontal cell across its width', () => {
		const snapped = snapCellToPoint(readSnapCell(snapping('horizontal')), {
			clientX: 270,
			clientY: 100,
		})

		expect(getCellBounds(snapped)).toEqual({
			top: 100,
			left: 260,
			width: 20,
			height: 120,
		})
	})
})
