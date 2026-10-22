/**
 * Micro-benchmark for the hour rows of a day and the column specs built from
 * them. Run under each machine zone you care about:
 *
 *   TZ=UTC bun scripts/bench-day-hours.tsx
 *   TZ=America/New_York bun scripts/bench-day-hours.tsx America/New_York
 *
 * The optional argument is the calendar's `timezone`. "cold" reads a day the
 * process has not seen (a navigation); "warm" repeats one. Exits 1 when a
 * budget is exceeded: building every column of a 50-resource vertical week
 * must take at most 10 ms, and `getDayHours` at most 0.25 ms a day (the per-row
 * wall-clock parse costs 1.8 to 3.8 ms; main's `startOf('day').hour(i)` is printed for comparison).
 */

import type { Resource, ViewConfig } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import dayjs from '@ilamy/utils/dayjs'
import { weekView } from '@/features/calendar/components/views/week'
import { getDayHours } from '@/utils/date-utils'

const calendarZone = process.argv[2]
if (calendarZone) {
	dayjs.tz.setDefault(calendarZone)
}

const COLUMNS_BUDGET_MS = 10
const DAY_HOURS_BUDGET_MS = 0.25
const DAYS_PER_RUN = 60

const dayAt = (offsetDays: number) =>
	dayjs('2025-03-12T09:00:00.000Z').add(offsetDays, 'day')

/** main's implementation, kept here as the cost to stay within. */
const mainGetDayHours = (referenceDate: Dayjs) => {
	const startOfDay = referenceDate.startOf('day')
	return Array.from({ length: 24 }, (_, i) =>
		startOfDay.hour(i).minute(0).second(0).millisecond(0)
	)
}

/** Mean milliseconds per call over `DAYS_PER_RUN` distinct days. */
const coldMs = (run: (day: Dayjs) => unknown, startOffset: number) => {
	const startedAt = performance.now()
	for (let i = 0; i < DAYS_PER_RUN; i++) {
		run(dayAt(startOffset + i))
	}
	return (performance.now() - startedAt) / DAYS_PER_RUN
}

/** Mean milliseconds per call repeating one day. */
const warmMs = (run: (day: Dayjs) => unknown, repeats = 200) => {
	run(dayAt(0))
	const startedAt = performance.now()
	for (let i = 0; i < repeats; i++) {
		run(dayAt(0))
	}
	return (performance.now() - startedAt) / repeats
}

const makeResources = (count: number): Resource[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `r${i}`,
		title: `Resource ${i}`,
	}))

const buildColumns = (resourceCount: number) => {
	const config: ViewConfig = {
		firstDayOfWeek: 0,
		resources: makeResources(resourceCount),
		orientation: 'vertical',
		weekViewGranularity: 'hourly',
	}
	return (date: Dayjs) => weekView.columns?.(date, config)
}

const fmt = (ms: number) => ms.toFixed(3)

// The fastest of a few runs: a busy machine only ever makes a run slower.
const RUNS = 5
const bestOfRuns = (measure: (runIndex: number) => number) =>
	Math.min(...Array.from({ length: RUNS }, (_, runIndex) => measure(runIndex)))
// Each run starts 500 days further on, so cold runs read days not seen yet.
const daysApart = 500

// Weeks are 7 days apart so each cold run reads days it has not seen.
const weekColdMs = (build: (date: Dayjs) => unknown, startOffset: number) => {
	const weeks = 3
	const startedAt = performance.now()
	for (let i = 0; i < weeks; i++) {
		build(dayAt(startOffset + i * 7))
	}
	return (performance.now() - startedAt) / weeks
}

const mainCold = bestOfRuns((r) =>
	coldMs(mainGetDayHours, 1000 + r * daysApart)
)
const mainWarm = bestOfRuns(() => warmMs(mainGetDayHours))
const dayHoursCold = bestOfRuns((r) =>
	coldMs((day) => getDayHours({ referenceDate: day }), 4000 + r * daysApart)
)
const dayHoursWarm = bestOfRuns(() =>
	warmMs((day) => getDayHours({ referenceDate: day }))
)

const columns50 = buildColumns(50)
const columns500 = buildColumns(500)
const columns50Cold = bestOfRuns((r) =>
	weekColdMs(columns50, 8000 + r * daysApart)
)
const columns50Warm = bestOfRuns(() => warmMs(columns50, 5))
const columns500Cold = bestOfRuns((r) =>
	weekColdMs(columns500, 12000 + r * daysApart)
)
const columns500Warm = bestOfRuns(() => warmMs(columns500, 2))

console.log(
	`machine TZ=${process.env.TZ ?? '(unset)'} calendar zone=${calendarZone ?? '(none)'}`
)
console.log(
	`getDayHours  main   cold ${fmt(mainCold)} ms  warm ${fmt(mainWarm)} ms`
)
console.log(
	`getDayHours  this   cold ${fmt(dayHoursCold)} ms  warm ${fmt(dayHoursWarm)} ms`
)
console.log(
	`columns 50 resources  cold ${fmt(columns50Cold)} ms  warm ${fmt(columns50Warm)} ms`
)
console.log(
	`columns 500 resources cold ${fmt(columns500Cold)} ms  warm ${fmt(columns500Warm)} ms`
)

const isColumnsOverBudget = columns50Cold > COLUMNS_BUDGET_MS
const isDayHoursOverBudget = dayHoursCold > DAY_HOURS_BUDGET_MS
if (isColumnsOverBudget || isDayHoursOverBudget) {
	console.error(
		`OVER BUDGET: columns(50) ${fmt(columns50Cold)} ms (max ${COLUMNS_BUDGET_MS}), getDayHours ${fmt(dayHoursCold)} ms (max ${DAY_HOURS_BUDGET_MS})`
	)
	process.exit(1)
}
