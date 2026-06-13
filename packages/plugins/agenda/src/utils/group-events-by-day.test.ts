import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { groupEventsByDay } from './group-events-by-day'

const mkEvent = (
	id: string,
	startISO: string,
	endISO: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: `Event ${id}`,
	start: dayjs(startISO),
	end: dayjs(endISO),
	...extra,
})

const run = (events: CalendarEvent[], startISO: string, endISO: string) =>
	groupEventsByDay(events, { start: dayjs(startISO), end: dayjs(endISO) })

describe('groupEventsByDay', () => {
	it('returns an empty array when there are no events', () => {
		expect(run([], '2026-06-01T00:00:00', '2026-06-30T23:59:59')).toEqual([])
	})

	it('groups by day, skips empty days, orders chronologically', () => {
		const events = [
			mkEvent('b', '2026-06-03T09:00:00', '2026-06-03T10:00:00'),
			mkEvent('a', '2026-06-01T09:00:00', '2026-06-01T10:00:00'),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-05T23:59:59')
		expect(groups.map((g) => g.key)).toEqual(['2026-06-01', '2026-06-03'])
		expect(groups.map((g) => g.events.map((e) => e.id))).toEqual([['a'], ['b']])
	})

	it('sorts within a day: all-day first, then by start time', () => {
		const events = [
			mkEvent('timed-late', '2026-06-01T15:00:00', '2026-06-01T16:00:00'),
			mkEvent('allday', '2026-06-01T00:00:00', '2026-06-01T23:59:59', {
				allDay: true,
			}),
			mkEvent('timed-early', '2026-06-01T09:00:00', '2026-06-01T10:00:00'),
		]
		const [group] = run(events, '2026-06-01T00:00:00', '2026-06-01T23:59:59')
		expect(group.events.map((e) => e.id)).toEqual([
			'allday',
			'timed-early',
			'timed-late',
		])
	})

	it('repeats a multi-day event under each overlapped day in the range', () => {
		const events = [
			mkEvent('multi', '2026-06-02T00:00:00', '2026-06-04T23:59:59', {
				allDay: true,
			}),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-05T23:59:59')
		expect(groups.map((g) => g.key)).toEqual([
			'2026-06-02',
			'2026-06-03',
			'2026-06-04',
		])
		expect(groups.every((g) => g.events.at(0)?.id === 'multi')).toBe(true)
	})

	it('clamps a multi-day event to the range window', () => {
		const events = [
			mkEvent('multi', '2026-05-30T00:00:00', '2026-06-03T23:59:59', {
				allDay: true,
			}),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-02T23:59:59')
		expect(groups.map((g) => g.key)).toEqual(['2026-06-01', '2026-06-02'])
	})
})
