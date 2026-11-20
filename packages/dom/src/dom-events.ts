import {
	add,
	type BusinessHours,
	type CalendarEvent,
	type CellInfo,
	type EventDropInfo,
	isRangeWithinBusinessHours,
	normalizeEvent,
	now,
	overlapsRange,
	parseDate,
	type Resource,
	resolveDurationEditable,
	resolveStartEditable,
	toOffsetIso,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/core'
import {
	formatICalAllDayDate,
	formatICalLocalDateTime,
	formatICalUtcDateTime,
	resolveICalTzid,
} from '@ilamy/utils/ical-format'
import { RRule } from 'rrule'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomMutationScope,
	DomRRuleInput,
	DomRRuleOptions,
} from './dom-types'

const RECURRING_INSTANCE_RE = /^(.+)_(\d+)$/

export const isRecurringEvent = (event: DomCalendarEvent): boolean =>
	Boolean(event.rrule) ||
	Boolean(event.recurrenceId) ||
	RECURRING_INSTANCE_RE.test(String(event.id))

const getSeriesBaseId = (event: DomCalendarEvent): string => {
	if (event.rrule) return String(event.id)
	const match = RECURRING_INSTANCE_RE.exec(String(event.id))
	return match?.[1] ?? String(event.uid ?? event.id)
}

const findSeriesBase = (
	events: DomCalendarEvent[],
	target: DomCalendarEvent
): DomCalendarEvent | undefined => {
	const baseId = getSeriesBaseId(target)
	return events.find(
		(item) =>
			String(item.id) === baseId ||
			(Boolean(item.rrule) && item.uid === target.uid)
	)
}

const toFloatingUtcDate = (zoned: ZonedDate): Date =>
	new Date(
		Date.UTC(
			zoned.year,
			zoned.month - 1,
			zoned.day,
			zoned.hour,
			zoned.minute,
			zoned.second
		)
	)

const fromFloatingUtcDate = (
	utcDate: Date,
	timezone: string
): ZonedDate | undefined => {
	const pad2 = (n: number) => String(n).padStart(2, '0')
	const iso = `${utcDate.getUTCFullYear()}-${pad2(utcDate.getUTCMonth() + 1)}-${pad2(utcDate.getUTCDate())}T${pad2(utcDate.getUTCHours())}:${pad2(utcDate.getUTCMinutes())}:${pad2(utcDate.getUTCSeconds())}`
	return parseDate(iso, timezone)
}

export const normalizeDomRRule = (
	rule: DomRRuleInput | undefined,
	startIso: string,
	timezone: string
): DomRRuleOptions | undefined => {
	if (!rule) return undefined
	if (rule.dtstart instanceof Date) {
		return { ...rule, dtstart: rule.dtstart }
	}
	const parsed = parseDate(startIso, timezone)
	return { ...rule, dtstart: parsed ? toFloatingUtcDate(parsed) : new Date() }
}

const collectOverrideKeys = (events: DomCalendarEvent[]): Set<string> => {
	const keys = new Set<string>()
	for (const event of events) {
		if (event.recurrenceId && event.uid) {
			keys.add(`${event.uid}::${event.recurrenceId}`)
		}
	}
	return keys
}

const buildOccurrenceInstance = (
	event: DomCalendarEvent,
	occ: Date,
	index: number,
	durationMinutes: number,
	rangeStart: ZonedDate,
	rangeEnd: ZonedDate,
	timezone: string,
	uid: string,
	exdateSet: Set<string>,
	overridesByUid: Set<string>
): DomCalendarEvent | null => {
	const occStart = fromFloatingUtcDate(occ, timezone)
	if (!occStart) return null
	const occStartIso = toOffsetIso(occStart)
	if (
		exdateSet.has(occStartIso) ||
		overridesByUid.has(`${uid}::${occStartIso}`)
	) {
		return null
	}
	const occEnd = add(occStart, durationMinutes, 'minute')
	if (!overlapsRange({ start: occStart, end: occEnd }, rangeStart, rangeEnd)) {
		return null
	}
	return {
		...event,
		id: `${event.id}_${index}`,
		uid,
		rrule: undefined,
		start: occStartIso,
		end: toOffsetIso(occEnd),
	}
}

