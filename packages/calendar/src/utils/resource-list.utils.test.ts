import { describe, expect, it } from 'bun:test'
import { isSameResourceList } from './resource-list.utils'

describe('isSameResourceList', () => {
	it('returns true for shallowly identical data records and businessHours', () => {
		const a = [
			{
				id: 'r1',
				title: 'Room A',
				color: '#111',
				backgroundColor: '#eee',
				data: { floor: 1 },
				businessHours: { startTime: 9, endTime: 17 },
			},
		]
		const b = [
			{
				id: 'r1',
				title: 'Room A',
				color: '#111',
				backgroundColor: '#eee',
				data: { floor: 1 },
				businessHours: { startTime: 9, endTime: 17 },
			},
		]
		expect(isSameResourceList(a, b)).toBe(true)
	})

	it('returns false when title, order, length, data, or businessHours differ', () => {
		const base = [{ id: 'r1', title: 'Room A', data: { floor: 1 } }]
		expect(
			isSameResourceList(base, [
				{ id: 'r1', title: 'Room B', data: { floor: 1 } },
			])
		).toBe(false)
		expect(
			isSameResourceList(base, [
				{ id: 'r1', title: 'Room A', data: { floor: 2 } },
			])
		).toBe(false)
		expect(
			isSameResourceList(base, [...base, { id: 'r2', title: 'Room B' }])
		).toBe(false)
	})
})
