import { describe, expect, test } from 'bun:test'
import { getWeekColumnTemplate } from './constants'

describe('getWeekColumnTemplate', () => {
	test('uses CSS variable for gutter track and repeats day columns', () => {
		expect(getWeekColumnTemplate(7)).toBe(
			'minmax(var(--week-gutter-width), var(--week-gutter-width)) repeat(7, minmax(0, 1fr))'
		)
	})
})
