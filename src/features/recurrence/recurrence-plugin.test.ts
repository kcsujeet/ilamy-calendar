import { describe, expect, test } from 'bun:test'
import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { recurrencePlugin } from './recurrence-plugin'

const base: CalendarEvent = {
	id: 'daily-1',
	uid: 'daily-1@ilamy.calendar',
	title: 'Daily',
	start: dayjs('2025-01-06T09:00:00.000Z'),
	end: dayjs('2025-01-06T10:00:00.000Z'),
	rrule: {
		freq: RRule.DAILY,
		interval: 1,
		dtstart: new Date('2025-01-06T09:00:00.000Z'),
	},
} as CalendarEvent

describe('recurrencePlugin', () => {
	test('ownsEvent is true for events with an rrule', () => {
		const plugin = recurrencePlugin()
		expect(plugin.ownsEvent?.(base)).toBe(true)
		expect(plugin.ownsEvent?.({ ...base, rrule: undefined })).toBe(false)
	})

	test('expandEvent returns occurrences for an rrule event', () => {
		const plugin = recurrencePlugin()
		const occurrences = plugin.expandEvent?.(base, {
			start: dayjs('2025-01-06T00:00:00.000Z'),
			end: dayjs('2025-01-08T23:59:59.999Z'),
		})
		expect(occurrences?.length).toBe(3)
	})

	test('expandEvent returns null for a non-rrule event (defer to default)', () => {
		const plugin = recurrencePlugin()
		const plain = { ...base, rrule: undefined }
		expect(
			plugin.expandEvent?.(plain, {
				start: dayjs('2025-01-06T00:00:00.000Z'),
				end: dayjs('2025-01-08T23:59:59.999Z'),
			})
		).toBeNull()
	})
})
