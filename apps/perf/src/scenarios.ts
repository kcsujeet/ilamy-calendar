import { type CalendarEvent, dayjs, type Resource } from '@ilamy/calendar'
import { RRule } from '@ilamy/calendar/plugins/recurrence'
import { type Plan, SUBJECT_ID } from './plan'

/** The date every scenario opens on: a Wednesday, so week and month both have room either side. */
export const OPEN_DATE = '2025-03-12T09:00:00.000Z'

/** mulberry32: a tiny seeded generator, so every run builds identical events. */
const seeded = (seed: number) => {
	let state = seed
	return () => {
		state += 0x6d2b79f5
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** The window events are spread over: the opened period and the one after it, so navigation lands on busy views. */
const windows: Record<Plan['view'], { from: string; days: number }> = {
	day: { from: '2025-03-12T00:00:00.000Z', days: 2 },
	week: { from: '2025-03-09T00:00:00.000Z', days: 14 },
	month: { from: '2025-03-01T00:00:00.000Z', days: 61 },
	year: { from: '2025-01-01T00:00:00.000Z', days: 365 },
}

const iso = (ms: number) => dayjs(new Date(ms).toISOString())

const makeEvent = (
	id: string,
	startMs: number,
	durationMs: number,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: `Event ${id}`,
	start: iso(startMs),
	end: iso(startMs + durationMs),
	...extra,
})

const randomEvent = (
	id: string,
	random: () => number,
	plan: Plan,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => {
	const window = windows[plan.view]
	const dayIndex = Math.floor(random() * window.days)
	const startHour = 6 + Math.floor(random() * 14)
	const startQuarter = Math.floor(random() * 4)
	const durationQuarters = 2 + Math.floor(random() * 10)
	const startMs =
		Date.parse(window.from) +
		dayIndex * DAY +
		startHour * HOUR +
		startQuarter * 15 * MINUTE
	return makeEvent(id, startMs, durationQuarters * 15 * MINUTE, extra)
}

/**
 * The one event every interaction grabs. It is placed where the scenario's grid
 * shows it without scrolling and, in the month, spans three days so the layout
 * puts it ahead of the crowd instead of behind a "+N more".
 */
const subjectFor = (plan: Plan): CalendarEvent => {
	const resourceId = plan.resources ? 'r0' : undefined
	const extra = { resourceId, title: 'PERF SUBJECT' }
	if (plan.view === 'month' || plan.view === 'year') {
		const start = Date.parse('2025-03-10T10:00:00.000Z')
		return makeEvent(SUBJECT_ID, start, 2 * DAY + 8 * HOUR, extra)
	}
	const startHour = plan.bar === 'vertical' ? 1 : 9
	const start = Date.parse('2025-03-12T00:00:00.000Z') + startHour * HOUR
	return makeEvent(SUBJECT_ID, start, HOUR, extra)
}

export const buildResources = (plan: Plan): Resource[] | undefined => {
	if (!plan.resources) {
		return undefined
	}
	return Array.from({ length: plan.resources }, (_, index) => ({
		id: `r${index}`,
		title: `Resource ${index}`,
	}))
}

export const buildEvents = (plan: Plan): CalendarEvent[] => {
	const random = seeded(20250312)
	const events: CalendarEvent[] = [subjectFor(plan)]

	if (plan.recurringSeries) {
		for (let index = 0; index < plan.recurringSeries; index += 1) {
			const startMs =
				Date.parse('2025-03-01T00:00:00.000Z') +
				(6 + (index % 14)) * HOUR +
				Math.floor(index / 14) * 15 * MINUTE
			events.push(
				makeEvent(`series-${index}`, startMs, 30 * MINUTE, {
					rrule: { freq: RRule.DAILY, dtstart: new Date(startMs) },
				})
			)
		}
		return events
	}

	const resourceCount = plan.resources ?? 1
	const perResource = plan.eventsPerResource ?? false
	const total = perResource ? plan.events * resourceCount : plan.events
	for (let index = 0; index < total; index += 1) {
		const resourceId = plan.resources
			? `r${perResource ? Math.floor(index / plan.events) : index % resourceCount}`
			: undefined
		events.push(randomEvent(`e${index}`, random, plan, { resourceId }))
	}
	return events
}
