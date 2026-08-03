import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, IlamyPlugin, PluginDateRange } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { YearView } from './year-view'

/**
 * Regression guard for the defect fixed alongside this file: `YearView` used to
 * issue 516 range queries per render (12 month queries plus 12 x 42
 * mini-calendar day queries) from its render body, with no memoization and no
 * cache beneath it. With the recurrence plugin active each one re-expanded every
 * RRULE, so one recurring event cost hundreds of milliseconds per render.
 *
 * This asserts the COUNT of queries rather than elapsed time. Timing assertions
 * are unusable in CI — shared runners vary by 2-3x — and a flaky performance gate
 * gets disabled, leaving no gate at all. The count is exact, and it states the
 * actual defect: "issues one query, not 516".
 *
 * Observed through a plugin's `transformEvents`, which the core calls once per
 * `getEventsForDateRange`, so it is a faithful proxy reachable through public
 * API.
 */
const countingPlugin = (): {
	plugin: IlamyPlugin
	calls: () => number
	ranges: () => string[]
} => {
	let calls = 0
	const ranges: string[] = []
	return {
		plugin: {
			name: 'query-counter',
			transformEvents: (
				events: CalendarEvent[],
				range: PluginDateRange
			): CalendarEvent[] => {
				calls++
				ranges.push(
					`${range.start.format('YYYY-MM-DD')}..${range.end.format('YYYY-MM-DD')}`
				)
				return events
			},
		},
		calls: () => calls,
		ranges: () => ranges,
	}
}

const events: CalendarEvent[] = [
	{
		id: 'a',
		title: 'March event',
		start: dayjs('2026-03-05T09:00:00.000Z'),
		end: dayjs('2026-03-05T10:00:00.000Z'),
	},
	{
		id: 'b',
		title: 'Spanning event',
		start: dayjs('2026-06-10T00:00:00.000Z'),
		end: dayjs('2026-06-14T23:59:59.999Z'),
		allDay: true,
	},
]

/**
 * Returns the element rather than rendering it, so the re-render test can mount
 * the SAME element twice. Rebuilding the JSX would pass a fresh `plugins` array
 * literal, which legitimately changes the plugin runtime's identity and
 * invalidates the memo — provider behaviour, not the memoization under test.
 */
const yearViewTree = (plugin: IlamyPlugin) => (
	<CalendarProvider
		dayMaxEvents={3}
		events={events}
		firstDayOfWeek={0}
		initialDate={dayjs('2026-03-15T00:00:00.000Z')}
		locale="en"
		plugins={[plugin]}
	>
		<YearView />
	</CalendarProvider>
)

describe('YearView range-query count', () => {
	beforeEach(() => {
		cleanup()
	})

	test('issues a handful of range queries per render, not one per cell', () => {
		const counter = countingPlugin()
		render(yearViewTree(counter.plugin))

		expect(screen.getByTestId('year-view')).toBeInTheDocument()
		// The old implementation issued 516 per render; this one issues exactly 3 —
		// the view's own year query plus the provider's own work for the active
		// range. Pinned rather than bounded: a bound of 6 would pass at 6, and the
		// number is the whole point of the test.
		expect(counter.calls()).toBe(3)
	})

	test('queries a single span covering the whole visible year', () => {
		const counter = countingPlugin()
		render(yearViewTree(counter.plugin))

		// One of the ranges must span the full visible year, which is what makes a
		// single query sufficient. Per-day queries would all be one day wide.
		const spans = counter.ranges().map((range) => {
			const [start, end] = range.split('..')
			return dayjs(`${end}T00:00:00.000Z`).diff(
				dayjs(`${start}T00:00:00.000Z`),
				'day'
			)
		})
		// The visible year grid runs from January's grid start to December's grid
		// end — 12 overlapping 42-day mini calendars — which is 377 whole days apart
		// for 2026 with firstDayOfWeek 0. A per-day query would be 0.
		expect(Math.max(...spans)).toBe(377)
	})

	test('does not re-query when nothing relevant changed', () => {
		const counter = countingPlugin()
		// Built once and re-rendered as-is — see `yearViewTree`.
		const tree = yearViewTree(counter.plugin)
		const { rerender } = render(tree)
		expect(counter.calls()).toBe(3)

		rerender(tree)

		// Unchanged, not merely bounded: `<= first * 2` would have permitted exactly
		// the doubling this test exists to forbid.
		expect(counter.calls()).toBe(3)
	})
})
