import { describe, expect, it } from 'bun:test'
import {
	type Active,
	type ClientRect,
	type CollisionDetection,
	type DroppableContainer,
	pointerWithin,
	type UniqueIdentifier,
} from '@dnd-kit/core'
import { pointerWithinLazily } from './pointer-within-lazily'

describe('pointerWithinLazily', () => {
	// A droppable's rect that counts how often its edges are read. dnd-kit's
	// own Rect recomputes every edge from the live scroll offsets on each read,
	// which is the cost the lazy version saves.
	const mkRect = (left: number, top: number, size: number) => {
		const counter = { reads: 0 }
		const read = (value: number) => {
			counter.reads += 1
			return value
		}
		const rect: ClientRect = {
			width: size,
			height: size,
			get left() {
				return read(left)
			},
			get top() {
				return read(top)
			},
			get right() {
				return read(left + size)
			},
			get bottom() {
				return read(top + size)
			},
		}
		return { rect, counter }
	}

	// A 4 x 4 grid of 10px cells, ids `cell-<column>-<row>`, in row order.
	const detectWith = (
		detect: CollisionDetection,
		pointerCoordinates: { x: number; y: number } | null
	) => {
		const cells = Array.from({ length: 16 }, (_, index) => {
			const column = index % 4
			const row = Math.floor(index / 4)
			const id = `cell-${column}-${row}`
			return { id, ...mkRect(column * 10, row * 10, 10) }
		})
		const droppableRects = new Map<UniqueIdentifier, ClientRect>(
			cells.map((cell) => [cell.id, cell.rect])
		)
		const droppableContainers = cells.map(
			(cell) => ({ id: cell.id }) as unknown as DroppableContainer
		)
		const collisions = detect({
			active: {} as Active,
			collisionRect: mkRect(0, 0, 0).rect,
			droppableRects,
			droppableContainers,
			pointerCoordinates,
		})
		const reads = cells.reduce((sum, cell) => sum + cell.counter.reads, 0)
		return { collisions, reads }
	}

	const pointers = [
		{ x: 15, y: 25 }, // inside one cell
		{ x: 10, y: 25 }, // on a shared vertical border: two hits
		{ x: 20, y: 20 }, // on a shared corner: four hits
		{ x: 0, y: 0 }, // the grid's own corner
		{ x: 55, y: 5 }, // outside the grid
	]

	it.each(pointers)('returns what pointerWithin returns at %o', (pointer) => {
		const expected = detectWith(pointerWithin, pointer).collisions
		const actual = detectWith(pointerWithinLazily, pointer).collisions
		expect(actual).toEqual(expected)
	})

	it('returns no collisions without a pointer', () => {
		expect(detectWith(pointerWithinLazily, null).collisions).toEqual([])
	})

	it('reads fewer edges than pointerWithin', () => {
		const pointer = { x: 15, y: 25 }
		// pointerWithin reads all four edges of all 16 cells, then the left and top of
		// the one it hit to rank it.
		expect(detectWith(pointerWithin, pointer).reads).toBe(66)
		expect(detectWith(pointerWithinLazily, pointer).reads).toBe(40)
	})
})
