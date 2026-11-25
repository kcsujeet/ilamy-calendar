/** @jsxImportSource preact */
import type { CalendarEvent, PluginEventFormContext } from '@ilamy/calendar'
import { useLayoutEffect, useState } from 'preact/hooks'
import { parseDate, resolveZone, toDate } from '../../../../utils/temporal'
import type { RRuleOptions } from '../types'
import { RecurrenceEditor } from './recurrence-editor/recurrence-editor'

interface Props {
	context: PluginEventFormContext
}

export const RecurrenceFormSection = ({ context }: Props) => {
	const {
		event,
		onChange,
		rawEvents = [],
		timezone,
		locale,
		firstDayOfWeek = 0,
		t,
	} = context
	const zone = event.timezone ?? resolveZone(timezone)
	const parsedStart = event.start ? parseDate(event.start, zone) : undefined
	const startAsDate = parsedStart ? toDate(parsedStart) : undefined

	const targetUid = event.uid
	let parent: CalendarEvent | undefined
	if (targetUid) {
		parent = rawEvents.find((candidate) => {
			const candidateUid = candidate.uid || `${candidate.id}@ilamy.calendar`
			const isSameSeries = candidateUid === targetUid
			return isSameSeries && Boolean(candidate.rrule)
		})
	}
	const resolvedInitialRule = event.rrule ?? parent?.rrule ?? null
	const [rrule, setRrule] = useState<RRuleOptions | null>(resolvedInitialRule)

	useLayoutEffect(() => {
		setRrule(event.rrule ?? parent?.rrule ?? null)
	}, [event.rrule, parent?.rrule])

	const handleChange = (next: RRuleOptions | null) => {
		if (!next) {
			setRrule(null)
			onChange({ rrule: undefined })
			return
		}
		const dtstart = next.dtstart ?? startAsDate
		const resolved = dtstart ? { ...next, dtstart } : next
		setRrule(resolved)
		onChange({ rrule: resolved })
	}

	return (
		<RecurrenceEditor
			firstDayOfWeek={firstDayOfWeek}
			locale={locale}
			onChange={handleChange}
			referenceDate={startAsDate}
			t={t}
			timezone={zone}
			value={rrule}
		/>
	)
}
