/**
 * Micro-benchmark for the hour rows of a day and the column specs built from
 * them. Run under each machine zone you care about:
 *
 *   TZ=UTC bun scripts/bench-day-hours.tsx
 *   TZ=America/New_York bun scripts/bench-day-hours.tsx America/New_York
 */

import {
	buildTimeGridViewModel,
	getDayHours,
	type Resource,
} from '../src/index'
import {
	add,
	parseDate,
	resolveZone,
	type ZonedDate,
} from '../src/utils/temporal'

const calendarZone = process.argv[2]
const zone = resolveZone(calendarZone)

const COLUMNS_BUDGET_MS = 10
const DAY_HOURS_BUDGET_MS = 0.25
const DAYS_PER_RUN = 60

const baseDay = parseDate('2025-03-12T09:00:00.000Z', zone)
if (!baseDay) {
	throw new Error('Failed to parse benchmark anchor date')
}

const dayAt = (offsetDays: number): ZonedDate => add(baseDay, offsetDays, 'day')

const coldMs = (run: (day: ZonedDate) => unknown, startOffset: number) => {
	const startedAt = performance.now()
	for (let i = 0; i < DAYS_PER_RUN; i++) {
		run(dayAt(startOffset + i))
	}
	return (performance.now() - startedAt) / DAYS_PER_RUN
}

const warmMs = (run: (day: ZonedDate) => unknown, repeats = 200) => {
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
	const resources = makeResources(resourceCount)
	return (date: ZonedDate) =>
		buildTimeGridViewModel({
			mode: 'week',
			currentDate: date,
			events: [],
			resources,
			firstDayOfWeek: 0,
			locale: 'en',
			timezone: zone,
		}).columns
}

const fmt = (ms: number) => ms.toFixed(3)

const RUNS = 5
const bestOfRuns = (measure: (runIndex: number) => number) =>
	Math.min(...Array.from({ length: RUNS }, (_, runIndex) => measure(runIndex)))
const daysApart = 500

const weekColdMs = (
	build: (date: ZonedDate) => unknown,
	startOffset: number
) => {
	const weeks = 3
	const startedAt = performance.now()
	for (let i = 0; i < weeks; i++) {
		build(dayAt(startOffset + i * 7))
	}
	return (performance.now() - startedAt) / weeks
}

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

console.log(`machine TZ=${process.env.TZ ?? '(unset)'} calendar zone=${zone}`)
console.log(
	`getDayHours  cold ${fmt(dayHoursCold)} ms  warm ${fmt(dayHoursWarm)} ms`
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
