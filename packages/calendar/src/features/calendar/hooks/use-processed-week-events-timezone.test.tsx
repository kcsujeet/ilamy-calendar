import { afterEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { getMonthWeeks } from '@/lib/utils/date-utils'
import { useProcessedWeekEvents } from './useProcessedWeekEvents'

/**
 * The whole test suite runs with the default timezone CLEARED — every package's
 * `testing-library.ts` calls `dayjs.tz.setDefault()` with no argument. That is
 * how a severe timezone-only performance cliff went unnoticed: with a timezone
 * configured, `startOf`/`endOf` take an expensive branch, and the per-day map
 * used to call them inside its event loop.
 *
 * These tests configure a real zone so the day-map path is exercised in the mode
 * real consumers use when they pass the `timezone` prop, and specifically across
 * a DST transition, where fixed-stride day arithmetic misassigns events.
 */
const ZONE = 'America/Los_Angeles'

interface Harness {
	keys: string[]
	byDay: Record<string, string[]>
}

const Probe = ({
	days,
	onResult,
}: {
	days: ReturnType<typeof dayjs>[]
	onResult: (result: Harness) => void
}) => {
	const { dayEventsMap } = useProcessedWeekEvents({ days, gridType: 'day' })
	const byDay: Record<string, string[]> = {}
	for (const [key, events] of dayEventsMap) {
		byDay[key] = events.map((event) => event.id.toString())
	}
	onResult({ keys: [...dayEventsMap.keys()], byDay })
	return null
}

const runWeek = (
	events: CalendarEvent[],
	days: ReturnType<typeof dayjs>[]
): Harness => {
	let captured: Harness = { keys: [], byDay: {} }
	render(
		<CalendarProvider
			dayMaxEvents={5}
			events={events}
			firstDayOfWeek={0}
			locale="en"
			timezone={ZONE}
		>
			<Probe
				days={days}
				onResult={(result) => {
					captured = result
				}}
			/>
		</CalendarProvider>
	)
	return captured
}

afterEach(() => {
	cleanup()
	dayjs.tz.setDefault()
})

describe('useProcessedWeekEvents with a timezone configured', () => {
	test('places events on the correct local day across a spring-forward week', () => {
		dayjs.tz.setDefault(ZONE)
		// 8 March 2026 is the spring-forward date in America/Los_Angeles, so that
		// local day is only 23 hours long.
		const weeks = getMonthWeeks(dayjs('2026-03-08T12:00:00'), 0)
		const week = weeks.find((candidate) =>
			candidate.some((day) => day.format('YYYY-MM-DD') === '2026-03-08')
		)
		expect(week).toBeDefined()
		if (!week) return

		const events: CalendarEvent[] = week.map((day, index) => ({
			id: `d${index}`,
			title: `Day ${index}`,
			start: day.startOf('day').add(9, 'hour'),
			end: day.startOf('day').add(10, 'hour'),
		}))

		const result = runWeek(events, week)

		week.forEach((day, index) => {
			const key = day.format('YYYY-MM-DD')
			expect(result.byDay[key]).toEqual([`d${index}`])
		})
	})

	test('repeats a multi-day event on every local day it spans', () => {
		dayjs.tz.setDefault(ZONE)
		const weeks = getMonthWeeks(dayjs('2026-03-08T12:00:00'), 0)
		const week = weeks.find((candidate) =>
			candidate.some((day) => day.format('YYYY-MM-DD') === '2026-03-08')
		)
		expect(week).toBeDefined()
		if (!week) return

		const first = week.at(0)
		const third = week.at(2)
		expect(first).toBeDefined()
		expect(third).toBeDefined()
		if (!first || !third) return

		const events: CalendarEvent[] = [
			{
				id: 'span',
				title: 'Spans the transition',
				start: first.startOf('day'),
				end: third.endOf('day'),
				allDay: true,
			},
		]

		const result = runWeek(events, week)

		// Present on the first three days, absent afterwards.
		week.forEach((day, index) => {
			const key = day.format('YYYY-MM-DD')
			if (index <= 2) {
				expect(result.byDay[key]).toEqual(['span'])
			} else {
				expect(result.byDay[key]).toEqual([])
			}
		})
	})

	test('produces one map entry per day of the grid', () => {
		dayjs.tz.setDefault(ZONE)
		const weeks = getMonthWeeks(dayjs('2026-11-01T12:00:00'), 0)
		// 1 November 2026 is the fall-back date, so this local day is 25 hours long.
		const week = weeks.find((candidate) =>
			candidate.some((day) => day.format('YYYY-MM-DD') === '2026-11-01')
		)
		expect(week).toBeDefined()
		if (!week) return

		const result = runWeek([], week)
		expect(result.keys).toEqual(week.map((day) => day.format('YYYY-MM-DD')))
	})
})
