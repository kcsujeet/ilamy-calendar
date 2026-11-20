import type { CalendarEvent, IsoDateString } from '@ilamy/calendar'
import {
	add,
	elapsedDiff,
	overlapsRange,
	parseDate,
	resolveZone,
	subtract,
	toEpochMs,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'
import { fromFloatingDate, toFloatingDate } from './floating-time'
import { getEventParentUID } from './series-helpers'

interface GenerateRecurringEventsProps {
	event: CalendarEvent
	currentEvents: CalendarEvent[]
	startDate: IsoDateString | ZonedDate
	endDate: IsoDateString | ZonedDate
	timezone?: string
}

const WINDOW_MARGIN_DAYS = 42
const MS_PER_DAY = 86_400_000
const MAX_MEMOIZED_OCCURRENCES = 4096

interface SeriesMemo {
	rruleOptions: RRuleOptions
	start: IsoDateString
	zone: string
	floatingUntilMs: number | undefined
	rule: RRule
	windowStartMs: number
	windowEndMs: number
	windowOccurrences: number[]
	instants: Map<number, ZonedDate>
}

const seriesMemos = new WeakMap<CalendarEvent, SeriesMemo>()

interface SeriesMemoInput {
	event: CalendarEvent
	rrule: RRuleOptions
	ruleOptions: RRuleOptions
	zone: string
	floatingUntil: Date | undefined
}

const isMatchingMemo = (
	memo: SeriesMemo | undefined,
	event: CalendarEvent,
	rrule: RRuleOptions,
	zone: string,
	floatingUntilMs: number | undefined
): memo is SeriesMemo =>
	Boolean(memo) &&
	memo?.rruleOptions === rrule &&
	memo?.start === event.start &&
	memo?.zone === zone &&
	memo?.floatingUntilMs === floatingUntilMs

const readSeriesMemo = ({
	event,
	rrule,
	ruleOptions,
	zone,
	floatingUntil,
}: SeriesMemoInput): SeriesMemo => {
	const floatingUntilMs = floatingUntil?.getTime()
	const memo = seriesMemos.get(event)
	if (isMatchingMemo(memo, event, rrule, zone, floatingUntilMs)) {
		return memo
	}

	const freshMemo: SeriesMemo = {
		rruleOptions: rrule,
		start: event.start,
		zone,
		floatingUntilMs,
		rule: new RRule(ruleOptions),
		windowStartMs: Number.POSITIVE_INFINITY,
		windowEndMs: Number.NEGATIVE_INFINITY,
		windowOccurrences: [],
		instants: new Map(),
	}
	seriesMemos.set(event, freshMemo)
	return freshMemo
}

const getOccurrencesBetween = (
	memo: SeriesMemo,
	after: Date,
	before: Date
): number[] => {
	const afterMs = after.getTime()
	const beforeMs = before.getTime()
	const hasInvalidBound = Number.isNaN(afterMs) || Number.isNaN(beforeMs)
	if (hasInvalidBound) {
		return memo.rule.between(after, before, true).map((date) => date.getTime())
	}

	const startsInsideWindow = afterMs >= memo.windowStartMs
	const endsInsideWindow = beforeMs <= memo.windowEndMs
	if (!(startsInsideWindow && endsInsideWindow)) {
		const marginMs = WINDOW_MARGIN_DAYS * MS_PER_DAY
		memo.windowStartMs = afterMs - marginMs
		memo.windowEndMs = beforeMs + marginMs
		memo.windowOccurrences = memo.rule
			.between(new Date(memo.windowStartMs), new Date(memo.windowEndMs), true)
			.map((date) => date.getTime())
	}

	const occurrences: number[] = []
	for (const occurrenceMs of memo.windowOccurrences) {
		if (occurrenceMs > beforeMs) {
			break
		}
		if (occurrenceMs >= afterMs) {
			occurrences.push(occurrenceMs)
		}
	}
	return occurrences
}

const getOccurrenceInstant = (
	memo: SeriesMemo,
	occurrenceMs: number,
	zone: string
): ZonedDate => {
	const memoized = memo.instants.get(occurrenceMs)
	if (memoized) {
		return memoized
	}
	if (memo.instants.size >= MAX_MEMOIZED_OCCURRENCES) {
		memo.instants.clear()
	}
	const instant = fromFloatingDate(new Date(occurrenceMs), zone)
	memo.instants.set(occurrenceMs, instant)
	return instant
}

const overridesByEvents = new WeakMap<
	CalendarEvent[],
	Map<string, CalendarEvent[]>
>()

const getOverridesBySeries = (
	events: CalendarEvent[]
): Map<string, CalendarEvent[]> => {
	const known = overridesByEvents.get(events)
	if (known) {
		return known
	}
	const overridesBySeries = new Map<string, CalendarEvent[]>()
	for (const event of events) {
		if (!event.recurrenceId) {
			continue
		}
		const seriesUid = getEventParentUID(event)
		const seriesOverrides = overridesBySeries.get(seriesUid)
		if (seriesOverrides) {
			seriesOverrides.push(event)
		} else {
			overridesBySeries.set(seriesUid, [event])
		}
	}
	overridesByEvents.set(events, overridesBySeries)
	return overridesBySeries
}

const collectEpochInstants = (
	values: Array<IsoDateString | undefined>,
	zone: string
): Set<number> => {
	const instants = new Set<number>()
	for (const value of values) {
		if (!value) continue
		const parsed = parseDate(value, zone)
		if (parsed) {
			instants.add(toEpochMs(parsed))
		}
	}
	return instants
}

const buildOccurrenceInstances = (options: {
	event: CalendarEvent
	parentUid: string
	memo: SeriesMemo
	occurrences: number[]
	skippedInstants: Set<number>
	eventDurationMs: number
	rangeStart: ZonedDate
	rangeEnd: ZonedDate
	zone: string
}): CalendarEvent[] => {
	const {
		event,
		parentUid,
		memo,
		occurrences,
		skippedInstants,
		eventDurationMs,
		rangeStart,
		rangeEnd,
		zone,
	} = options
	const recurringEvents: CalendarEvent[] = []
	for (const [index, occurrenceMs] of occurrences.entries()) {
		const occurrenceDate = getOccurrenceInstant(memo, occurrenceMs, zone)
		if (skippedInstants.has(toEpochMs(occurrenceDate))) {
			continue
		}
		const newEndTime = add(occurrenceDate, eventDurationMs, 'millisecond')
		if (
			!overlapsRange(
				{ start: occurrenceDate, end: newEndTime },
				rangeStart,
				rangeEnd
			)
		) {
			continue
		}
		recurringEvents.push({
			...event,
			id: `${event.id}_${index}`,
			start: toOffsetIso(occurrenceDate),
			end: toOffsetIso(newEndTime),
			uid: parentUid,
			rrule: undefined,
		})
	}
	return recurringEvents
}

interface ResolvedSeriesContext {
	rrule: RRuleOptions
	zone: string
	eventStart: ZonedDate
	eventEnd: ZonedDate
	rangeStart: ZonedDate
	rangeEnd: ZonedDate
	floatingUntil: Date | undefined
}

const resolveSeriesContext = ({
	event,
	startDate,
	endDate,
	timezone,
}: GenerateRecurringEventsProps): ResolvedSeriesContext | null => {
	const rrule = event.rrule
	if (!rrule) {
		return null
	}
	const zone = event.timezone ?? resolveZone(timezone)
	const eventStart = parseDate(event.start, zone)
	const eventEnd = parseDate(event.end, zone)
	const rangeStart = parseDate(startDate, zone)
	const rangeEnd = parseDate(endDate, zone)
	if (!(eventStart && eventEnd && rangeStart && rangeEnd)) {
		return null
	}
	const parsedUntil = rrule.until ? parseDate(rrule.until, zone) : undefined
	return {
		rrule,
		zone,
		eventStart,
		eventEnd,
		rangeStart,
		rangeEnd,
		floatingUntil: parsedUntil ? toFloatingDate(parsedUntil) : undefined,
	}
}

const expandRecurringSeries = (
	props: GenerateRecurringEventsProps
): CalendarEvent[] => {
	const ctx = resolveSeriesContext(props)
	if (!ctx) {
		return []
	}
	const { event, currentEvents } = props
	const {
		rrule,
		zone,
		eventStart,
		eventEnd,
		rangeStart,
		rangeEnd,
		floatingUntil,
	} = ctx

	const memo = readSeriesMemo({
		event,
		rrule,
		ruleOptions: {
			...rrule,
			dtstart: toFloatingDate(eventStart),
			until: floatingUntil,
		},
		zone,
		floatingUntil,
	})

	const parentUid = getEventParentUID(event)
	const overrides = getOverridesBySeries(currentEvents).get(parentUid) ?? []
	const skippedInstants = collectEpochInstants(
		[
			...overrides.map((override) => override.recurrenceId),
			...(event.exdates ?? []),
		],
		zone
	)

	const eventDurationMs = elapsedDiff(eventEnd, eventStart, 'millisecond')
	const occurrences = getOccurrencesBetween(
		memo,
		toFloatingDate(subtract(rangeStart, eventDurationMs, 'millisecond')),
		toFloatingDate(rangeEnd)
	)

	return buildOccurrenceInstances({
		event,
		parentUid,
		memo,
		occurrences,
		skippedInstants,
		eventDurationMs,
		rangeStart,
		rangeEnd,
		zone,
	})
}

export const generateRecurringEvents = (
	props: GenerateRecurringEventsProps
): CalendarEvent[] => {
	if (!props.event.rrule) {
		return []
	}
	try {
		return expandRecurringSeries(props)
	} catch (error) {
		throw new Error(
			`Invalid RRULE options: ${JSON.stringify(props.event.rrule)}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}