const expandSingleRecurring = (
	event: DomCalendarEvent,
	rangeStart: ZonedDate,
	rangeEnd: ZonedDate,
	timezone: string,
	overridesByUid: Set<string>
): DomCalendarEvent[] => {
	const baseStart = parseDate(event.start, timezone)
	const baseEnd = parseDate(event.end, timezone)
	if (!event.rrule || !baseStart || !baseEnd) return []

	const durationMinutes = Math.max(
		1,
		Math.round(wallClockDiff(baseEnd, baseStart, 'minute'))
	)
	const rule = new RRule({
		...event.rrule,
		dtstart: toFloatingUtcDate(baseStart),
	})
	const searchStart = add(rangeStart, -durationMinutes, 'minute')
	const occurrences = rule.between(
		toFloatingUtcDate(searchStart),
		toFloatingUtcDate(rangeEnd),
		true
	)
	const exdateSet = new Set(event.exdates ?? [])
	const uid = event.uid ?? String(event.id)
	const expanded: DomCalendarEvent[] = []

	for (let index = 0; index < occurrences.length; index += 1) {
		const occ = occurrences.at(index)
		if (!occ) continue
		const instance = buildOccurrenceInstance(
			event,
			occ,
			index,
			durationMinutes,
			rangeStart,
			rangeEnd,
			timezone,
			uid,
			exdateSet,
			overridesByUid
		)
		if (instance) expanded.push(instance)
	}
	return expanded
}

export const expandRecurringEvents = (
	events: DomCalendarEvent[],
	rangeStartIso: string,
	rangeEndIso: string,
	timezone: string
): DomCalendarEvent[] => {
	const rangeStart = parseDate(rangeStartIso, timezone)
	const rangeEnd = parseDate(rangeEndIso, timezone)
	if (!rangeStart || !rangeEnd) return events

	const overridesByUid = collectOverrideKeys(events)
	const result: DomCalendarEvent[] = []

	for (const event of events) {
		if (event.rrule) {
			result.push(
				...expandSingleRecurring(
					event,
					rangeStart,
					rangeEnd,
					timezone,
					overridesByUid
				)
			)
			continue
		}
		const start = parseDate(event.start, timezone)
		const end = parseDate(event.end, timezone)
		if (start && end && overlapsRange({ start, end }, rangeStart, rangeEnd)) {
			result.push(event)
		}
	}
	return result
}

const buildNormalizedPrimary = (
	target: DomCalendarEvent,
	updates: Partial<DomCalendarEventInput>,
	timezone: string
): DomCalendarEvent => {
	const { rrule: updatedRrule, ...restUpdates } = updates
	const normalizedBase = normalizeEvent(
		{
			...target,
			...restUpdates,
			start: updates.start ?? target.start,
			end: updates.end ?? target.end,
		},
		timezone
	)
	return {
		...normalizedBase,
		rrule:
			'rrule' in updates
				? normalizeDomRRule(updatedRrule, normalizedBase.start, timezone)
				: target.rrule,
		exdates: 'exdates' in updates ? updates.exdates : target.exdates,
		recurrenceId:
			'recurrenceId' in updates ? updates.recurrenceId : target.recurrenceId,
	}
}

const trimRuleUntilBefore = (
	baseEvent: DomCalendarEvent,
	cutoffIso: string,
	timezone: string
): DomCalendarEvent => {
	const cutoff = parseDate(cutoffIso, timezone)
	const untilDate = cutoff
		? toFloatingUtcDate(add(cutoff, -1, 'second'))
		: undefined
	return {
		...baseEvent,
		rrule: baseEvent.rrule
			? { ...baseEvent.rrule, until: untilDate, count: undefined }
			: undefined,
	}
}

const updateSingleOccurrence = (
	currentEvents: DomCalendarEvent[],
	baseEvent: DomCalendarEvent,
	target: DomCalendarEvent,
	mergedPrimary: DomCalendarEvent
) => {
	const updatedBase: DomCalendarEvent = {
		...baseEvent,
		exdates: [...(baseEvent.exdates ?? []), target.start],
	}
	const overrideEvent: DomCalendarEvent = {
		...mergedPrimary,
		id: `${baseEvent.id}_override_${Date.now()}`,
		uid: baseEvent.uid ?? String(baseEvent.id),
		recurrenceId: target.start,
		rrule: undefined,
	}
	const events = currentEvents
		.map((item) => (item.id === baseEvent.id ? updatedBase : item))
		.concat(overrideEvent)
	return {
		events,
		updated: [updatedBase],
		added: [overrideEvent],
		primary: overrideEvent,
	}
}

