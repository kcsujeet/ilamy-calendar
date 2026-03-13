import { describe, expect, it } from 'bun:test'
import type { Frequency } from 'rrule'
import type { CalendarEvent } from '@/components/types'
import dayjs from '../configs/dayjs-config'
import { isDeepEqual } from './deep-equal'

describe('deep-equal', () => {
	describe('isDeepEqual', () => {
		describe('Primitives', () => {
			it('should return true for identical strings', () => {
				expect(isDeepEqual('test', 'test')).toBe(true)
			})

			it('should return false for different strings', () => {
				expect(isDeepEqual('test', 'other')).toBe(false)
			})

			it('should return true for identical numbers', () => {
				expect(isDeepEqual(42, 42)).toBe(true)
			})

			it('should return false for different numbers', () => {
				expect(isDeepEqual(42, 43)).toBe(false)
			})

			it('should return true for identical booleans', () => {
				expect(isDeepEqual(true, true)).toBe(true)
				expect(isDeepEqual(false, false)).toBe(true)
			})

			it('should return false for different booleans', () => {
				expect(isDeepEqual(true, false)).toBe(false)
			})

			it('should return true for null and null', () => {
				expect(isDeepEqual(null, null)).toBe(true)
			})

			it('should return true for undefined and undefined', () => {
				expect(isDeepEqual(undefined, undefined)).toBe(true)
			})

			it('should return false for null and undefined', () => {
				expect(isDeepEqual(null, undefined)).toBe(false)
			})

			it('should return false for different types', () => {
				expect(isDeepEqual(42, '42')).toBe(false)
				expect(isDeepEqual(null, {})).toBe(false)
			})
		})

		describe('Arrays', () => {
			it('should return true for empty arrays', () => {
				expect(isDeepEqual([], [])).toBe(true)
			})

			it('should return true for identical primitive arrays', () => {
				expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
			})

			it('should return false for arrays with different lengths', () => {
				expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false)
			})

			it('should return false for arrays with different elements', () => {
				expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
			})

			it('should return false for arrays in different order', () => {
				expect(isDeepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
			})

			it('should return true for nested arrays', () => {
				expect(isDeepEqual([[1], [2, [3]]], [[1], [2, [3]]])).toBe(true)
			})

			it('should return false for different nested arrays', () => {
				expect(isDeepEqual([[1], [2, [3]]], [[1], [2, [4]]])).toBe(false)
			})
		})

		describe('Objects', () => {
			it('should return true for empty objects', () => {
				expect(isDeepEqual({}, {})).toBe(true)
			})

			it('should return true for identical plain objects', () => {
				expect(isDeepEqual({ a: 1, b: 'test' }, { a: 1, b: 'test' })).toBe(true)
			})

			it('should return false for objects with different keys', () => {
				expect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false)
			})

			it('should return false for objects with different values', () => {
				expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false)
			})

			it('should return false if one object has extra keys', () => {
				expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
			})

			it('should return true for nested objects', () => {
				expect(
					isDeepEqual(
						{ a: { b: { c: 3 } }, d: [1, 2] },
						{ a: { b: { c: 3 } }, d: [1, 2] }
					)
				).toBe(true)
			})

			it('should return false for different nested objects', () => {
				expect(
					isDeepEqual({ a: { b: { c: 3 } } }, { a: { b: { c: 4 } } })
				).toBe(false)
			})
		})

		describe('Native Date Objects', () => {
			it('should return true for identical timestamps in different instances', () => {
				const d1 = new Date('2025-01-01T10:00:00Z')
				const d2 = new Date('2025-01-01T10:00:00Z')
				expect(isDeepEqual(d1, d2)).toBe(true)
			})

			it('should return false for different timestamps', () => {
				const d1 = new Date('2025-01-01T10:00:00Z')
				const d2 = new Date('2025-01-01T10:01:00Z')
				expect(isDeepEqual(d1, d2)).toBe(false)
			})

			it('should return true for Date objects within nested structures', () => {
				const obj1 = { schedule: { start: new Date('2025-01-01') } }
				const obj2 = { schedule: { start: new Date('2025-01-01') } }
				expect(isDeepEqual(obj1, obj2)).toBe(true)
			})

			it('should return false when comparing Date to other types', () => {
				const d = new Date('2025-01-01')
				expect(isDeepEqual(d, '2025-01-01')).toBe(false)
				expect(isDeepEqual(d, dayjs('2025-01-01'))).toBe(false)
			})
		})

		describe('Dayjs Instances', () => {
			it('should return true for identical timestamps in different instances', () => {
				const d1 = dayjs('2025-01-01T10:00:00Z')
				const d2 = dayjs('2025-01-01T10:00:00Z')
				expect(isDeepEqual(d1, d2)).toBe(true)
			})

			it('should return false for different timestamps', () => {
				const d1 = dayjs('2025-01-01T10:00:00Z')
				const d2 = dayjs('2025-01-01T10:01:00Z')
				expect(isDeepEqual(d1, d2)).toBe(false)
			})

			it('should return true for dayjs instances within objects', () => {
				const obj1 = { date: dayjs('2025-01-01') }
				const obj2 = { date: dayjs('2025-01-01') }
				expect(isDeepEqual(obj1, obj2)).toBe(true)
			})
		})

		describe('Calendar Events (Integration)', () => {
			const event1: CalendarEvent = {
				id: 1,
				title: 'Event 1',
				start: dayjs('2025-01-01T10:00:00Z'),
				end: dayjs('2025-01-01T11:00:00Z'),
				allDay: false,
			}

			it('should return true for identical event arrays', () => {
				const e1 = {
					...event1,
					start: dayjs(event1.start),
					end: dayjs(event1.end),
				}
				const e2 = {
					...event1,
					start: dayjs(event1.start),
					end: dayjs(event1.end),
				}
				expect(isDeepEqual([e1], [e2])).toBe(true)
			})

			it('should return false for events with different IDs', () => {
				expect(isDeepEqual([event1], [{ ...event1, id: 2 }])).toBe(false)
			})

			it('should return false for events with different recurrence rules', () => {
				const recurring1 = {
					...event1,
					rrule: { freq: 'DAILY' as unknown as Frequency, interval: 1 },
				}
				const recurring2 = {
					...event1,
					rrule: { freq: 'WEEKLY' as unknown as Frequency, interval: 1 },
				}
				expect(isDeepEqual([recurring1], [recurring2])).toBe(false)
			})
		})
	})
})
