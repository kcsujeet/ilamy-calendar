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

	// A container whose element is drawn at `drawnAt`, 10px square: where it
	// really is, which dnd-kit's rect can lag behind.
	const mkContainer = (
		id: UniqueIdentifier,
		drawnAt: { left: number; top: number },
		data?: { allDay: boolean }
	) => {
		const { left, top } = drawnAt
		const element = {
			getBoundingClientRect: () => ({
				left,
				top,
				right: left + 10,
				bottom: top + 10,
				width: 10,
				height: 10,
			}),
		}
		return {
			id,
			node: { current: element },
			data: { current: data },
		} as unknown as DroppableContainer
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
			return {
				id,
				drawnAt: { left: column * 10, top: row * 10 },
				...mkRect(column * 10, row * 10, 10),
			}
		})
		const droppableRects = new Map<UniqueIdentifier, ClientRect>(
			cells.map((cell) => [cell.id, cell.rect])
		)
		const droppableContainers = cells.map((cell) =>
			mkContainer(cell.id, cell.drawnAt)
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
		// Each call draws its own containers, so compare who hit and how they rank.
		const rank = (detect: CollisionDetection) =>
			detectWith(detect, pointer).collisions.map(({ id, data }) => [
				id,
				data?.value,
			])
		expect(rank(pointerWithinLazily)).toEqual(rank(pointerWithin))
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

	// A sticky element does not scroll with its container, but dnd-kit moves its
	// rect with the scroll as if it did: after a wheel turn the all-day strip is
	// measured 120px below where it is drawn, over the pointer.
	it('ignores a cell that is no longer drawn where dnd-kit measured it', () => {
		const droppableRects = new Map<UniqueIdentifier, ClientRect>([
			['strip', mkRect(0, 20, 10).rect],
			['slot', mkRect(0, 20, 10).rect],
		])
		const collisions = pointerWithinLazily({
			active: {} as Active,
			collisionRect: mkRect(0, 0, 0).rect,
			droppableRects,
			droppableContainers: [
				mkContainer('strip', { left: 0, top: 0 }),
				mkContainer('slot', { left: 0, top: 20 }),
			],
			pointerCoordinates: { x: 5, y: 25 },
		})

		expect(collisions.map((collision) => collision.id)).toEqual(['slot'])
	})

	// The strip is the other half of that fact: dnd-kit's rect for it is wrong
	// whenever the grid has scrolled, so it is hit-tested where it is drawn. The
	// strip below is drawn at 20 (over the pointer) and measured at 220; the
	// time column's measured rect, which dnd-kit gets right, covers the pointer.
	describe('an all-day cell', () => {
		const detectOverStrip = () =>
			pointerWithinLazily({
				active: {} as Active,
				collisionRect: mkRect(0, 0, 0).rect,
				droppableRects: new Map<UniqueIdentifier, ClientRect>([
					['strip', mkRect(0, 220, 10).rect],
					['column', mkRect(0, 0, 400).rect],
				]),
				droppableContainers: [
					mkContainer('strip', { left: 0, top: 20 }, { allDay: true }),
					mkContainer('column', { left: 0, top: 20 }),
				],
				pointerCoordinates: { x: 5, y: 25 },
			})

		it('is hit where it is drawn, though dnd-kit measured it elsewhere', () => {
			const hitIds = detectOverStrip().map((collision) => collision.id)

			expect(hitIds).toContain('strip')
		})

		it('beats the time column drawn under it', () => {
			const hitIds = detectOverStrip().map((collision) => collision.id)

			expect(hitIds).toEqual(['strip'])
		})

		it('is not hit by a pointer that is outside where it is drawn', () => {
			const collisions = pointerWithinLazily({
				active: {} as Active,
				collisionRect: mkRect(0, 0, 0).rect,
				droppableRects: new Map<UniqueIdentifier, ClientRect>([
					['strip', mkRect(0, 20, 10).rect],
				]),
				droppableContainers: [
					mkContainer('strip', { left: 0, top: 220 }, { allDay: true }),
				],
				pointerCoordinates: { x: 5, y: 25 },
			})

			expect(collisions).toEqual([])
		})
	})
})