export const applyScopedEventUpdate = (
	currentEvents: DomCalendarEvent[],
	target: DomCalendarEvent,
	updates: Partial<DomCalendarEventInput>,
	scope: DomMutationScope,
	timezone: string
): {
	events: DomCalendarEvent[]
	updated: DomCalendarEvent[]
	added: DomCalendarEvent[]
	primary: DomCalendarEvent
} => {
	const mergedPrimary = buildNormalizedPrimary(target, updates, timezone)
	const baseEvent = findSeriesBase(currentEvents, target)

	if (!baseEvent || !isRecurringEvent(target)) {
		const events = currentEvents.map((item) =>
			item.id === target.id ? mergedPrimary : item
		)
		return {
			events,
			updated: [mergedPrimary],
			added: [],
			primary: mergedPrimary,
		}
	}

	if (scope === 'this') {
		return updateSingleOccurrence(
			currentEvents,
			baseEvent,
			target,
			mergedPrimary
		)
	}

	if (scope === 'following') {
		const trimmedBase = trimRuleUntilBefore(baseEvent, target.start, timezone)
		const newSeries: DomCalendarEvent = {
			...mergedPrimary,
			id: `${baseEvent.id}_split_${Date.now()}`,
			uid: `${baseEvent.uid ?? baseEvent.id}_split_${Date.now()}`,
			rrule:
				normalizeDomRRule(updates.rrule, mergedPrimary.start, timezone) ??
				baseEvent.rrule,
			recurrenceId: undefined,
			exdates: undefined,
		}
		const events = currentEvents
			.map((item) => (item.id === baseEvent.id ? trimmedBase : item))
			.concat(newSeries)
		return {
			events,
			updated: [trimmedBase],
			added: [newSeries],
			primary: newSeries,
		}
	}

	const updatedSeries: DomCalendarEvent = {
		...baseEvent,
		...updates,
		id: baseEvent.id,
		start: baseEvent.start,
		end: baseEvent.end,
		rrule:
			normalizeDomRRule(updates.rrule, baseEvent.start, timezone) ??
			baseEvent.rrule,
	}
	const events = currentEvents.map((item) =>
		item.id === baseEvent.id ? updatedSeries : item
	)
	return { events, updated: [updatedSeries], added: [], primary: updatedSeries }
}

export const applyScopedEventDelete = (
	currentEvents: DomCalendarEvent[],
	target: DomCalendarEvent,
	scope: DomMutationScope,
	timezone: string
): {
	events: DomCalendarEvent[]
	updated: DomCalendarEvent[]
	deleted: DomCalendarEvent[]
} => {
	const baseEvent = findSeriesBase(currentEvents, target)
	if (!baseEvent || !isRecurringEvent(target)) {
		return {
			events: currentEvents.filter((item) => item.id !== target.id),
			updated: [],
			deleted: [target],
		}
	}

	if (scope === 'this') {
		const updatedBase: DomCalendarEvent = {
			...baseEvent,
			exdates: [...(baseEvent.exdates ?? []), target.start],
		}
		return {
			events: currentEvents.map((item) =>
				item.id === baseEvent.id ? updatedBase : item
			),
			updated: [updatedBase],
			deleted: [target],
		}
	}

	if (scope === 'following') {
		const updatedBase = trimRuleUntilBefore(baseEvent, target.start, timezone)
		return {
			events: currentEvents.map((item) =>
				item.id === baseEvent.id ? updatedBase : item
			),
			updated: [updatedBase],
			deleted: [target],
		}
	}

	const uid = baseEvent.uid ?? String(baseEvent.id)
	const deleted = currentEvents.filter(
		(item) => item.id === baseEvent.id || item.uid === uid
	)
	const events = currentEvents.filter(
		(item) => item.id !== baseEvent.id && item.uid !== uid
	)
	return { events, updated: [], deleted }
}

export const resolveEffectiveBusinessHours = (
	options: DomCalendarOptions,
	resource?: Resource
): BusinessHours | BusinessHours[] | undefined =>
	resource?.businessHours ?? options.businessHours

const isRangeAllowedByBusinessHours = (
	start: ZonedDate,
	end: ZonedDate,
	allDay: boolean,
	businessHours: BusinessHours | BusinessHours[] | undefined
): boolean => isRangeWithinBusinessHours({ start, end, allDay, businessHours })

