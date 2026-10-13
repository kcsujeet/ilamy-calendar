import { describe, expect, it } from 'bun:test'
import type { Resource } from '@ilamy/types'
import {
	isSameResourceList,
	viewHasResourceAxis,
} from '@/features/calendar/utils/resource-list'

const mkResource = (extra: Partial<Resource> = {}): Resource => ({
	id: 'a',
	title: 'Room',
	...extra,
})
const hours = (startTime: number) => ({
	daysOfWeek: ['monday' as const],
	startTime,
	endTime: 17,
})

describe('isSameResourceList', () => {
	it('is the same for equal content in a new array and new objects', () => {
		expect(isSameResourceList([mkResource()], [mkResource()])).toBe(true)
	})

	it.each([
		['id', { id: 'b' }],
		['title', { title: 'Other' }],
		['color', { color: 'red' }],
		['backgroundColor', { backgroundColor: 'blue' }],
	])('differs when %s differs', (_field, change) => {
		expect(isSameResourceList([mkResource()], [mkResource(change)])).toBe(false)
	})

	it('compares business hours by value', () => {
		const first = [mkResource({ businessHours: hours(9) })]

		expect(
			isSameResourceList(first, [mkResource({ businessHours: hours(9) })])
		).toBe(true)
		expect(
			isSameResourceList(first, [mkResource({ businessHours: hours(10) })])
		).toBe(false)
	})

	it('compares `data` one level deep: same keys with === values', () => {
		const shared = { nested: true }
		const first = [mkResource({ data: { role: 'x', shared } })]

		expect(
			isSameResourceList(first, [mkResource({ data: { role: 'x', shared } })])
		).toBe(true)
		expect(
			isSameResourceList(first, [mkResource({ data: { role: 'y', shared } })])
		).toBe(false)
		expect(
			isSameResourceList(first, [mkResource({ data: { role: 'x' } })])
		).toBe(false)
		expect(
			isSameResourceList(first, [
				mkResource({ data: { role: 'x', shared: { nested: true } } }),
			])
		).toBe(false)
	})

	it('treats an absent `data` as different from an empty one', () => {
		expect(isSameResourceList([mkResource()], [mkResource({ data: {} })])).toBe(
			false
		)
	})

	it('differs in length and in order', () => {
		const rooms = [mkResource(), mkResource({ id: 'b' })]

		expect(isSameResourceList(rooms, [mkResource()])).toBe(false)
		expect(isSameResourceList(rooms, [...rooms].reverse())).toBe(false)
	})
})

describe('viewHasResourceAxis', () => {
	it('is true with resources', () => {
		expect(viewHasResourceAxis({ resources: [mkResource()] })).toBe(true)
	})

	it('is false for an empty or absent list', () => {
		expect(viewHasResourceAxis({ resources: [] })).toBe(false)
		expect(viewHasResourceAxis({})).toBe(false)
	})

	it('follows the explicit flag over the list, for a list still loading', () => {
		expect(viewHasResourceAxis({ resources: [], hasResourceAxis: true })).toBe(
			true
		)
		expect(
			viewHasResourceAxis({ resources: [mkResource()], hasResourceAxis: false })
		).toBe(false)
	})
})
