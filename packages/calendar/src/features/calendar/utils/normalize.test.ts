import { describe, expect, it } from 'bun:test'
import { toHiddenDaysSet } from './normalize'

const sorted = (hidden: Set<number> | undefined) => [...(hidden ?? [])].sort()

describe('toHiddenDaysSet', () => {
	it('is undefined when nothing is hidden', () => {
		expect(toHiddenDaysSet(undefined, undefined)).toBeUndefined()
		expect(toHiddenDaysSet([], true)).toBeUndefined()
	})

	it('maps weekday names to day indices, Sunday first', () => {
		expect(sorted(toHiddenDaysSet(['wednesday', 'sunday']))).toEqual([0, 3])
	})

	it('hides Sunday and Saturday when weekends is false', () => {
		expect(sorted(toHiddenDaysSet(undefined, false))).toEqual([0, 6])
	})

	it('is the same set for weekends false as for hiding both weekend days', () => {
		const fromWeekends = toHiddenDaysSet(undefined, false)
		const fromHiddenDays = toHiddenDaysSet(['saturday', 'sunday'])
		expect(fromWeekends).toEqual(fromHiddenDays)
	})

	it('adds the weekend to the hidden days instead of replacing them', () => {
		expect(sorted(toHiddenDaysSet(['wednesday'], false))).toEqual([0, 3, 6])
	})

	it('leaves the weekend alone when weekends is true', () => {
		expect(toHiddenDaysSet(undefined, true)).toBeUndefined()
	})

	it('does not change the array it was given', () => {
		const requested: ('wednesday' | 'sunday')[] = ['wednesday']
		toHiddenDaysSet(requested, false)
		expect(requested).toEqual(['wednesday'])
	})
})