export const canCommitEventPlacement = (
	event: CalendarEvent,
	dropInfo: EventDropInfo,
	options: DomCalendarOptions,
	timezone: string,
	resource?: Resource
): boolean => {
	const start = parseDate(dropInfo.start, timezone)
	const end = parseDate(dropInfo.end, timezone)
	if (!start || !end) return false

	if (
		options.isCellDisabled?.({
			start: dropInfo.start,
			end: dropInfo.end,
			resource,
			allDay: dropInfo.allDay,
		})
	) {
		return false
	}

	if (options.eventConstraint === 'businessHours') {
		const hours = resolveEffectiveBusinessHours(options, resource)
		if (!isRangeAllowedByBusinessHours(start, end, dropInfo.allDay, hours)) {
			return false
		}
	}

	return !options.eventAllow || options.eventAllow(dropInfo, event)
}

export const canCommitSelection = (
	cell: CellInfo,
	options: DomCalendarOptions,
	timezone: string
): boolean => {
	if (options.disableCellClick) return false
	if (options.isCellDisabled?.(cell)) return false
	if (options.selectConstraint !== 'businessHours') return true
	const start = parseDate(cell.start, timezone)
	const end = parseDate(cell.end, timezone)
	if (!start || !end) return false
	const hours = resolveEffectiveBusinessHours(options, cell.resource)
	return isRangeAllowedByBusinessHours(start, end, Boolean(cell.allDay), hours)
}

export const canDragEvent = (
	event: CalendarEvent,
	options: DomCalendarOptions
): boolean =>
	resolveStartEditable(event, {
		editable: options.editable,
		eventStartEditable: options.eventStartEditable,
		eventDurationEditable: options.eventDurationEditable,
	})

export const canResizeEvent = (
	event: CalendarEvent,
	options: DomCalendarOptions
): boolean =>
	resolveDurationEditable(event, {
		editable: options.editable,
		eventStartEditable: options.eventStartEditable,
		eventDurationEditable: options.eventDurationEditable,
	})

const escapeICalText = (value: string): string =>
	value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n')

const formatVEventDateLines = (
	event: DomCalendarEvent,
	start: ZonedDate,
	end: ZonedDate,
	eventZone: string
): string[] => {
	if (event.allDay) {
		return [
			`DTSTART;VALUE=DATE:${formatICalAllDayDate(event.start, eventZone)}`,
			`DTEND;VALUE=DATE:${formatICalAllDayDate(event.end, eventZone)}`,
		]
	}
	const tzid = resolveICalTzid(eventZone)
	if (tzid) {
		return [
			`DTSTART;TZID=${tzid}:${formatICalLocalDateTime(start)}`,
			`DTEND;TZID=${tzid}:${formatICalLocalDateTime(end)}`,
		]
	}
	return [
		`DTSTART:${formatICalUtcDateTime(start)}`,
		`DTEND:${formatICalUtcDateTime(end)}`,
	]
}

const buildVEventLines = (
	event: DomCalendarEvent,
	timezone: string,
	dtstamp: string
): string[] => {
	const eventZone = event.timezone ?? timezone
	const start = parseDate(event.start, eventZone)
	const end = parseDate(event.end, eventZone)
	if (!start || !end) return []

	const lines = [
		'BEGIN:VEVENT',
		`UID:${event.uid ?? String(event.id)}@ilamy.dev`,
		`DTSTAMP:${dtstamp}`,
		...formatVEventDateLines(event, start, end, eventZone),
		`SUMMARY:${escapeICalText(event.title)}`,
	]
	if (event.description) {
		lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
	}
	if (event.location) {
		lines.push(`LOCATION:${escapeICalText(event.location)}`)
	}
	if (event.rrule) {
		const ruleStr = new RRule({
			...event.rrule,
			dtstart: toFloatingUtcDate(start),
		})
			.toString()
			.split('\n')
			.find((line) => line.startsWith('RRULE:'))
		if (ruleStr) lines.push(ruleStr)
	}
	lines.push('END:VEVENT')
	return lines
}

export const generateDomIcal = (
	events: DomCalendarEvent[],
	timezone: string
): string => {
	const dtstamp = formatICalUtcDateTime(now('UTC'))
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//ilamy//Calendar 4.0//EN',
		'CALSCALE:GREGORIAN',
	]
	for (const event of events) {
		lines.push(...buildVEventLines(event, timezone, dtstamp))
	}
	lines.push('END:VCALENDAR')
	return lines.join('\r\n')
}
